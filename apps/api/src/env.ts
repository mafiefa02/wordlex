import { type } from "arktype";

const Env = type({
  "PORT?": "string.integer.parse",
  // Browsers send credentials to this API, so the allowlist is explicit —
  // never a wildcard (ADR 0006).
  ALLOWED_ORIGINS: type("string")
    .pipe((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .to("string[] > 0"),
  // The app's connection, through Supavisor in transaction mode (ADR 0006).
  DATABASE_URL: "string > 0",
  // A direct connection on 5432, for migrations and seeding. Transaction-mode
  // pooling hands out a different backend per statement, which DDL cannot rely
  // on, so drizzle-kit gets its own URL.
  DIRECT_URL: "string > 0",
});

const parsed = Env(process.env);

if (parsed instanceof type.errors) {
  throw new Error(`Bad environment:\n${parsed.summary}`);
}

export const env = {
  port: parsed.PORT ?? 4000,
  allowedOrigins: parsed.ALLOWED_ORIGINS,
  databaseUrl: parsed.DATABASE_URL,
  directUrl: parsed.DIRECT_URL,
};
