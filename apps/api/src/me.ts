import { type Language, wordlexDay, type WordlexDay, streak } from "@wordlex/domain";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { accountFromRequest } from "./account";
import { playerHistory } from "./badges";
import { badge, badgeAward, db } from "./db";
import { type ApiResponse, fail, varyOnCookie } from "./http";
import { playerFor } from "./player";

type Profile = {
  player: { id: string };
  account: { name: string; email: string; image: string | null };
  /** Consecutive WordleX Days with a win on any Track (ADR 0026). */
  streak: { current: number; longest: number };
  badges: {
    id: string;
    name: string;
    description: string;
    awardedAt: string;
    /** Null until the play app has shown it. */
    seenAt: string | null;
  }[];
};

/**
 * One row per WordleX Day the Player played on, oldest first — the contribution
 * graph, in the shape ADR 0014 needs both encodings to be drawn from: a count
 * per language for the stacked calendar, and their sum for the small one.
 *
 * Only days with Games appear. A Game with no Guesses is not a day played.
 */
type History = { days: { day: WordlexDay; counts: Partial<Record<Language, number>> }[] };

export function registerMe(app: FastifyInstance) {
  /**
   * Who the Player is, how their Streak stands, and what they have earned. Every
   * number here is derived from Game rows on the way out rather than stored
   * (ADR 0008), which is what lets the Streak rule change and still be right
   * about last year.
   */
  app.get("/me", async (request, reply) => {
    const account = await accountFromRequest(request);
    if (!account) return reply.code(401).send(fail("NOT_SIGNED_IN", "nobody is signed in"));
    varyOnCookie(reply);

    const body = await db.transaction(async (tx): Promise<ApiResponse<Profile>> => {
      const playerId = await playerFor(tx, account.id);
      const history = await playerHistory(tx, playerId);

      const earned = await tx
        .select({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          awardedAt: badgeAward.createdAt,
          seenAt: badgeAward.seenAt,
        })
        .from(badgeAward)
        .innerJoin(badge, eq(badge.id, badgeAward.badge))
        .where(eq(badgeAward.playerId, playerId))
        .orderBy(asc(badgeAward.createdAt));

      return {
        data: {
          player: { id: playerId },
          account: { name: account.name, email: account.email, image: account.image ?? null },
          streak: streak(
            history.filter((it) => it.won).map((it) => it.day),
            wordlexDay(),
          ),
          badges: earned.map((it) => ({
            id: it.id,
            name: it.name,
            description: it.description,
            awardedAt: it.awardedAt.toISOString(),
            seenAt: it.seenAt?.toISOString() ?? null,
          })),
        },
      };
    });

    return reply.code(200).send(body);
  });

  /** The Player's whole play history, a day at a time (ADR 0014). */
  app.get("/me/history", async (request, reply) => {
    const account = await accountFromRequest(request);
    if (!account) return reply.code(401).send(fail("NOT_SIGNED_IN", "nobody is signed in"));
    varyOnCookie(reply);

    const body = await db.transaction(async (tx): Promise<ApiResponse<History>> => {
      const history = await playerHistory(tx, await playerFor(tx, account.id));

      const days = new Map<WordlexDay, Partial<Record<Language, number>>>();
      for (const game of history) {
        if (game.guesses === 0) continue;
        const counts = days.get(game.day) ?? {};
        counts[game.language] = (counts[game.language] ?? 0) + 1;
        days.set(game.day, counts);
      }

      // `playerHistory` comes back oldest first, so the Map preserves that order.
      return { data: { days: [...days].map(([day, counts]) => ({ day, counts })) } };
    });

    return reply.code(200).send(body);
  });

  /**
   * Marks every Badge the Player holds as shown, which is what stops the toast
   * coming back tomorrow.
   *
   * The one write here that carries no `Idempotency-Key`, on ADR 0024's own
   * reasoning rather than around it: this spends nothing and the second call
   * changes nothing, exactly like recording an Unknown Word. A key would be
   * ceremony over a statement whose `where` clause already makes it a no-op.
   */
  app.post("/me/badges/seen", async (request, reply) => {
    const account = await accountFromRequest(request);
    if (!account) return reply.code(401).send(fail("NOT_SIGNED_IN", "nobody is signed in"));

    const body = await db.transaction(async (tx): Promise<ApiResponse<{ seen: number }>> => {
      const playerId = await playerFor(tx, account.id);
      const marked = await tx
        .update(badgeAward)
        .set({ seenAt: sql`now()` })
        .where(and(eq(badgeAward.playerId, playerId), isNull(badgeAward.seenAt)))
        .returning({ badge: badgeAward.badge });
      return { data: { seen: marked.length } };
    });

    return reply.code(200).send(body);
  });
}
