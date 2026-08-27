import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, game, guess, unknownWordAttempt, word } from "../src/db";
import { ANSWER, board, browser, failure, withKey, WRONG_EN5 } from "./helpers";

/** A browser part-way through today's English-5 Game. */
async function playing() {
  const player = browser();
  await player.post("/game", { language: "en", length: 5 });
  return player;
}

const submit = (player: ReturnType<typeof browser>, typed: string) =>
  player.post("/guess", { language: "en", length: 5, word: typed });

describe("POST /guess", () => {
  it("refuses without a Game token, and records nothing", async () => {
    const response = await submit(browser(), "creak");

    expect(response.statusCode).toBe(401);
    expect(failure(response).code).toBe("NO_GAME_TOKEN");
    expect(await db.select().from(game)).toHaveLength(0);
    expect(await db.select().from(guess)).toHaveLength(0);
  });

  it("refuses a token this browser was not given", async () => {
    const response = await browser().post(
      "/guess",
      { language: "en", length: 5, word: "creak" },
      { ...withKey(randomUUID()), cookie: `wordlex_game_en_5=${randomUUID()}` },
    );
    expect(response.statusCode).toBe(401);
  });

  it("refuses a token issued for another Track", async () => {
    const player = await playing();
    // The same signed value, presented under the Sundanese Track's cookie name.
    const response = await player.post(
      "/guess",
      { language: "su", length: 5, word: "maneh" },
      {
        ...withKey(randomUUID()),
        cookie: `wordlex_game_su_5=${player.cookies.wordlex_game_en_5}`,
      },
    );
    expect(response.statusCode).toBe(401);
  });

  it("stops a word that is the wrong shape before the Dictionary sees it", async () => {
    const player = await playing();

    const wrongLength = await submit(player, "abcd");
    expect(wrongLength.statusCode).toBe(400);
    expect(failure(wrongLength).code).toBe("MALFORMED_WORD");
    expect((await submit(player, "12345")).statusCode).toBe(400);
    // Nothing that fails this check is an Unknown Word (ADR 0009).
    expect(await db.select().from(unknownWordAttempt)).toHaveLength(0);
  });

  it("scores a Guess the Dictionary has", async () => {
    const player = await playing();
    const response = await submit(player, "creak");

    expect(JSON.parse(response.body).data.outcome).toBe("scored");
    expect(board(response).guesses).toEqual([
      { word: "creak", marks: ["absent", "absent", "exact", "exact", "absent"] },
    ]);
    const rows = await db.select().from(guess);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.position).toBe(1);
  });

  it("folds accents the way the Dictionary was folded", async () => {
    const player = browser();
    await player.post("/game", { language: "su", length: 5 });
    const response = await player.post("/guess", { language: "su", length: 5, word: "MANÉH" });

    expect(JSON.parse(response.body).data.outcome).toBe("scored");
    expect(board(response).status).toBe("won");
  });

  it("reveals the Answer as it is spelled, once the Game is over", async () => {
    const player = browser();
    await player.post("/game", { language: "su", length: 5 });
    const response = await player.post("/guess", { language: "su", length: 5, word: "maneh" });

    expect(board(response).answer).toBe("manéh");
  });

  it("spends no row on an Unknown Word, and logs it once per Game", async () => {
    const player = await playing();
    const response = await submit(player, "zzzzz");

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.outcome).toBe("unknown_word");
    expect(board(response).guesses).toHaveLength(0);
    expect(await db.select().from(guess)).toHaveLength(0);

    const [logged] = await db.select().from(unknownWordAttempt);
    expect(logged).toMatchObject({ language: "en", length: 5, word: "zzzzz", playerId: null });
    expect(logged?.gameId).not.toBeNull();
  });

  it("counts the same Unknown Word from the same Game once", async () => {
    const player = await playing();
    await submit(player, "zzzzz");
    await submit(player, "zzzzz");
    expect(await db.select().from(unknownWordAttempt)).toHaveLength(1);
  });

  it("counts two different Unknown Words separately", async () => {
    const player = await playing();
    await submit(player, "zzzzz");
    await submit(player, "qqqqq");
    expect(await db.select().from(unknownWordAttempt)).toHaveLength(2);
  });

  it("takes the Answer even after a reviewer has rejected it", async () => {
    const player = await playing();
    // The Daily is frozen for the rest of the day (ADR 0019), so a Game against
    // a word that has just left the Dictionary has to stay winnable.
    await db
      .update(word)
      .set({ status: "rejected", inAnswerPool: false })
      .where(eq(word.word, ANSWER.en5));

    const response = await submit(player, ANSWER.en5);
    expect(board(response).status).toBe("won");
  });

  it("ends the Game as won and shows the Answer", async () => {
    const player = await playing();
    await submit(player, "creak");
    const response = await submit(player, ANSWER.en5);

    expect(board(response)).toMatchObject({ status: "won", answer: ANSWER.en5 });
    const [row] = await db.select().from(game);
    expect(row?.status).toBe("won");
  });

  it("ends the Game as lost once the budget is spent", async () => {
    const player = await playing();
    let last;
    // Six wrong Guesses: one more than the word is long. In order, and one at a
    // time, because each one takes the next row.
    // oxlint-disable-next-line no-await-in-loop
    for (const wrong of WRONG_EN5) last = await submit(player, wrong);

    expect(board(last!)).toMatchObject({ status: "lost", answer: ANSWER.en5 });
    expect(board(last!).guesses).toHaveLength(WRONG_EN5.length);
  });

  it("refuses a Guess against a Game that is over", async () => {
    const player = await playing();
    await submit(player, ANSWER.en5);
    const response = await submit(player, "creak");

    expect(response.statusCode).toBe(409);
    expect(failure(response).code).toBe("GAME_OVER");
    // The one failure that carries a board, so the client can render the
    // finished Game without asking again.
    expect(failure(response).details.game).toMatchObject({ status: "won", answer: ANSWER.en5 });
    expect(await db.select().from(guess)).toHaveLength(1);
  });

  it("plays a seven-Tile Track the same way, with a Guess more to spend", async () => {
    const player = browser();
    await player.post("/game", { language: "jv", length: 7 });

    const scored = await player.post("/guess", { language: "jv", length: 7, word: "kawanan" });
    expect(board(scored).guesses).toEqual([
      {
        word: "kawanan",
        marks: ["present", "exact", "absent", "exact", "exact", "exact", "exact"],
      },
    ]);

    const won = await player.post("/guess", { language: "jv", length: 7, word: ANSWER.jv7 });
    expect(board(won)).toMatchObject({ status: "won", answer: ANSWER.jv7 });
  });

  it("refuses a submission with no Idempotency-Key", async () => {
    const player = await playing();
    const response = await player.post(
      "/guess",
      { language: "en", length: 5, word: "creak" },
      { origin: "http://localhost:3001" },
    );

    expect(response.statusCode).toBe(400);
    expect(failure(response).code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(await db.select().from(guess)).toHaveLength(0);
  });

  it("spends one row when a submission is retried under the same key", async () => {
    const player = await playing();
    const key = randomUUID();
    const first = await player.post(
      "/guess",
      { language: "en", length: 5, word: "creak" },
      withKey(key),
    );
    const retry = await player.post(
      "/guess",
      { language: "en", length: 5, word: "creak" },
      withKey(key),
    );

    expect(retry.statusCode).toBe(200);
    expect(JSON.parse(retry.body).data.outcome).toBe("scored");
    expect(board(retry).guesses).toEqual(board(first).guesses);
    expect(await db.select().from(guess)).toHaveLength(1);
  });

  // The response a client most needs to recover, and the one an ordering mistake
  // loses: a retry lands on a Game that is no longer `playing`, so a status check
  // ahead of the key would answer it with GAME_OVER.
  it("replays the winning Guess rather than calling the Game over", async () => {
    const player = await playing();
    const key = randomUUID();
    await player.post("/guess", { language: "en", length: 5, word: ANSWER.en5 }, withKey(key));
    const retry = await player.post(
      "/guess",
      { language: "en", length: 5, word: ANSWER.en5 },
      withKey(key),
    );

    expect(retry.statusCode).toBe(200);
    expect(JSON.parse(retry.body).data.outcome).toBe("scored");
    expect(board(retry)).toMatchObject({ status: "won", answer: ANSWER.en5 });
    expect(await db.select().from(guess)).toHaveLength(1);
  });

  it("refuses a key that comes back naming a different word", async () => {
    const player = await playing();
    const key = randomUUID();
    await player.post("/guess", { language: "en", length: 5, word: "creak" }, withKey(key));
    const reused = await player.post(
      "/guess",
      { language: "en", length: 5, word: "sells" },
      withKey(key),
    );

    expect(reused.statusCode).toBe(422);
    expect(failure(reused).code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await db.select().from(guess)).toHaveLength(1);
  });

  // The reuse check sits ahead of the status check as well as ahead of the
  // scoring, so a client bug reads as a client bug whatever state the Game is in.
  it("refuses a reused key even once the Game is over", async () => {
    const player = await playing();
    const key = randomUUID();
    await player.post("/guess", { language: "en", length: 5, word: "creak" }, withKey(key));
    await player.post("/guess", { language: "en", length: 5, word: ANSWER.en5 });

    const reused = await player.post(
      "/guess",
      { language: "en", length: 5, word: "sells" },
      withKey(key),
    );

    expect(reused.statusCode).toBe(422);
    expect(failure(reused).code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("says so when a Track has no Answer Pool", async () => {
    const response = await browser().post("/guess", {
      language: "id",
      length: 6,
      word: "kucing",
    });
    expect(response.statusCode).toBe(503);
    expect(failure(response).code).toBe("TRACK_UNAVAILABLE");
  });
});
