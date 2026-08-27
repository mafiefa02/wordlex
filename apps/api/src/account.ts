import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import { auth } from "./auth.js";

/**
 * The Account this request is signed in as, or undefined for anyone else
 * (CONTEXT.md: better-auth's `user` row *is* the Account).
 *
 * One database round trip per request that asks. That is a real cost on the
 * Guess path and it stays until there is traffic to measure — better-auth's
 * `session.cookieCache` removes it, at the price of a session that outlives its
 * revocation by the cache's lifetime, and neither trade is worth guessing at now.
 */
export async function accountFromRequest(request: FastifyRequest) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  return session?.user;
}
