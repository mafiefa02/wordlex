// Runs before anything else in a test file, because `src/env.ts` validates and
// `src/db/index.ts` opens its connection the moment they are imported.
// Assignment is unconditional: an exported DATABASE_URL from the shell must not
// win, or the suite truncates the development database instead of the test one.
//
// This file imports nothing but constants on purpose — an import of anything
// under `src/` would be evaluated before the lines below ever run.
import { AUTH_SECRET, AUTH_URL, COOKIE_SECRET, ORIGIN, TEST_DATABASE_URL } from "./config";

process.env.NODE_ENV = "test";
// `buildApp()` with no options builds the real logger, which one test does on
// purpose — see "boots with its own logger". Silent so it says nothing here.
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;
process.env.ALLOWED_ORIGINS = ORIGIN;
process.env.COOKIE_SECRET = COOKIE_SECRET;
process.env.BETTER_AUTH_SECRET = AUTH_SECRET;
process.env.BETTER_AUTH_URL = AUTH_URL;
// Google is never reached: no test drives the redirect, and the second auth
// instance in `tests/auth.ts` signs in without one. These exist because
// `src/env.ts` refuses to boot a server that could not sign anyone in.
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
