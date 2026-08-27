import { buildApp } from "./app";
import { env } from "./env";

const app = await buildApp();

// Worth a line: a Secure cookie over plain http is dropped by Safari and kept
// by Chrome, so getting this wrong locally looks like a 401 with no cause.
app.log.info({ secureCookies: env.secureCookies }, "Game token cookie");

await app.listen({ port: env.port, host: "0.0.0.0" });
