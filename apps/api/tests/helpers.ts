import type { Language, Length } from "@wordlex/domain";
import { sql } from "drizzle-orm";
import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { buildApp } from "../src/app";
import { db, word } from "../src/db";
import { ORIGIN } from "./config";

/**
 * The API under test, driven through `app.inject()` rather than a port. One
 * instance for the whole run: it holds no state of its own, and everything a
 * test needs to vary lives in the database or in a cookie.
 */
export const api = await buildApp({ logger: false });

type Seed = {
  language: Language;
  length: Length;
  word: string;
  display: string;
  /** In this Track's Answer Pool. Exactly one word per Track is. */
  pool?: true;
};

/**
 * A dictionary small enough to reason about. Each Track's Answer Pool holds
 * exactly one word, so `wordlex_issue_daily`'s `random()` has nothing to choose
 * between and today's Answer is known before the test starts.
 *
 * `id`-6 is deliberately absent: a Track with no Answer Pool at all is the one
 * case that gets no Daily, and the routes answer it with a 503.
 */
const WORDS: Seed[] = [
  { language: "en", length: 5, word: "steal", display: "steal", pool: true },
  { language: "en", length: 5, word: "creak", display: "creak" },
  { language: "en", length: 5, word: "sells", display: "sells" },
  { language: "en", length: 5, word: "sassy", display: "sassy" },
  { language: "en", length: 5, word: "beast", display: "beast" },
  { language: "en", length: 5, word: "humid", display: "humid" },
  { language: "en", length: 5, word: "seven", display: "seven" },
  // Folded key against accented spelling, which is what the reveal reads
  // instead of the key (ADR 0004).
  { language: "su", length: 5, word: "maneh", display: "manéh", pool: true },
  { language: "jv", length: 7, word: "makanan", display: "makanan", pool: true },
  { language: "jv", length: 7, word: "kawanan", display: "kawanan" },
];

/** Today's Answer for a Track, which the one-word Answer Pool above fixes. */
export const ANSWER = { en5: "steal", su5: "maneh", jv7: "makanan" } as const;

/** Six wrong Guesses: the budget for a 5-Tile Track is exactly that. */
export const WRONG_EN5 = ["creak", "sells", "sassy", "beast", "humid", "seven"];

/**
 * Empties every table a test writes to and puts the dictionary back. Runs before
 * each test (see `tests/setup.ts`), so a test never inherits another's Games or
 * a word another test rejected.
 */
export async function resetDatabase() {
  await db.execute(
    sql`truncate table word, daily, game, guess, unknown_word_attempt, badge_award, player cascade`,
  );
  await db.insert(word).values(
    WORDS.map((row) => ({
      language: row.language,
      length: row.length,
      word: row.word,
      display: row.display,
      inAnswerPool: row.pool ?? false,
    })),
  );
}

/**
 * One browser talking to the API: it keeps the Game tokens the API sets and
 * sends them back on the next call, which is the whole of what makes a Game
 * resumable (ADR 0022). Two browsers are two of these.
 *
 * POSTs carry the allowlisted `Origin` by default, since the server refuses
 * writes without one.
 */
export function browser() {
  const cookies: Record<string, string> = {};

  const send = async (options: InjectOptions) => {
    const response = await api.inject({ ...options, cookies });
    for (const set of response.cookies) cookies[set.name] = String(set.value);
    return response;
  };

  return {
    cookies,
    get: (url: string) => send({ method: "GET", url }),
    post: (url: string, payload: Payload, headers: Record<string, string> = { origin: ORIGIN }) =>
      send({ method: "POST", url, payload, headers }),
  };
}

/** What `app.inject()` will take as a body. */
type Payload = NonNullable<InjectOptions["payload"]>;

/** The board every response carries, once the response is known to be a 200. */
export const board = (response: LightMyRequestResponse) => JSON.parse(response.body).game;
