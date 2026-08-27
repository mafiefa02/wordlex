import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { env } from "./env";
import { logger } from "./logger";
import { claimTodaysGames, playerFor } from "./player";
import { gameIdsFromCookieHeader } from "./session";

/**
 * Everything better-auth is configured with, kept separate from the instance so
 * the tests can build a second one that shares it. That second instance differs
 * only in how a session is *started* — it cannot drive Google's redirect — and
 * sharing this object is what makes it the same server everywhere else,
 * hooks included.
 *
 * This is also the input that produced `src/db/auth-schema.ts`. Regenerate that
 * file if this ever changes:
 *
 *     npx @better-auth/cli@latest generate --config src/auth.ts \
 *       --output src/db/auth-schema.ts
 *
 * The generated file is then just another Drizzle schema — drizzle-kit owns
 * every migration, and better-auth never issues DDL of its own.
 */
export const authOptions = {
  appName: "WordleX",
  baseURL: env.authUrl,
  secret: env.authSecret,
  database: drizzleAdapter(db, { provider: "pg" }),
  // The same allowlist the Origin check uses. better-auth checks it on its own
  // endpoints, and it is also what bounds the `callbackURL` a sign-in may name —
  // without it, anyone could send a Player back to their own page holding a
  // fresh session (ADR 0006).
  trustedOrigins: env.allowedOrigins,
  // Google and nothing else (ADR 0025).
  socialProviders: {
    google: { clientId: env.googleClientId, clientSecret: env.googleClientSecret },
  },
  session: {
    // Only deletion asks whether a session is fresh, and with Google as the one
    // provider there is no password and no mail to fall back on — a re-sign-in
    // *is* the confirmation step. Five minutes means almost every deletion is
    // preceded by one, which is the whole protection an Account has against a
    // walk-up on an unlocked browser (ADR 0025). It costs nothing elsewhere.
    freshAge: 60 * 5,
  },
  user: {
    // Deleting an Account unlinks it and keeps the play data: better-auth drops
    // the `user` row and its sessions, and `player.account_id` is `on delete set
    // null`, so the Player survives with their Games, Badges and Unknown Words
    // intact and nobody able to reach them again (ADR 0020).
    deleteUser: { enabled: true },
  },
  advanced: {
    useSecureCookies: env.secureCookies,
    // Set on `.wordlex.com` in production so one sign-in covers all three
    // subdomains (ADR 0006). Locally every app is on `localhost`, where a
    // domain-scoped cookie is neither needed nor accepted.
    ...(env.authCookieDomain
      ? { crossSubDomainCookies: { enabled: true, domain: env.authCookieDomain } }
      : {}),
  },
  databaseHooks: { session: { create: { after: onSignIn } } },
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

/**
 * Two things happen the moment a session is created, and neither may break
 * signing in (ADR 0027): the Account gets its Player, and the anonymous Games
 * this browser holds tokens for today move to that Player.
 *
 * Separate steps, in that order, each swallowing its own failure. A Player who
 * signs in and finds today's Game missing has had a bad afternoon; a Player who
 * cannot sign in at all has no app. Minting first means a carry-over that fails
 * still leaves them with somewhere for tomorrow's Games to go.
 */
async function onSignIn(
  session: { userId: string },
  context: { headers?: Headers; request?: Request } | null,
): Promise<void> {
  let playerId: string;
  try {
    playerId = await playerFor(db, session.userId);
  } catch (error) {
    logger.error({ err: error, accountId: session.userId }, "could not mint a Player on sign-in");
    return;
  }

  try {
    const cookies = context?.headers?.get("cookie") ?? context?.request?.headers.get("cookie");
    await claimTodaysGames(db, playerId, gameIdsFromCookieHeader(cookies));
  } catch (error) {
    logger.error({ err: error, playerId }, "could not carry today's Games over on sign-in");
  }
}
