import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { TEST_DATABASE_URL, TEST_PORT } from "./config";

/**
 * Migrates the test database once, from whatever state it is in. The container
 * keeps its data in a tmpfs, so that is usually nothing at all — which is the
 * point: `drizzle/` is what gets tested, not a database somebody hand-patched.
 */
export async function setup() {
  // `5432` by name as well as `TEST_PORT` by construction: the second catches an
  // edit that repoints both constants at the container you develop against,
  // which is the mistake that costs you a database rather than a test run.
  const port = new URL(TEST_DATABASE_URL).port;
  if (port !== String(TEST_PORT) || port === "5432") {
    throw new Error(`the suite truncates tables and will only do it on port ${TEST_PORT}`);
  }

  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    // Resolved from this file, not the cwd: `vitest --root apps/api` from the
    // repo root would otherwise look for the migrations beside itself.
    await migrate(drizzle(client), { migrationsFolder: join(import.meta.dirname, "../drizzle") });
  } catch (cause) {
    throw new Error(
      `could not migrate the test database on :${TEST_PORT}. Start it with:\n` +
        `  docker compose -f ../../docker-compose.yml up -d --wait db-test`,
      { cause },
    );
  } finally {
    await client.end();
  }
}
