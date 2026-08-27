import pino from "pino";

/**
 * One logger for the whole app, rather than the one Fastify would build for
 * itself. The reason is `src/auth.ts`: better-auth's sign-in hook runs outside
 * any route, so it has no `request.log`, and without this its two failure paths
 * are the only things in the app writing unstructured lines to stdout — which is
 * exactly where a Player's Games silently failing to carry over would hide.
 *
 * `LOG_LEVEL` exists so a deploy can turn the volume up without a code change.
 * Tests pass `logger: false` to `buildApp` and never reach this.
 */
export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

/**
 * Logs and re-raises what would otherwise be a silent exit. Node kills the
 * process on an unhandled rejection, and a Fastify app that dies between
 * requests leaves nothing behind to say why — the platform just restarts it.
 *
 * The process still ends. This buys the line explaining it, not a recovery:
 * carrying on after an unknown failure is how a half-broken server stays up.
 */
export function logFatalExits() {
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled rejection");
    process.exit(1);
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });
}
