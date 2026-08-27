import { describe, expect, it } from "vitest";
import { db, game } from "../src/db";
import { randomUUID } from "node:crypto";
import { board, browser, failure, withKey } from "./helpers";

describe("POST /game", () => {
  it("starts an anonymous Game and hands back its token", async () => {
    const player = browser();
    const response = await player.post("/game", { language: "en", length: 5 });

    expect(response.statusCode).toBe(200);
    expect(board(response)).toMatchObject({ status: "playing", guesses: [] });
    // The Answer is never in a board while the Game is still playing.
    expect(board(response).answer).toBeUndefined();
    expect(player.cookies.wordlex_game_en_5).toBeDefined();

    const rows = await db.select().from(game);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.playerId).toBeNull();
  });

  it("resumes the Game the token names rather than starting a second", async () => {
    const player = browser();
    await player.post("/game", { language: "en", length: 5 });
    await player.post("/guess", { language: "en", length: 5, word: "creak" });
    const again = await player.post("/game", { language: "en", length: 5 });

    expect(await db.select().from(game)).toHaveLength(1);
    expect(board(again).guesses).toHaveLength(1);
  });

  it("gives a second browser its own Game", async () => {
    await browser().post("/game", { language: "en", length: 5 });
    await browser().post("/game", { language: "en", length: 5 });
    expect(await db.select().from(game)).toHaveLength(2);
  });

  it("refuses a start with no Idempotency-Key", async () => {
    const response = await browser().post(
      "/game",
      { language: "en", length: 5 },
      { origin: "http://localhost:3001" },
    );

    expect(response.statusCode).toBe(400);
    expect(failure(response).code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(await db.select().from(game)).toHaveLength(0);
  });

  // The race ADR 0022 could only ask the client to avoid: neither request holds
  // the cookie the other is about to set, so the key is the only thing joining
  // them, and the unique constraint is what picks the winner.
  it("makes one Game of two starts racing under the same key", async () => {
    const key = randomUUID();
    const [first, second] = await Promise.all([
      browser().post("/game", { language: "en", length: 5 }, withKey(key)),
      browser().post("/game", { language: "en", length: 5 }, withKey(key)),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(await db.select().from(game)).toHaveLength(1);
  });

  // A browser that never received the first response has no token, so the key is
  // all that is left to recognise the retry by. Which means the key *is* the
  // credential: whoever holds it gets the Game. Hence the uuid requirement, and
  // the two tests under this one.
  it("hands the Game back to whoever presents the key, having only that to go on", async () => {
    const key = randomUUID();
    await browser().post("/game", { language: "en", length: 5 }, withKey(key));
    // A second browser stands in for the same one having dropped the response.
    const retry = await browser().post("/game", { language: "en", length: 5 }, withKey(key));

    expect(retry.statusCode).toBe(200);
    expect(board(retry)).toMatchObject({ status: "playing", guesses: [] });
    expect(await db.select().from(game)).toHaveLength(1);
  });

  it("refuses a key that is not a uuid, since a readable one is guessable", async () => {
    const response = await browser().post(
      "/game",
      { language: "en", length: 5 },
      withKey("start:en:5"),
    );

    expect(response.statusCode).toBe(400);
    expect(failure(response).code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(await db.select().from(game)).toHaveLength(0);
  });

  // Handing back a Game hands back its token, so a key that leaks or is shared
  // would otherwise be a Game anyone can take over. A real retry has played
  // nothing — it never had the token a Guess needs — so Guesses mean this is
  // somebody's Game and not the lost response it claims to be.
  it("refuses a key naming a Game that someone is already playing", async () => {
    const key = randomUUID();
    const playing = browser();
    await playing.post("/game", { language: "en", length: 5 }, withKey(key));
    await playing.post("/guess", { language: "en", length: 5, word: "creak" });

    const other = browser();
    const response = await other.post("/game", { language: "en", length: 5 }, withKey(key));

    expect(response.statusCode).toBe(422);
    expect(failure(response).code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(other.cookies.wordlex_game_en_5).toBeUndefined();
    expect(await db.select().from(game)).toHaveLength(1);
  });

  it("gives a different key its own Game, since that is a different press", async () => {
    await browser().post("/game", { language: "en", length: 5 }, withKey(randomUUID()));
    await browser().post("/game", { language: "en", length: 5 }, withKey(randomUUID()));
    expect(await db.select().from(game)).toHaveLength(2);
  });

  it("refuses a Track that does not exist", async () => {
    const response = await browser().post("/game", { language: "en", length: 4 });
    expect(response.statusCode).toBe(400);
    expect(failure(response).code).toBe("VALIDATION_ERROR");
  });

  it("says so when a Track has no Answer Pool", async () => {
    const response = await browser().post("/game", { language: "id", length: 6 });
    expect(response.statusCode).toBe(503);
    expect(failure(response).code).toBe("TRACK_UNAVAILABLE");
    expect(await db.select().from(game)).toHaveLength(0);
  });
});
