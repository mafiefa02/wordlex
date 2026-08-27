import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { wordlexDay } from "@wordlex/domain";
import Fastify, { type FastifyServerOptions } from "fastify";
import { registerDaily } from "./daily";
import { env } from "./env";
import { registerGame } from "./game";
import { registerGuess } from "./guess";

/**
 * The whole API, minus listening. Split out so the tests can drive it through
 * `app.inject()` — importing `server.ts` would bind a port.
 */
export async function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({ logger: true, ...options });

  await app.register(cors, {
    origin: env.allowedOrigins,
    credentials: true,
  });

  await app.register(cookie, { secret: env.cookieSecret });

  // Nothing here is cacheable. Every response is either per-cookie or carries the
  // day's Answer once a Game is over, and that is as true of the POST bodies as it
  // is of the board read. Set once, so a route added later cannot forget it.
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "private, no-store");
  });

  // A cookie-carrying API has to check the Origin itself. CORS gates *reading* a
  // response, not sending the request, and a cross-site form POST is never
  // preflighted — `enctype="text/plain"` even reaches Fastify's built-in parser as
  // a top-level navigation, which third-party cookie blocking does not touch.
  // SameSite=Lax makes that worse rather than better for `POST /game`: the
  // victim's token is withheld on a cross-site POST, so the handler would see no
  // Game, start one, and overwrite the token that was already there — discarding
  // the Game they were playing (ADRs 0021, 0022).
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
      return;
    }
    const origin = request.headers.origin;
    if (origin === undefined || !env.allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: "origin not allowed" });
    }
  });

  app.get("/health", () => ({ ok: true, day: wordlexDay() }));

  registerGame(app);
  registerDaily(app);
  registerGuess(app);

  return app;
}
