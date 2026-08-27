import { describe, expect, it } from "vitest";
import { daily, db, game } from "../src/db";
import { board, browser } from "./helpers";

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
    expect((await browser().get("/daily/en/4")).statusCode).toBe(400);
    expect((await browser().get("/daily/fr/5")).statusCode).toBe(400);
  });

  it("says so when a Track has no Answer Pool", async () => {
    expect((await browser().get("/daily/id/6")).statusCode).toBe(503);
  });
});
