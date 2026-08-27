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
 * Anyone playing WordleX, signed in or not (ADR 0007). Everything a Player owns
 * points here, never at better-auth's `user` — `accountId` is the one link, and
 * it is nullable because most Players never claim an Account.
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
 * One Player's attempt at one Daily. `abandoned` is kept distinct from `lost`
 * because ADR 0012's Solve Rate counts Games won, and someone who walked away
 * after one Guess is much weaker evidence than someone who spent every Guess.
 */
export const game = pgTable(
  "game",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "restrict" }),
    dailyId: uuid("daily_id")
      .notNull()
      .references(() => daily.id, { onDelete: "restrict" }),
    status: gameStatus("status").default("playing").notNull(),
    createdAt,
  },
  (table) => [
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
    // A Game is only ever deleted by the merge, which discards the anonymous
    // Player's colliding Games whole (ADR 0020). Its Guesses go with it.
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
 * A word a Player typed that the Dictionary does not have (ADR 0009). The
 * primary key is what makes a Candidate's weight the number of *distinct*
 * Players — one person typing it forty times still counts once.
 *
 * There is deliberately no foreign key to `word`: the review queue is exactly
 * the attempts with no `word` row at all, so a rejected word stops resurfacing
 * by having a row rather than by being deleted here.
 */
export const unknownWordAttempt = pgTable(
  "unknown_word_attempt",
  {
    language: text("language").$type<Language>().notNull(),
    length: smallint("length").$type<Length>().notNull(),
    word: text("word").notNull(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "restrict" }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.language, table.length, table.word, table.playerId] }),
    // The key is ordered for counting a Candidate's weight. ADR 0020's merge
    // reads the other way round, one Player at a time, on a table that by
    // design never shrinks.
    index("unknown_word_attempt_player_idx").on(table.playerId),
  ],
);

/** A Badge a Player has earned. `seenAt` is null until they have been shown it. */
export const badgeAward = pgTable(
  "badge_award",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "restrict" }),
    badge: text("badge").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.playerId, table.badge] })],
);
