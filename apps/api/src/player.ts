import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { game, player, type Queryable } from "./db";

/**
 * The Player row for an Account, minted the first time we see one (ADR 0025).
 * Everything a Player owns points here rather than at better-auth's `user`, so
 * this is the translation between the two and the only place that mints.
 *
 * Insert-then-read rather than read-then-insert: two requests arriving together
 * for the same Account both read nothing, and `player.account_id` being unique
 * is what picks a winner. The loser reads the winner's row.
 */
export async function playerFor(tx: Queryable, accountId: string): Promise<string> {
  const [minted] = await tx
    .insert(player)
    .values({ accountId })
    .onConflictDoNothing({ target: player.accountId })
    .returning({ id: player.id });
  if (minted) return minted.id;

  const [found] = await tx
    .select({ id: player.id })
    .from(player)
    .where(eq(player.accountId, accountId))
    .limit(1);
  if (!found) throw new Error(`no Player for Account ${accountId} after minting one`);
  return found.id;
}

/**
 * Signing in takes over the anonymous Games this browser holds tokens for, and
 * only today's (ADR 0027). A token expires at rollover, so "today's" is not a
 * filter on top of what the tokens name — it is what the tokens can name at all.
 * The day is checked anyway, because a Game that outlives its token is exactly
 * the row this must not silently adopt.
 *
 * A Daily the Account has already played keeps the Account's Game: that is the
 * identity the Player has been deliberately building, and folding both in would
 * give one Player two Games against one Daily (ADR 0020).
 *
 * `unknown_word_attempt` rows stay anonymous even for a Game that moves. Nothing
 * forces the issue — those rows key on the Game, so they collide with nothing —
 * and ADR 0027 chose not to reopen review evidence that was already written.
 */
export async function claimTodaysGames(
  tx: Queryable,
  playerId: string,
  gameIds: string[],
): Promise<string[]> {
  if (gameIds.length === 0) return [];

  const claimed = await tx
    .update(game)
    .set({ playerId })
    .where(
      and(
        inArray(game.id, gameIds),
        isNull(game.playerId),
        sql`exists (select 1 from daily d where d.id = ${game.dailyId} and d.day = wordlex_day())`,
        sql`not exists (
          select 1 from game other
           where other.player_id = ${playerId} and other.daily_id = ${game.dailyId}
        )`,
      ),
    )
    .returning({ id: game.id });

  return claimed.map((row) => row.id);
}
