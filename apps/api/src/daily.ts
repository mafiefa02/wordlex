import { LANGUAGES, LENGTHS } from "@wordlex/domain";
import { type } from "arktype";
import type { FastifyInstance } from "fastify";
import { readBoard, todaysDaily } from "./board";
import { db } from "./db";
import { gameFromToken } from "./session";

// Path params arrive as strings, so `length` is parsed before it is checked
// against the three the game has.
const Params = type({
  language: type.enumerated(...LANGUAGES),
  length: type("string.integer.parse").to(type.enumerated(...LENGTHS)),
});

export function registerDaily(app: FastifyInstance) {
  /**
   * Today's board for one Track. Reads only, and creates nothing: a visitor
   * with no Game token gets an empty board, and only `POST /game` ever starts
   * one (ADR 0022). That is also why this sets no cookie.
   */
  app.get("/daily/:language/:length", async (request, reply) => {
    const params = Params(request.params);
    if (params instanceof type.errors) {
      return reply.code(400).send({ error: params.summary });
    }

    const { language, length } = params;

    // `Cache-Control: private, no-store` is set for every route in server.ts.
    // Vary is this route's own business, because it is the only cacheable shape
    // here: a GET whose body changes with the Game token. Appended, not set —
    // `reply.header` replaces, and @fastify/cors has already put `Vary: Origin`
    // here from an onRequest hook.
    const vary = reply.getHeader("Vary");
    reply.header("Vary", vary === undefined ? "Cookie" : `${String(vary)}, Cookie`);

    const result = await db.transaction(async (tx) => {
      const today = await todaysDaily(tx, language, length);
      if (!today) {
        return {
          code: 503,
          body: { error: `no Daily for ${language}-${length}: that Track has no Answer Pool` },
        };
      }

      // No token, or one for another Game, reads as "you have not started this
      // Track today" — an empty board, and nothing is created to say so.
      const held = await gameFromToken(tx, request, today);

      return { code: 200, body: { game: await readBoard(tx, today, held) } };
    });

    return reply.code(result.code).send(result.body);
  });
}
