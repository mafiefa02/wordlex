import { randomUUID } from "node:crypto";
import { previousDay, wordlexDay } from "@wordlex/domain";
import { count, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { daily, db, game, player } from "../src/db";
import { claimTodaysGames } from "../src/player";
import { ANSWER, browser } from "./helpers";

const EN5 = { language: "en", length: 5 } as const;

describe("signing in", () => {
  it("mints a Player and answers GET /me as them", async () => {
    const me = browser();
    expect((await me.get("/me")).statusCode).toBe(401);

    const { email } = await me.signIn();

    const response = await me.get("/me");
    expect(response.statusCode).toBe(200);
    const profile = JSON.parse(response.body).data;
    expect(profile.account.email).toBe(email);
    expect(profile.player.id).toEqual(expect.any(String));
  });

  it("carries over the Game this browser played today", async () => {
    const me = browser();
    await me.post("/game", EN5);
    await me.post("/guess", { ...EN5, word: "creak" });

    await me.signIn();

    const history = JSON.parse((await me.get("/me/history")).body).data;
    expect(history.days).toEqual([{ day: wordlexDay(), counts: { en: 1 } }]);
  });

  it("keeps the Account's own Game when both have played the same Daily", async () => {
    const laptop = browser();
    const { email } = await laptop.signIn();
    await laptop.post("/game", EN5);
    await laptop.post("/guess", { ...EN5, word: "creak" });

    const phone = browser();
    await phone.post("/game", EN5);
    await phone.post("/guess", { ...EN5, word: "sells" });
    await phone.signIn(email);

    // One Game on that Daily, not two, and the phone's is still nobody's.
    const history = JSON.parse((await phone.get("/me/history")).body).data;
    expect(history.days).toEqual([{ day: wordlexDay(), counts: { en: 1 } }]);
    const [anonymous] = await db.select({ left: count() }).from(game).where(isNull(game.playerId));
    expect(anonymous?.left).toBe(1);

    // And it is the laptop's Guess that survived, not the phone's.
    const board = JSON.parse((await laptop.get("/daily/en/5")).body).data.game;
    expect(board.guesses.map((played: { word: string }) => played.word)).toEqual(["creak"]);
  });

  it("carries nothing over for a browser that has not played", async () => {
    const me = browser();
    await me.signIn();
    expect(JSON.parse((await me.get("/me/history")).body).data.days).toEqual([]);
  });

  it("leaves yesterday's Game alone", async () => {
    const [yesterday] = await db
      .insert(daily)
      .values({ ...EN5, day: previousDay(wordlexDay()), word: ANSWER.en5 })
      .returning({ id: daily.id });
    const [stale] = await db
      .insert(game)
      .values({ dailyId: yesterday!.id, idempotencyKey: randomUUID() })
      .returning({ id: game.id });
    const [mine] = await db.insert(player).values({}).returning({ id: player.id });

    expect(await claimTodaysGames(db, mine!.id, [stale!.id])).toEqual([]);
    const [after] = await db
      .select({ playerId: game.playerId })
      .from(game)
      .where(eq(game.id, stale!.id));
    expect(after?.playerId).toBeNull();
  });
});
