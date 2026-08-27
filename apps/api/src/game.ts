import { LANGUAGES, LENGTHS } from "@wordlex/domain";
import { type } from "arktype";
import { and, count, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { accountFromRequest } from "./account";
import { type Board, type Daily, readBoard, todaysDaily } from "./board";
import { db, game, guess } from "./db";
import { type ApiResponse, fail, idempotencyKey } from "./http";
import { playerFor } from "./player";
import { gameForRequest, setGameToken } from "./session";

const Body = type({
  language: type.enumerated(...LANGUAGES),
  length: type.enumerated(...LENGTHS),
});

/** Everything this route can send. See `Sent` in `daily.ts` (ADR 0023). */
type Sent = { code: number; body: ApiResponse<{ game: Board }> };

export function registerGame(app: FastifyInstance) {
  /**
   * Starts playing a Track: creates an anonymous Game and hands back the token
   * for it (ADR 0022). This is what pressing Play calls, and it is the only
   * thing that creates a Game — a Guess never does.
   *
   * Resumes the Game a valid token already names, so pressing Play again once
   * the first response has landed is the same Game.
   *
   * Two presses at the same time, or a retry after a response was lost, collapse
   * into one Game as long as they carry the same `Idempotency-Key` (ADR 0024).
   * That key is the only thing that can join them: neither request has the
   * cookie the other is about to set, and `game_player_daily_key` does not
   * constrain a null `player_id`, so there is no row to lock on and no identity
   * to serialize by. A client that generates a fresh key per click is back to
   * two Games — the server still cannot tell a double-click from two people,
   * it can only be told.
   *
   * A browser that *discarded* its token can still start again, which is why
   * replaying a Daily anonymously is free (ADR 0022). A signed-in Player cannot:
   * their Game is found by who they are, so a lost token resumes the same Game
   * on any device rather than starting a second one (ADR 0025).
   */
  app.post("/game", async (request, reply) => {
    const body = Body(request.body);
    if (body instanceof type.errors) {
      return reply.code(400).send(fail("VALIDATION_ERROR", body.summary));
    }

    const key = idempotencyKey(request);
    if (!key) {
      return reply
        .code(400)
        .send(
          fail(
            "IDEMPOTENCY_KEY_REQUIRED",
            "this write needs an Idempotency-Key header holding a uuid",
          ),
        );
    }

    const { language, length } = body;
    const account = await accountFromRequest(request);

    let issued: { today: Daily; gameId: string } | undefined;
    const result = await db.transaction(async (tx): Promise<Sent> => {
      const today = await todaysDaily(tx, language, length);
      if (!today) {
        return {
          code: 503,
          body: fail(
            "TRACK_UNAVAILABLE",
            `no Daily for ${language}-${length}: that Track has no Answer Pool`,
          ),
        };
      }

      // Who the request is decides what a resume even means — see
      // `gameForRequest`. Nobody signed in means a token naming a Player's Game
      // is refused, and this starts a fresh anonymous one instead.
      const playerId = account ? await playerFor(tx, account.id) : undefined;

      const resumed = await gameForRequest(tx, request, today, playerId);

      if (resumed) {
        // Only the signed-in half needs a token here: it was found by who they
        // are, so this may be a device that holds none. An anonymous resume was
        // found *by* the token it already sent, and re-setting it would write
        // back the same value with the same expiry.
        if (playerId) issued = { today, gameId: resumed.id };
        return { code: 200, body: { data: { game: await readBoard(tx, today, resumed) } } };
      }

      // The insert is the claim, not a check before it: there is nothing to lock
      // on here, so `game_daily_idempotency_key` is the only thing that can pick
      // a winner between two starts arriving together (ADR 0024). Reading first
      // and inserting after would let both read "no Game" and both insert.
      //
      // `playerId` is null for an anonymous Game, and that null is what every
      // review query filters on (ADRs 0009 and 0012).
      //
      // The conflict is untargeted because a signed-in Player can hit either
      // unique: `game_daily_idempotency_key` from their own double press, and
      // `game_player_daily_key` from two presses under *different* keys. An
      // anonymous Player can only ever hit the first, since Postgres treats
      // their null `player_id` as distinct from every other.
      const [started] = await tx
        .insert(game)
        .values({ dailyId: today.id, idempotencyKey: key, playerId })
        .onConflictDoNothing()
        .returning({ id: game.id, status: game.status });

      // Nothing inserted means this key already named a Game — our own retry, or
      // the other half of a double press. Postgres made us wait for whoever got
      // there first to commit, so the row is readable now, and the token goes
      // out again because the response that carried it is the one that was lost.
      const claimed =
        started ??
        (
          await tx
            .select({ id: game.id, status: game.status })
            .from(game)
            .where(
              playerId
                ? and(eq(game.playerId, playerId), eq(game.dailyId, today.id))
                : and(eq(game.dailyId, today.id), eq(game.idempotencyKey, key)),
            )
            .limit(1)
        )[0];

      if (!claimed) {
        // Only reachable signed in, and only one way: the key already names
        // somebody else's Game on this Daily. Anonymously the same lookup is the
        // one the conflict was on, so nothing can conflict and then be missing.
        if (!playerId)
          throw new Error("an Idempotency-Key claimed no Game and conflicted with none");
        return {
          code: 422,
          body: fail("IDEMPOTENCY_KEY_REUSED", "this Idempotency-Key names another Player's Game"),
        };
      }

      // Second layer under the uuid requirement in `http.ts`, and worth the four
      // lines: handing back a Game means handing back its token, so a key that
      // leaks is a Game anyone can take over. Anonymous play only: a signed-in
      // Player's claim on their Game is the session, not the key, and resuming a
      // Game they have already played is the point rather than a warning sign. A genuine retry cannot have played
      // anything — it never received the token a Guess needs — so a Game with
      // Guesses in it is somebody's, and this is not the lost response it claims
      // to be. Refusing shrinks the window on a leaked or guessed key from the
      // rest of the day to the moment before its first Guess.
      if (started === undefined && !playerId) {
        const [played] = await tx
          .select({ made: count() })
          .from(guess)
          .where(eq(guess.gameId, claimed.id));
        if ((played?.made ?? 0) > 0) {
          return {
            code: 422,
            body: fail(
              "IDEMPOTENCY_KEY_REUSED",
              "this Idempotency-Key names a Game that is already being played",
            ),
          };
        }
      }

      issued = { today, gameId: claimed.id };
      return { code: 200, body: { data: { game: await readBoard(tx, today, claimed) } } };
    });

    // Only once the Game is durable, or a rollback leaves a token naming nothing.
    if (issued) setGameToken(reply, issued.today, issued.gameId);
    return reply.code(result.code).send(result.body);
  });
}
