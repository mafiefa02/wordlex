import { fastifyCookie, signerFactory } from "@fastify/cookie";
import { dayEndsAt, type Language, type Length, TRACKS } from "@wordlex/domain";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Daily } from "./board";
import { game, gameStatus, type Transaction } from "./db";
import { env } from "./env";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * One cookie per Track (ADR 0022), holding a *signed* Game id. Twelve at most,
 * and each expires when its WordleX Day does — a Game token is worth nothing
 * after rollover, when the Daily has changed and the rollover job has swept the
 * Game to `abandoned`.
 *
 * Per Track rather than one cookie holding all twelve, because all twelve
 * Dailies are open every day and a Player may play as many as they like. One
 * combined cookie would be rewritten on every Guess on any Track.
 */
const cookieName = (language: Language, length: Length) => `wordlex_game_${language}_${length}`;

/**
 * The same secret @fastify/cookie was registered with, as a standalone signer.
 * Sign-in reads these cookies from a raw header rather than from a
 * `FastifyRequest` — better-auth hands its hooks the headers it was called with,
 * not Fastify's request — so `request.unsignCookie` is not available there.
 */
const signer = signerFactory(env.cookieSecret);

/**
 * Every Game this browser holds a token for, across all twelve Tracks. What
 * signing in carries over is drawn from exactly this (ADR 0027): a token is the
 * only claim an anonymous Game has, so a Game nobody holds a token for is
 * nobody's to take.
 */
export function gameIdsFromCookieHeader(header: string | undefined | null): string[] {
  if (!header) return [];
  const jar = fastifyCookie.parse(header);
  return TRACKS.flatMap(({ language, length }) => {
    const signed = jar[cookieName(language, length)];
    if (signed === undefined) return [];
    const unsigned = signer.unsign(signed);
    return unsigned.valid && unsigned.value !== null && UUID.test(unsigned.value)
      ? [unsigned.value]
      : [];
  });
}

/**
 * The Game this browser holds a token for on this Track, if that token is one we
 * signed and it names a Game against *today's* Daily.
 *
 * The second half is the point: a token is only ever good for the one Game it
 * names. Presenting yesterday's, or another Track's, or another Daily's finds
 * nothing rather than attaching the request to a Game it was not issued for.
 */
export async function gameFromToken(
  tx: Transaction,
  request: FastifyRequest,
  today: Daily,
): Promise<{ id: string; status: (typeof gameStatus.enumValues)[number] } | undefined> {
  const signed = request.cookies[cookieName(today.language, today.length)];
  const unsigned = signed === undefined ? undefined : request.unsignCookie(signed);
  if (!unsigned?.valid || unsigned.value === null || !UUID.test(unsigned.value)) return undefined;

  const [found] = await tx
    .select({ id: game.id, status: game.status })
    .from(game)
    .where(and(eq(game.id, unsigned.value), eq(game.dailyId, today.id)))
    .limit(1);
  return found;
}

/**
 * Hands back the token for a Game. Only ever after the transaction commits, or a
 * rollback would leave a browser holding a token for a Game that does not exist.
 */
export function setGameToken(reply: FastifyReply, today: Daily, gameId: string) {
  reply.setCookie(cookieName(today.language, today.length), gameId, {
    signed: true,
    httpOnly: true,
    // play.wordlex.com and api.wordlex.com are the same site, so Lax is still
    // sent on the cross-origin call the board makes (ADR 0006). Preview
    // deployments are the exception: `vercel.app` is on the Public Suffix List,
    // so two preview URLs are cross-site and the browser drops this.
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    expires: dayEndsAt(today.day),
  });
}
