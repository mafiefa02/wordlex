import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

/**
 * The better-auth config, kept here because it is the input that produced
 * `src/db/auth-schema.ts`. Regenerate that file if this ever changes:
 *
 *     npx @better-auth/cli@latest generate --config src/auth.ts \
 *       --output src/db/auth-schema.ts
 *
 * The generated file is then just another Drizzle schema — drizzle-kit owns
 * every migration, and better-auth never issues DDL of its own.
 *
 * Which ways a Player may sign in is not decided yet, so nothing is enabled.
 * The four tables below are better-auth's core and do not depend on that.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
});
