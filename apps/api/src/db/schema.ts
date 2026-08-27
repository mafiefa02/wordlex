import type { Language, Length, WordlexDay } from "@wordlex/domain";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const wordStatus = pgEnum("word_status", ["active", "rejected"]);

/** Who last wrote the row. The seed only ever overwrites its own (ADR 0018). */
export const wordSource = pgEnum("word_source", ["derived", "reviewer"]);

/**
 * The Dictionary and the Answer Pool, in one table (ADR 0018). Every row is a
 * Dictionary word; the small subset with `inAnswerPool` is that Track's Answer
 * Pool, which makes CONTEXT.md's "every Answer Pool word is also a Dictionary
 * word" impossible to violate rather than something to maintain.
 *
 * `word` is the normalised key a Guess is looked up by — lowercased, diacritics
 * folded, `a-z` only (ADR 0009). `display` is the same word as a Player sees it.
 */
export const word = pgTable(
  "word",
  {
    language: text("language").$type<Language>().notNull(),
    length: smallint("length").$type<Length>().notNull(),
    word: text("word").notNull(),
    display: text("display").notNull(),
    inAnswerPool: boolean("in_answer_pool").default(false).notNull(),
    status: wordStatus("status").default("active").notNull(),
    source: wordSource("source").default("derived").notNull(),
    /** Set when a speaker has ruled on the word; the seed then leaves it alone. */
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.language, table.length, table.word] }),
    // "Not a real word" has to mean out of both. A reviewer rejecting a word
    // while leaving it answerable would put it up as a Daily nobody can type.
    check(
      "word_rejected_is_not_answerable",
      sql`not (${table.status} = 'rejected' and ${table.inAnswerPool})`,
    ),
    // `word` is the normalised form, so its character count is the Track's
    // length by definition. Without this, a mis-derived row can become an
    // Answer nobody can type, and ADR 0019 has no way to fix that mid-day.
    check("word_length_matches_track", sql`length(${table.word}) = ${table.length}`),
    // The only index the Answer Pool needs: it is what picking a Daily and
    // counting runway both scan, and it is a fraction of the table's size.
    index("word_answer_pool_idx")
      .on(table.language, table.length)
      .where(sql`${table.inAnswerPool} and ${table.status} = 'active'`),
  ],
);

/**
 * A signed-in Player (ADR 0022, reversing ADR 0007's anonymous half). Everything
 * a Player owns points here, never at better-auth's `user`.
 *
 * **Nothing writes a row here yet** — anonymous play is Game-scoped and has no
 * Player at all, so this table and `accountId` are both waiting for the auth
 * slice. `accountId` stays nullable so deleting an Account can null it without
 * taking the history with it.
 */
export const player = pgTable("player", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Deleting an Account turns that Player anonymous again and keeps their
  // history. This is the one exception to RESTRICT below (ADR 0020).
  accountId: text("account_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  createdAt,
});

/**
 * The one Answer issued to a Track for a WordleX Day (ADR 0019). Written down
 * rather than computed, so cleaning the Answer Pool later cannot retroactively
 * change what a Player was already scored against.
 *
 * `rotation` is which pass through the Answer Pool this Answer belongs to. A
 * word is used once per Rotation, and when the pool runs out the next Rotation
 * starts. Following ADR 0008 nothing counts: how often a word has come up and
 * which Rotations it appeared in are both queries against this column.
 */
export const daily = pgTable(
  "daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    language: text("language").$type<Language>().notNull(),
    length: smallint("length").$type<Length>().notNull(),
    day: date("day", { mode: "string" }).$type<WordlexDay>().notNull(),
    word: text("word").notNull(),
    rotation: smallint("rotation").default(1).notNull(),
    createdAt,
  },
  (table) => [
    unique("daily_track_day_key").on(table.language, table.length, table.day),
    // `word` has the same check, but nothing links the two tables and the
    // freeze trigger makes a live row with a wrong-length Answer unfixable.
    check("daily_word_length_matches_track", sql`length(${table.word}) = ${table.length}`),
    // Serves both the picker's "not yet used this Rotation" check and the
    // question it exists for: every time this word has been the Answer.
    index("daily_track_word_idx").on(table.language, table.length, table.word),
  ],
);

export const gameStatus = pgEnum("game_status", ["playing", "won", "lost", "abandoned"]);

/**
 * One attempt at one Daily. `abandoned` is kept distinct from `lost` because
 * ADR 0012's Solve Rate counts Games won, and someone who walked away after one
 * Guess is much weaker evidence than someone who spent every Guess.
 *
 * `playerId` is null for an anonymous Game (ADR 0022). That null is the flag
 * every review query filters on: anonymous evidence cannot be attributed to a
 * person, so it is weaker for both ADR 0009's Candidate weights and ADR 0012's
 * Solve Rate, and both need to be able to exclude it.
 */
export const game = pgTable(
  "game",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").references(() => player.id, { onDelete: "restrict" }),
    dailyId: uuid("daily_id")
      .notNull()
      .references(() => daily.id, { onDelete: "restrict" }),
    status: gameStatus("status").default("playing").notNull(),
    createdAt,
  },
  (table) => [
    // One Game per Player per Daily still holds for a signed-in Player. Postgres
    // treats nulls as distinct, so anonymous Games are not constrained by this —
    // there is no identity to constrain them by, which is the trade ADR 0022
    // makes and the reason anonymous replay of a Daily is free.
    unique("game_player_daily_key").on(table.playerId, table.dailyId),
    // The unique constraint leads with `player_id`, so it does nothing for the
    // RESTRICT check ADR 0012 triggers when it deletes a condemned Daily.
    index("game_daily_idx").on(table.dailyId),
  ],
);

/**
 * One scored row of a Game. The word is stored, not just its Marks: ADR 0012's
 * sharp signal is how many distinct Players have ever typed a given word, and
 * that question is asked across every Game, not just the day it was the Answer.
 */
export const guess = pgTable(
  "guess",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nothing deletes a Game, and `unknown_word_attempt.game_id` is RESTRICT, so
    // any Game that recorded one cannot be deleted at all. This cascade only
    // ever covers the rest.
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    word: text("word").notNull(),
    createdAt,
  },
  (table) => [unique("guess_game_position_key").on(table.gameId, table.position)],
);

/**
 * A word someone typed that the Dictionary does not have (ADR 0009).
 *
 * A Candidate's weight is how many *distinct* people typed a word, and the two
 * unique indexes below are what enforce it. ADR 0009 counts one row per
 * `(Track, word, Player)`, so both are Track-scoped: the same Player typing the
 * same word in English-5 and Indonesian-5 is two rows, because those are two
 * different Dictionaries and each needs its own answer.
 *
 * Where the Player is unknown the key falls back to the Game, which is as far as
 * an anonymous identity reaches (ADR 0022). That is the weaker number, and it is
 * why `playerId is null` has to stay visible to the query rather than be folded
 * away.
 *
 * There is deliberately no foreign key to `word`: the review queue is exactly
 * the attempts with no `word` row at all, so a rejected word stops resurfacing
 * by having a row rather than by being deleted here.
 */
export const unknownWordAttempt = pgTable(
  "unknown_word_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    language: text("language").$type<Language>().notNull(),
    length: smallint("length").$type<Length>().notNull(),
    word: text("word").notNull(),
    /** Null when the Game was anonymous. */
    playerId: uuid("player_id").references(() => player.id, { onDelete: "restrict" }),
    /**
     * The only identity an anonymous attempt has, and set on everything written
     * since ADR 0022. Nullable so this column could be added to a table that
     * already held rows: those predate anonymous Games, so they have a Player
     * and no Game, and there is nothing to backfill them with.
     */
    gameId: uuid("game_id").references(() => game.id, { onDelete: "restrict" }),
    createdAt,
  },
  (table) => [
    // One or the other must identify the attempt, or it counts towards nothing
    // and dedupes against nothing.
    check(
      "unknown_word_attempt_has_an_identity",
      sql`${table.playerId} is not null or ${table.gameId} is not null`,
    ),
    uniqueIndex("unknown_word_attempt_player_key")
      .on(table.language, table.length, table.word, table.playerId)
      .where(sql`${table.playerId} is not null`),
    uniqueIndex("unknown_word_attempt_game_key")
      .on(table.language, table.length, table.word, table.gameId)
      .where(sql`${table.playerId} is null`),
    // Neither unique index above leads with an identity, so without these the
    // RESTRICT checks on both foreign keys seq-scan this table — which is the
    // whole point of `DELETE FROM player` failing loudly rather than slowly
    // (ADR 0020). No query reads by either column today.
    index("unknown_word_attempt_player_idx").on(table.playerId),
    index("unknown_word_attempt_game_idx").on(table.gameId),
  ],
);

/**
 * Every Badge that exists — the definition, not the earning. Reference data:
 * `id` is a stable slug, and the copy beside it is what the play app shows.
 *
 * A table rather than a constant in `packages/domain` because ADR 0008 derives
 * the earned set by query, so the rows in `badge_award` will be written by SQL a
 * person wrote. Free text there means one typo invents a Badge that nothing
 * defines and nothing will ever show, silently and permanently. This is the same
 * argument ADR 0019 makes for the freeze trigger: the people most likely to
 * break it are us with psql open.
 *
 * Unlike the Dictionary (ADR 0018), adding a row here is *not* a substitute for
 * a deploy — a Badge needs the query that awards it, which is code. The rows
 * exist so an award can be joined to something, not so Badges can be authored.
 */
export const badge = pgTable("badge", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt,
});

/**
 * A Badge a Player has earned. `seenAt` is null until they have been shown it.
 * Signed-in only: an anonymous Game has no Player to award one to (ADR 0022).
 *
 * ADR 0011 calls this ledger a cache of the derived set rather than the source
 * of truth, so a Badge added later still awards retroactively.
 */
export const badgeAward = pgTable(
  "badge_award",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "restrict" }),
    // RESTRICT, so retiring a Badge cannot quietly delete the awards of it.
    badge: text("badge")
      .notNull()
      .references(() => badge.id, { onDelete: "restrict" }),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.badge] }),
    // The primary key leads with `player_id`, so it does nothing for the
    // RESTRICT check on `badge`. Without this, retiring a Badge seq-scans.
    index("badge_award_badge_idx").on(table.badge),
  ],
);
