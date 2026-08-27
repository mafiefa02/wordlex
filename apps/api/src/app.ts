import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { type WordlexDay, wordlexDay } from "@wordlex/domain";
import { fromNodeHeaders } from "better-auth/node";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import { auth } from "./auth.js";
import { registerDaily } from "./daily.js";
import { db } from "./db/index.js";
import { env } from "./env.js";
import { registerGame } from "./game.js";
import { registerGuess } from "./guess.js";
import { type ApiSuccess, fail } from "./http.js";
import { logger } from "./logger.js";
import { registerMe } from "./me.js";

/**
 * The whole API, minus listening. Split out so the tests can drive it through
 * `app.inject()` — importing `server.ts` would bind a port.
 */
export async function buildApp(options: FastifyServerOptions = {}) {
  // `loggerInstance`, not `logger` — Fastify takes a *configuration object*
  // under `logger` and an already-built pino under `loggerInstance`, and refuses
  // the two together. So the shared instance goes in only when the caller has
  // not asked for something else, which is how the tests stay silent.
  const app = Fastify(
    options.logger === undefined ? { loggerInstance: logger, ...options } : options,
  );

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
      return reply
        .code(403)
        .send(fail("ORIGIN_NOT_ALLOWED", "a write needs an allowlisted Origin header"));
    }
  });

  // A route nobody wrote, and a throw nobody caught, are responses too — and
  // without these two they would be Fastify's own `{ statusCode, error, message }`
  // instead of the envelope every handler here sends. That is the whole gap the
  // convention exists to close.
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(fail("NOT_FOUND", `no route for ${request.method} ${request.url}`)),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    // Fastify's own refusals land here too — a malformed JSON body, an
    // unsupported content type — and those carry a 4xx worth passing on as it is.
    // They all get one code rather than a guessed one: a code that named a status
    // would sooner or later contradict the status it was sent with. A 5xx is ours,
    // and its reason stays in the log rather than going to the browser.
    return status >= 400 && status < 500
      ? reply.code(status).send(fail("REQUEST_REJECTED", error.message))
      : reply.code(500).send(fail("INTERNAL_ERROR", "something went wrong"));
  });

  /**
   * Answers only while the database answers. A health check that says ok with
   * the database unreachable is worse than none at all — it is what an uptime
   * monitor believes, and every other route here needs that connection.
   */
  app.get("/health", async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
    } catch (error) {
      app.log.error({ err: error }, "health check could not reach the database");
      return reply.code(503).send(fail("DATABASE_UNAVAILABLE", "the database is not answering"));
    }
    const body: ApiSuccess<{ ok: true; day: WordlexDay }> = {
      data: { ok: true, day: wordlexDay() },
    };
    return reply.code(200).send(body);
  });

  /**
   * Signing in, signing out, and the Google redirect back (ADR 0025). This is
   * the one place that does **not** answer in ADR 0023's envelope: the shape is
   * better-auth's, because better-auth's own client is what parses it, and
   * rewriting the bodies of a library's endpoints breaks the library.
   *
   * The URL is rebuilt on `BETTER_AUTH_URL` rather than on the `Host` header, so
   * a spoofed Host cannot change which origin better-auth thinks it is serving
   * and therefore where it sends a Player back to.
   */
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const response = await auth.handler(
        new Request(new URL(request.url, env.authUrl), {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(request.body === undefined || request.body === null
            ? {}
            : { body: JSON.stringify(request.body) }),
        }),
      );

      reply.code(response.status);
      // Set-Cookie is the one header that legitimately repeats, and iterating
      // the Headers object folds those into a single comma-joined string that no
      // browser will parse back apart. A sign-in sets more than one.
      for (const [name, value] of response.headers) {
        if (name.toLowerCase() !== "set-cookie") reply.header(name, value);
      }
      for (const set of response.headers.getSetCookie()) reply.header("set-cookie", set);

      return reply.send(response.body === null ? null : await response.text());
    },
  });

  registerGame(app);
  registerDaily(app);
  registerGuess(app);
  registerMe(app);

  return app;
}
