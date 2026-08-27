import { wordlexDay } from "@wordlex/domain";
import { describe, expect, it } from "vitest";
import { daily, db, game } from "../src/db";
import { ANSWER, board, browser, failure } from "./helpers";

describe("GET /daily/:language/:length", () => {
  it("gives a visitor an empty board and starts nothing", async () => {
    const response = await browser().get("/daily/en/5");

    expect(response.statusCode).toBe(200);
    expect(board(response)).toMatchObject({ status: "playing", guesses: [] });
    expect(await db.select().from(game)).toHaveLength(0);
    // It does issue the Daily before reading it, which ADR 0019 asks of every
    // read path — that is a Daily, not a Game.
    expect(await db.select().from(daily)).toHaveLength(1);
  });

  it("shows the Guesses of the Game the token names", async () => {
    const player = browser();
    await player.post("/game", { language: "en", length: 5 });
    await player.post("/guess", { language: "en", length: 5, word: "creak" });

    const response = await player.get("/daily/en/5");
    expect(board(response).guesses).toEqual([
      { word: "creak", marks: ["absent", "absent", "exact", "exact", "absent"] },
    ]);
  });

  it("varies on the cookie as well as the Origin", async () => {
    const response = await browser().get("/daily/en/5");
    const vary = String(response.headers.vary);
    expect(vary).toContain("Origin");
    expect(vary).toContain("Cookie");
  });

  it("refuses a Track that does not exist", async () => {
    const response = await browser().get("/daily/en/4");
    expect(response.statusCode).toBe(400);
    expect(failure(response).code).toBe("VALIDATION_ERROR");
    expect((await browser().get("/daily/fr/5")).statusCode).toBe(400);
  });

  it("says so when a Track has no Answer Pool", async () => {
    const response = await browser().get("/daily/id/6");
    expect(response.statusCode).toBe(503);
    expect(failure(response).code).toBe("TRACK_UNAVAILABLE");
  });
});

/** The tile for one Track in the collection response. */
const tile = (response: { body: string }, language: string, length: number) =>
  JSON.parse(response.body).data.tracks.find(
    (track: { language: string; length: number }) =>
      track.language === language && track.length === length,
  );

describe("GET /daily", () => {
  const EN5 = { language: "en", length: 5 } as const;

  it("answers for all twelve Tracks, saying which have no Answer Pool", async () => {
    const response = await browser().get("/daily");

    expect(response.statusCode).toBe(200);
    const { day, tracks } = JSON.parse(response.body).data;
    expect(day).toBe(wordlexDay());
    expect(tracks).toHaveLength(12);

    // The fixture gives four Tracks an Answer Pool; the other eight have none.
    expect(tracks.filter((track: { available: boolean }) => track.available)).toHaveLength(4);
    expect(tile(response, "id", 6).available).toBe(false);
    expect(tile(response, "en", 5)).toEqual({
      language: "en",
      length: 5,
      available: true,
      status: "playing",
      guesses: 0,
    });
  });

  it("creates no Game, but does issue every Daily (ADR 0019)", async () => {
    await browser().get("/daily");
    expect(await db.select().from(game)).toHaveLength(0);
    expect(await db.select().from(daily)).toHaveLength(4);
  });

  it("counts the Guesses of an anonymous Player's own Games", async () => {
    const player = browser();
    await player.post("/game", EN5);
    await player.post("/guess", { ...EN5, word: "creak" });

    const response = await player.get("/daily");
    expect(tile(response, "en", 5)).toMatchObject({ status: "playing", guesses: 1 });
    expect(tile(response, "su", 5)).toMatchObject({ guesses: 0 });
  });

  it("finds a signed-in Player's Games on a device holding no token", async () => {
    const laptop = browser();
    const { email } = await laptop.signIn();
    await laptop.post("/game", EN5);
    await laptop.post("/guess", { ...EN5, word: ANSWER.en5 });

    const phone = browser();
    await phone.signIn(email);
    expect(tile(await phone.get("/daily"), "en", 5)).toMatchObject({
      status: "won",
      guesses: 1,
    });
  });

  it("shows a signed-out browser nothing, even holding the token", async () => {
    const owner = browser();
    await owner.signIn();
    await owner.post("/game", EN5);
    await owner.post("/guess", { ...EN5, word: "creak" });

    const after = browser();
    after.cookies.wordlex_game_en_5 = owner.cookies.wordlex_game_en_5!;
    expect(tile(await after.get("/daily"), "en", 5)).toMatchObject({
      status: "playing",
      guesses: 0,
    });
  });
});

describe("a signed-in Player on a second device", () => {
  const EN5 = { language: "en", length: 5 } as const;

  it("reads the board and can add to it without a token", async () => {
    const laptop = browser();
    const { email } = await laptop.signIn();
    await laptop.post("/game", EN5);
    await laptop.post("/guess", { ...EN5, word: "creak" });

    const phone = browser();
    await phone.signIn(email);

    // The board is theirs on sight...
    const seen = await phone.get("/daily/en/5");
    expect(board(seen).guesses.map((played: { word: string }) => played.word)).toEqual(["creak"]);

    // ...and a Guess lands on the same Game rather than being refused.
    const added = await phone.post("/guess", { ...EN5, word: "sells" });
    expect(added.statusCode).toBe(200);
    expect(board(added).guesses).toHaveLength(2);
    expect(await db.select().from(game)).toHaveLength(1);
  });
});
