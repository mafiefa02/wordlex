import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as authSchema from "./auth-schema.js";
import * as schema from "./schema.js";

// Supavisor in transaction mode hands out a different backend per statement, so
// a prepared statement is rarely still there when it is reused (ADR 0015). It
// stays off locally too, where there is no pooler, so dev behaves like prod.
const client = postgres(env.databaseUrl, { prepare: false });

export const db = drizzle(client, { schema: { ...schema, ...authSchema } });

/** What `db.transaction` hands its callback. Every query outside a route takes one. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Either connection a query can run on. Almost everything takes a `Transaction`,
 * because almost everything is one step of several that have to agree. The two
 * that do not are the sign-in steps, which are deliberately separate so that one
 * failing does not undo the other (ADR 0027).
 */
export type Queryable = typeof db | Transaction;

export * from "./schema.js";
