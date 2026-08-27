import { wordlexDay } from "@wordlex/domain";
import { describe, expect, it } from "vitest";
import { db, game } from "../src/db";
import { browser } from "./helpers";

describe("the server", () => {
  it("answers /health with the WordleX Day", async () => {
    const response = await browser().get("/health");
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, day: wordlexDay() });
  });

  it("tells every cache to keep nothing", async () => {
    const response = await browser().get("/daily/en/5");
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });
});

describe("the Origin check", () => {
  it("refuses a write with no Origin, and starts nothing", async () => {
    const response = await browser().post("/game", { language: "en", length: 5 }, {});
    expect(response.statusCode).toBe(403);
    expect(await db.select().from(game)).toHaveLength(0);
  });

  it("refuses a write from an Origin that is not allowlisted", async () => {
    const response = await browser().post(
      "/game",
      { language: "en", length: 5 },
      { origin: "https://evil.example" },
    );
    expect(response.statusCode).toBe(403);
  });

  it("leaves a Game already in play alone, which is what it is for", async () => {
    const player = browser();
    await player.post("/game", { language: "en", length: 5 });
    const token = player.cookies.wordlex_game_en_5;

    // The attack the guard exists to stop: a cross-site POST to /game would
    // start a second Game and overwrite the token, discarding the first
    // (ADRs 0021, 0022).
    const response = await player.post(
      "/game",
      { language: "en", length: 5 },
      { origin: "https://evil.example" },
    );

    expect(response.statusCode).toBe(403);
    expect(await db.select().from(game)).toHaveLength(1);
    expect(player.cookies.wordlex_game_en_5).toBe(token);
  });

  it("lets a read through without one, since a read carries no Answer", async () => {
    const response = await browser().get("/daily/en/5");
    expect(response.statusCode).toBe(200);
  });
});
