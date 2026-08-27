import { guessBudget, LANGUAGES, LENGTHS, score } from "@wordlex/domain";
import { type } from "arktype";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { readBoard, todaysDaily } from "./board";
import { db, game, guess, unknownWordAttempt, word } from "./db";
import { gameFromToken } from "./session";

const Body = type({
  language: type.enumerated(...LANGUAGES),
  length: type.enumerated(...LENGTHS),
  // Bounded before `fold` touches it: normalising a megabyte of Unicode is work
  // this endpoint would do for free, and ADR 0010 puts nothing in front of it.
  // The longest Track is 7 Tiles, and NFD doubles an accented character at most.
  word: "string <= 32",
});

/**
 * Lowercases and strips diacritics, which is how `word.word` was folded when it
 * was derived. **This must agree with `fold` in `scripts/build-words.mjs`** —
 * the two are a deliberate second copy for the same reason `wordlex_day()` is
 * (ADR 0019), because that script is plain Node and imports nothing from here.
 * A fold that disagreed would miss Dictionary words it should match and log
 * them as Unknown Words instead.
 */
const fold = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function registerGuess(app: FastifyInstance) {
  /**
   * One submission against today's Daily for a Track. Decides both things ADR
   * 0003 puts on the server: whether the word is in the Dictionary at all, and
   * if so how it scores.
   */
  app.post("/guess", async (request, reply) => {
    const body = Body(request.body);
    if (body instanceof type.errors) {
      return reply.code(400).send({ error: body.summary });
    }

    const { language, length } = body;
    const typed = fold(body.word);

    // Wrong length or anything outside a-z stops here: it never reaches the
    // Dictionary check and is never recorded, which is what keeps the Unknown
    // Word log clean by construction (ADR 0009).
    if (typed.length !== length || !/^[a-z]+$/.test(typed)) {
      return reply.code(400).send({ error: `not ${length} characters of a-z` });
    }

    // One transaction, and the Game is locked inside it. Nothing upstream
    // throttles this endpoint (ADR 0010), so two submissions arriving together
    // would otherwise race for the same row position.
    const result = await db.transaction(async (tx) => {
      const today = await todaysDaily(tx, language, length);
      if (!today) {
        return {
          code: 503,
          body: { error: `no Daily for ${language}-${length}: that Track has no Answer Pool` },
        };
      }

      // A Guess never starts a Game. Without a token naming a Game against
      // today's Daily on this Track there is nothing to attach it to, and
      // starting one here would let a browser that discarded its token
      // silently restart the day (ADR 0022).
      const held = await gameFromToken(tx, request, today);
      if (!held) {
        return { code: 401, body: { error: "no Game token: press Play to start a Game" } };
      }

      // Re-read under a row lock. Nothing upstream throttles this (ADR 0010),
      // so two submissions arriving together would otherwise take the same row.
      const [current] = await tx
        .select({ id: game.id, status: game.status, playerId: game.playerId })
        .from(game)
        .where(eq(game.id, held.id))
        .limit(1)
        .for("update");
      if (!current) throw new Error("the Game named by a valid token has gone");

      const board = await readBoard(tx, today, current);

      if (current.status !== "playing") {
        return { code: 409, body: { error: "this Game is over", game: board } };
      }

      // The Dictionary, by primary key. Rejected rows stay in the table so a
      // word a speaker has ruled out reads as an Unknown Word again (ADR 0018).
      const [known] = await tx
        .select({ word: word.word })
        .from(word)
        .where(
          and(
            eq(word.language, language),
            eq(word.length, length),
            eq(word.word, typed),
            eq(word.status, "active"),
          ),
        )
        .limit(1);

      // The Answer is always a legal Guess. A reviewer can reject a word that is
      // already today's Daily, and the freeze trigger (ADR 0019) means the row
      // cannot be swapped before tomorrow — without this the Game is unwinnable
      // and the Answer itself piles up in `unknown_word_attempt`.
      if (!known && typed !== today.word) {
        // An Unknown Word is not an error and not a Guess: nothing is scored,
        // no row is spent, and it is recorded once per Player where we know the
        // Player and once per Game where we do not (ADRs 0009, 0022). It does
        // not collapse forty *different* words, deliberately: ADR 0009 weighed a
        // per-Game cap against the rows it would discard and chose the rows,
        // because a Sundanese speaker hitting rejection after rejection is the
        // signal this log exists to catch.
        await tx
          .insert(unknownWordAttempt)
          .values({
            language,
            length,
            word: typed,
            playerId: current.playerId,
            gameId: current.id,
          })
          .onConflictDoNothing();
        return { code: 200, body: { outcome: "unknown_word", word: typed, game: board } };
      }

      // Positions are 1-based, so the Guess at position `guessBudget(length)`
      // is the last one a Game grants.
      const position = board.guesses.length + 1;
      const marks = score(typed, today.word);
      await tx.insert(guess).values({ gameId: current.id, position, word: typed });

      const status = marks.every((mark) => mark === "exact")
        ? "won"
        : position === guessBudget(length)
          ? "lost"
          : "playing";
      if (status !== "playing") {
        await tx.update(game).set({ status }).where(eq(game.id, current.id));
      }

      // Read back rather than appending locally, so the response is what was
      // actually written and both routes build a board exactly one way.
      const after = await readBoard(tx, today, { id: current.id, status });
      return { code: 200, body: { outcome: "scored", game: after } };
    });

    return reply.code(result.code).send(result.body);
  });
}
