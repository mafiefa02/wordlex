import Fastify from "fastify";
import { configureApp } from "./build-app.js";
import { env } from "./env.js";
import { LOG_LEVEL, logFatalExits, logger } from "./logger.js";

// Before the app exists, so a failure while it is being built is logged too.
logFatalExits();

const app = configureApp(Fastify({ logger: { level: LOG_LEVEL } }));

// Worth a line: a Secure cookie over plain http is dropped by Safari and kept
// by Chrome, so getting this wrong locally looks like a 401 with no cause.
app.log.info({ secureCookies: env.secureCookies }, "Game token cookie");

// Not awaited at the top level. Vercel captures the deployed server by watching
// the `listen` call during module startup, so nothing may suspend before it.
app.listen({ port: env.port, host: "0.0.0.0" }).catch((error) => {
  logger.fatal({ err: error }, "could not listen");
  process.exit(1);
});
