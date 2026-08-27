import { LANGUAGES, LENGTHS } from "@wordlex/domain";
import { type } from "arktype";
import type { FastifyInstance } from "fastify";
import { type Daily, readBoard, todaysDaily } from "./board";
import { db, game } from "./db";
import { gameFromToken, setGameToken } from "./session";

const Body = type({
  language: type.enumerated(...LANGUAGES),
  length: type.enumerated(...LENGTHS),
});

export function registerGame(app: FastifyInstance) {
  /**
   * Starts playing a Track: creates an anonymous Game and hands back the token
   * for it (ADR 0022). This is what pressing Play calls, and it is the only
   * thing that creates a Game — a Guess never does.
   *
   * Resumes the Game a valid token already names, so pressing Play again once
   * the first response has landed is the same Game.
   *
   * Two presses *at the same time* are two Games: neither request has the
   * cookie the other is about to set, and with no Player there is nothing to
   * lock on — `game_player_daily_key` does not constrain a null `player_id`.
   * The loser is orphaned and swept to `abandoned` with no Guesses at all. The
   * client has to not fire concurrent starts; the server cannot tell a
   * double-click from two people. Same reason a browser that *discarded* its
   * token can start again, which is why replaying a Daily anonymously is free.
   */
  app.post("/game", async (request, reply) => {
    const body = Body(request.body);
    if (body instanceof type.errors) {
      return reply.code(400).send({ error: body.summary });
    }

    const { language, length } = body;

    let issued: { today: Daily; gameId: string } | undefined;
    const result = await db.transaction(async (tx) => {
      const today = await todaysDaily(tx, language, length);
      if (!today) {
        return {
          code: 503,
          body: { error: `no Daily for ${language}-${length}: that Track has no Answer Pool` },
        };
      }

      const resumed = await gameFromToken(tx, request, today);
      if (resumed) return { code: 200, body: { game: await readBoard(tx, today, resumed) } };

      // `playerId` stays null: this is an anonymous Game, and that null is what
      // every review query filters on (ADRs 0009 and 0012).
      const [started] = await tx
        .insert(game)
        .values({ dailyId: today.id })
        .returning({ id: game.id, status: game.status });
      if (!started) throw new Error("starting a Game returned no row");

      issued = { today, gameId: started.id };
      return { code: 200, body: { game: await readBoard(tx, today, started) } };
    });

    // Only once the Game is durable, or a rollback leaves a token naming nothing.
    if (issued) setGameToken(reply, issued.today, issued.gameId);
    return reply.code(result.code).send(result.body);
  });
}
