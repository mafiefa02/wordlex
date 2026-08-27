import { describe, expect, it } from "vitest";
import { db, game } from "../src/db";
import { board, browser } from "./helpers";

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

  it("refuses a Track that does not exist", async () => {
    const response = await browser().post("/game", { language: "en", length: 4 });
    expect(response.statusCode).toBe(400);
  });

  it("says so when a Track has no Answer Pool", async () => {
    const response = await browser().post("/game", { language: "id", length: 6 });
    expect(response.statusCode).toBe(503);
    expect(await db.select().from(game)).toHaveLength(0);
  });
});
