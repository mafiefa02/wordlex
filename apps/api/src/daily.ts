import { LANGUAGES, LENGTHS } from "@wordlex/domain";
import { type } from "arktype";
import type { FastifyInstance } from "fastify";
import { type Board, readBoard, todaysDaily } from "./board";
import { db } from "./db";
import { type ApiResponse, fail, varyOnCookie } from "./http";
import { gameFromToken } from "./session";

// Path params arrive as strings, so `length` is parsed before it is checked
// against the three the game has.
const Params = type({
  language: type.enumerated(...LANGUAGES),
  length: type("string.integer.parse").to(type.enumerated(...LENGTHS)),
});

/**
 * Everything this route can send, so a response that drifts out of the envelope
 * (ADR 0023) is a type error rather than something a test has to notice.
 */
type Sent = { code: number; body: ApiResponse<{ game: Board }> };

export function registerDaily(app: FastifyInstance) {
  /**
   * Today's board for one Track. Reads only, and creates nothing: a visitor
   * with no Game token gets an empty board, and only `POST /game` ever starts
   * one (ADR 0022). That is also why this sets no cookie.
   */
  app.get("/daily/:language/:length", async (request, reply) => {
    const params = Params(request.params);
    if (params instanceof type.errors) {
      return reply.code(400).send(fail("VALIDATION_ERROR", params.summary));
    }

    const { language, length } = params;

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

      // No token, or one for another Game, reads as "you have not started this
      // Track today" — an empty board, and nothing is created to say so.
      const held = await gameFromToken(tx, request, today);

      return { code: 200, body: { data: { game: await readBoard(tx, today, held) } } };
    });

    return reply.code(result.code).send(result.body);
  });
}
