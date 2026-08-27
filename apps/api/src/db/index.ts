import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

// Supavisor in transaction mode hands out a different backend per statement, so
// a prepared statement is rarely still there when it is reused (ADR 0015). It
// stays off locally too, where there is no pooler, so dev behaves like prod.
const client = postgres(env.databaseUrl, { prepare: false });

export const db = drizzle(client, { schema: { ...schema, ...authSchema } });

export * from "./schema";
