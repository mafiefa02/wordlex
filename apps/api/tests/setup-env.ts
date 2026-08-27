// Runs before anything else in a test file, because `src/env.ts` validates and
// `src/db/index.ts` opens its connection the moment they are imported.
// Assignment is unconditional: an exported DATABASE_URL from the shell must not
// win, or the suite truncates the development database instead of the test one.
//
// This file imports nothing but constants on purpose — an import of anything
// under `src/` would be evaluated before the lines below ever run.
import { COOKIE_SECRET, ORIGIN, TEST_DATABASE_URL } from "./config";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;
process.env.ALLOWED_ORIGINS = ORIGIN;
process.env.COOKIE_SECRET = COOKIE_SECRET;
