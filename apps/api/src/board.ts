import { type Language, type Length, type Mark, score, type WordlexDay } from "@wordlex/domain";
import { and, eq, sql } from "drizzle-orm";
import { daily, gameStatus, guess, type Transaction, word } from "./db";

/** Today's Daily for a Track, and where one Player stands on it. */
export type Board = {
  day: WordlexDay;
  status: (typeof gameStatus.enumValues)[number];
  guesses: { word: string; marks: Mark[] }[];
  /** The Answer, which never reaches the browser until the Game is over. */
  answer?: string;
};

export type Daily = {
  id: string;
  day: WordlexDay;
  language: Language;
  length: Length;
  /** The folded key, which is what `score` compares against. */
  word: string;
};

/**
 * ADR 0019's read path: issue today's Daily if it somehow has none, then read
 * it. The insert is a no-op while the seven-day buffer is healthy; if every
 * rollover has failed for a week, the first Player to arrive creates the row and
 * never knows.
 *
 * The day comes from `wordlex_day()` on both halves rather than from here, so
 * the two cannot disagree about the 00:00 WIB boundary.
 *
 * Undefined means the Track has no Answer Pool at all — a broken seed, not an
 * ordinary "no Daily today", because a used-up Rotation simply starts the next.
 */
export async function todaysDaily(
  tx: Transaction,
  language: Language,
  length: Length,
): Promise<Daily | undefined> {
  await tx.execute(sql`select * from wordlex_issue_daily(${language}, ${length}, wordlex_day())`);
  const [today] = await tx
    .select({
      id: daily.id,
      day: daily.day,
      language: daily.language,
      length: daily.length,
      word: daily.word,
    })
    .from(daily)
    .where(
      and(
        eq(daily.language, language),
        eq(daily.length, length),
        sql`${daily.day} = wordlex_day()`,
      ),
    )
    .limit(1);
  return today;
}

/**
 * The board a Player sees. Marks are scored on the way out rather than stored,
 * following ADR 0008.
 *
 * No Game means this browser has not started this Track today, which reads as
 * `playing` with no Guesses — the honest state for "press Play and type". It is
 * what a visitor with no Game token gets (ADR 0022).
 */
export async function readBoard(
  tx: Transaction,
  today: Daily,
  current: { id: string; status: Board["status"] } | undefined,
): Promise<Board> {
  const played = current
    ? await tx
        .select({ word: guess.word })
        .from(guess)
        .where(eq(guess.gameId, current.id))
        .orderBy(guess.position)
    : [];

  return {
    day: today.day,
    status: current?.status ?? "playing",
    guesses: played.map((it) => ({ word: it.word, marks: score(it.word, today.word) })),
    answer: current && current.status !== "playing" ? await revealAnswer(tx, today) : undefined,
  };
}

/**
 * The Answer as a Player should see it. ADR 0004 folds `é`, `ê` and `è` to `e`
 * because the keyboard is A-Z, and keeps the accented spelling for exactly this
 * moment — `daily.word` is the folded key that `score` needs, so the reveal
 * reads `display` instead.
 */
async function revealAnswer(tx: Transaction, today: Daily) {
  const [spelling] = await tx
    .select({ display: word.display })
    .from(word)
    .where(
      and(
        eq(word.language, today.language),
        eq(word.length, today.length),
        eq(word.word, today.word),
      ),
    )
    .limit(1);
  return spelling?.display ?? today.word;
}
