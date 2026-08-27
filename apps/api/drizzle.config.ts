import { defineConfig } from "drizzle-kit";

// Deliberately reads process.env rather than ./src/env, which validates the
// whole server's environment: a migration should not need CORS to be set up.
const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL is not set. Migrations need the direct 5432 connection, not the pooler.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  // better-auth's tables are generated, but they are migrated like any other:
  // drizzle-kit owns every migration and better-auth never issues DDL.
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: { url },
});
