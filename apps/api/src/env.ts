import { type } from "arktype";

const Env = type({
  "PORT?": "string.integer.parse",
  // Decides one thing here: whether the Game token cookie is `Secure`. Only an
  // explicit `development` or `test` turns that off, so a deploy that forgets to
  // set this gets the safe answer rather than the convenient one. `.env` carries
  // it for local dev, where plain http means Secure cannot be on.
  "NODE_ENV?": "string",
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
  // Signs the per-Track Game token (ADR 0022). Unsigned, a browser could name
  // any Game id and claim the Game it points at.
  COOKIE_SECRET: "string >= 32",
  // Signs better-auth's session cookie. Deliberately not COOKIE_SECRET: the two
  // sign different things with different lifetimes, and rotating the Game token's
  // secret should not sign every Player out.
  BETTER_AUTH_SECRET: "string >= 32",
  // This API's own base URL, which is what Google redirects back to. It must
  // match the redirect URI registered in the Google Cloud console exactly, down
  // to the scheme and port (ADR 0025).
  BETTER_AUTH_URL: "string > 0",
  GOOGLE_CLIENT_ID: "string > 0",
  GOOGLE_CLIENT_SECRET: "string > 0",
  // The domain the session cookie is set on, so one sign-in covers all three
  // subdomains (ADR 0006). Unset locally, where every app is on `localhost` and
  // a domain-scoped cookie is neither needed nor allowed.
  "AUTH_COOKIE_DOMAIN?": "string > 0",
});

const parsed = Env(process.env);

if (parsed instanceof type.errors) {
  throw new Error(`Bad environment:\n${parsed.summary}`);
}

export const env = {
  port: parsed.PORT ?? 4000,
  // Fails closed on purpose. The other way round, one deploy with NODE_ENV
  // unset ships the token that *is* a Game's only claim over plain http.
  secureCookies: parsed.NODE_ENV !== "development" && parsed.NODE_ENV !== "test",
  allowedOrigins: parsed.ALLOWED_ORIGINS,
  databaseUrl: parsed.DATABASE_URL,
  directUrl: parsed.DIRECT_URL,
  cookieSecret: parsed.COOKIE_SECRET,
  authSecret: parsed.BETTER_AUTH_SECRET,
  authUrl: parsed.BETTER_AUTH_URL,
  googleClientId: parsed.GOOGLE_CLIENT_ID,
  googleClientSecret: parsed.GOOGLE_CLIENT_SECRET,
  authCookieDomain: parsed.AUTH_COOKIE_DOMAIN,
};
