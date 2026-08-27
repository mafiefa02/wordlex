import {
  type Language,
  LANGUAGES,
  type Length,
  streak,
  type WordlexDay,
  wordlexDay,
} from "@wordlex/domain";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { badge, badgeAward, daily, game, guess, type Queryable } from "./db";

/**
 * One of a Player's Games, flattened to what a Badge can ask about. This is
 * every Game they have ever had, not a window: ADR 0011 makes the awarded set
 * derived, so a Badge added next year has to be able to look at last year.
 */
export type PlayedGame = {
  day: WordlexDay;
  language: Language;
  length: Length;
  won: boolean;
  /** How many Guesses were spent. Zero means Play was pressed and nothing typed. */
  guesses: number;
};

/**
 * A Game only counts as played once a Guess has been spent on it. Pressing Play
 * costs one request and creates a Game, so without this "played all four
 * languages in one day" is four clicks and no words — and the same press is what
 * the rollover sweeps to `abandoned` (ADR 0026).
 */
const played = (history: PlayedGame[]) => history.filter((it) => it.guesses > 0);

const daysWith = (history: PlayedGame[]) => new Set(history.map((it) => it.day));

const byDay = (history: PlayedGame[]) => {
  const days = new Map<WordlexDay, PlayedGame[]>();
  for (const it of history) days.set(it.day, [...(days.get(it.day) ?? []), it]);
  return [...days.values()];
};

const distinct = <T>(items: T[], key: (item: T) => string) => new Set(items.map(key)).size;

/**
 * Every Badge, as the question that earns it (ADR 0011: breadth and persistence,
 * never speed or skill). The ids are the contract — `badge_award.badge` is a
 * foreign key into rows carrying the same ones, and `tests/me.test.ts` checks the
 * two lists have not drifted apart.
 *
 * A predicate is asked about the Player's whole history every time, so a Badge
 * is never missed by having been added late.
 */
export const BADGES = {
  "first-win": (history) => history.some((it) => it.won),
  "first-win-en": (history) => history.some((it) => it.won && it.language === "en"),
  "first-win-id": (history) => history.some((it) => it.won && it.language === "id"),
  "first-win-su": (history) => history.some((it) => it.won && it.language === "su"),
  "first-win-jv": (history) => history.some((it) => it.won && it.language === "jv"),
  "all-four-in-a-day": (history) =>
    byDay(played(history)).some((day) => distinct(day, (it) => it.language) === 4),
  "full-house": (history) =>
    byDay(played(history)).some(
      (day) => distinct(day, (it) => `${it.language}-${it.length}`) === 12,
    ),
  "all-twelve-tracks": (history) =>
    distinct(played(history), (it) => `${it.language}-${it.length}`) === 12,
  "streak-7": (history, today) =>
    streak(daysWith(history.filter((it) => it.won)), today).longest >= 7,
  "streak-30": (history, today) =>
    streak(daysWith(history.filter((it) => it.won)), today).longest >= 30,
  "streak-100": (history, today) =>
    streak(daysWith(history.filter((it) => it.won)), today).longest >= 100,
  "week-of-one": (history, today) =>
    LANGUAGES.some(
      (language) =>
        streak(daysWith(played(history).filter((it) => it.language === language)), today).longest >=
        7,
    ),
} satisfies Record<string, (history: PlayedGame[], today: WordlexDay) => boolean>;

export type BadgeId = keyof typeof BADGES;

/** A Badge as the play app shows it: the id it branches on, the copy it renders. */
export type EarnedBadge = { id: string; name: string; description: string };

/**
 * Every Game a Player has had, which is what both a Streak and a Badge read.
 * Oldest first, so the contribution graph gets its order from the index that
 * already exists rather than sorting a year of days in the handler.
 */
export async function playerHistory(tx: Queryable, playerId: string): Promise<PlayedGame[]> {
  return tx
    .select({
      day: daily.day,
      language: daily.language,
      length: daily.length,
      won: sql<boolean>`${game.status} = 'won'`,
      guesses:
        sql<number>`(select count(*) from ${guess} where ${guess.gameId} = ${game.id})`.mapWith(
          Number,
        ),
    })
    .from(game)
    .innerJoin(daily, eq(daily.id, game.dailyId))
    .where(eq(game.playerId, playerId))
    .orderBy(asc(daily.day));
}

/**
 * Brings the ledger up to date with what the Player has actually earned, and
 * hands back only what was new — which is what a "you just earned this" toast
 * needs and nothing else has (ADR 0011).
 *
 * Every predicate is re-asked, not just the ones this Game could have moved.
 * Twelve cheap checks over one query beats reasoning about which Badge a
 * particular Guess might have unlocked, and it is what makes the ledger a cache
 * that can be rebuilt rather than a counter that can drift.
 */
export async function awardBadges(tx: Queryable, playerId: string): Promise<EarnedBadge[]> {
  const history = await playerHistory(tx, playerId);
  const today = wordlexDay();

  const earned = (Object.keys(BADGES) as BadgeId[]).filter((id) => BADGES[id](history, today));
  if (earned.length === 0) return [];

  const awarded = await tx
    .insert(badgeAward)
    .values(earned.map((id) => ({ playerId, badge: id })))
    .onConflictDoNothing()
    .returning({ badge: badgeAward.badge });
  if (awarded.length === 0) return [];

  return tx
    .select({ id: badge.id, name: badge.name, description: badge.description })
    .from(badge)
    .where(
      inArray(
        badge.id,
        awarded.map((it) => it.badge),
      ),
    );
}
