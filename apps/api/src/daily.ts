import {
  type Language,
  LANGUAGES,
  type Length,
  LENGTHS,
  TRACKS,
  type WordlexDay,
  wordlexDay,
} from "@wordlex/domain";
import { type } from "arktype";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { accountFromRequest } from "./account";
import { type Board, readBoard, todaysDaily } from "./board";
import { daily, db, game, gameStatus, guess, type Transaction } from "./db";
import { type ApiResponse, fail, varyOnCookie } from "./http";
import { playerFor } from "./player";
import { gameForRequest, gameIdsFromCookieHeader } from "./session";

// Path params arrive as strings, so `length` is parsed before it is checked
// against the three the game has.
const Params = type({
  language: type.enumerated(...LANGUAGES),
  length: type("string.integer.parse").to(type.enumerated(...LENGTHS)),
});

/**
 * Everything the single-Track route can send, so a response that drifts out of
 * the envelope (ADR 0023) is a type error rather than something a test notices.
 */
type Sent = { code: number; body: ApiResponse<{ game: Board }> };

/**
 * Where a Player stands on every Track today, which is what a home screen of
 * twelve tiles needs and what twelve separate board reads were being used for.
 *
 * Deliberately not twelve boards: the tiles show whether there is something to
 * carry on with, not the Guesses. `available` is false for a Track with no
 * Answer Pool — the single-Track route answers that with a 503, which a
 * collection cannot do for one of its twelve.
 *
 * A Track with no Game reads as `playing` with no Guesses, the same honest
 * "press Play and type" state `readBoard` gives it.
 */
type Today = {
  day: WordlexDay;
  tracks: {
    language: Language;
    length: Length;
    available: boolean;
    status: (typeof gameStatus.enumValues)[number];
    guesses: number;
  }[];
};

/** How many Guesses a Game has spent, as a column rather than a second query. */
const guessCount = sql<number>`(
  select count(*) from ${guess} where ${guess.gameId} = ${game.id}
)`.mapWith(Number);

/**
 * Every Game this request has today, in one query rather than one per Track.
 * The two halves mirror `gameForRequest`: a Player's Games are theirs by id, and
 * an anonymous Player's are the ones their tokens name — and only while those
 * Games still belong to nobody, or signing out would leave twelve tiles showing
 * somebody else's progress (ADR 0022).
 */
async function todaysGames(tx: Transaction, request: FastifyRequest, playerId: string | undefined) {
  const held = playerId === undefined ? gameIdsFromCookieHeader(request.headers.cookie) : [];
  if (playerId === undefined && held.length === 0) return [];

  return tx
    .select({
      language: daily.language,
      length: daily.length,
      status: game.status,
      guesses: guessCount,
    })
    .from(game)
    .innerJoin(daily, eq(daily.id, game.dailyId))
    .where(
      and(
        sql`${daily.day} = wordlex_day()`,
        playerId === undefined
          ? and(inArray(game.id, held), isNull(game.playerId))
          : eq(game.playerId, playerId),
      ),
    );
}

export function registerDaily(app: FastifyInstance) {
  /**
   * Today across all twelve Tracks. Reads only, and creates no Game — but it
   * does issue every Daily first, which ADR 0019 asks of every read path.
   *
   * The twelve issues go out as one statement rather than a loop of twelve
   * round trips. `TRACKS` is a constant, so the values list is fixed at compile
   * time and carries no user input.
   */
  app.get("/daily", async (request, reply) => {
    const account = await accountFromRequest(request);
    varyOnCookie(reply);

    const body = await db.transaction(async (tx): Promise<ApiResponse<Today>> => {
      const tracks = sql.join(
        TRACKS.map((track) => sql`(${track.language}, ${track.length})`),
        sql`, `,
      );
      await tx.execute(
        sql`select wordlex_issue_daily(t.language::text, t.length::int, wordlex_day())
            from (values ${tracks}) as t(language, length)`,
      );

      const issued = await tx
        .select({ day: daily.day, language: daily.language, length: daily.length })
        .from(daily)
        .where(sql`${daily.day} = wordlex_day()`);
      const available = new Set(issued.map((it) => `${it.language}-${it.length}`));

      // The day comes from the rows just issued rather than from this process,
      // so it cannot disagree with them about the 00:00 WIB boundary. The
      // fallback is only reachable if no Track has an Answer Pool at all.
      const day = issued[0]?.day ?? wordlexDay();

      const playerId = account ? await playerFor(tx, account.id) : undefined;
      const played = await todaysGames(tx, request, playerId);
      const standing = new Map(played.map((it) => [`${it.language}-${it.length}`, it]));

      return {
        data: {
          day,
          tracks: TRACKS.map((track) => {
            const key = `${track.language}-${track.length}`;
            const mine = standing.get(key);
            return {
              language: track.language,
              length: track.length,
              available: available.has(key),
              status: mine?.status ?? "playing",
              guesses: mine?.guesses ?? 0,
            };
          }),
        },
      };
    });

    return reply.code(200).send(body);
  });

  /**
   * Today's board for one Track. Reads only, and creates nothing: a visitor
   * with no Game gets an empty board, and only `POST /game` ever starts one
   * (ADR 0022). That is also why this sets no cookie.
   */
  app.get("/daily/:language/:length", async (request, reply) => {
    const params = Params(request.params);
    if (params instanceof type.errors) {
      return reply.code(400).send(fail("VALIDATION_ERROR", params.summary));
    }

    const { language, length } = params;
    const account = await accountFromRequest(request);

    // `Cache-Control: private, no-store` is set for every route in app.ts. Vary
    // is per-route, because this body changes with the Game token.
    varyOnCookie(reply);

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

      // No Game, or one belonging to somebody else, reads as "you have not
      // started this Track today" — an empty board, and nothing is created to
      // say so.
      const playerId = account ? await playerFor(tx, account.id) : undefined;
      const held = await gameForRequest(tx, request, today, playerId);

      return { code: 200, body: { data: { game: await readBoard(tx, today, held) } } };
    });

    return reply.code(result.code).send(result.body);
  });
}
