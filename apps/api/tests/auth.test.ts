import { randomUUID } from "node:crypto";
import { previousDay, wordlexDay } from "@wordlex/domain";
import { count, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { user } from "../src/db/auth-schema";
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

  it("stops the Game token working once nobody is signed in", async () => {
    const owner = browser();
    await owner.signIn();
    await owner.post("/game", EN5);
    await owner.post("/guess", { ...EN5, word: "creak" });

    // The same browser after signing out: the Game token is still in the jar.
    const after = browser();
    after.cookies.wordlex_game_en_5 = owner.cookies.wordlex_game_en_5!;

    const refused = await after.post("/guess", { ...EN5, word: "sells" });
    expect(refused.statusCode).toBe(401);
    expect(JSON.parse(refused.body).error.code).toBe("NO_GAME_TOKEN");

    // And the board reads as untouched rather than showing the Player's Guesses.
    const board = JSON.parse((await after.get("/daily/en/5")).body).data.game;
    expect(board.guesses).toEqual([]);

    // Pressing Play starts a fresh anonymous Game rather than taking that one.
    await after.post("/game", EN5);
    expect(await db.select().from(game)).toHaveLength(2);
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

describe("deleting an Account", () => {
  it("unlinks the Player and keeps everything they played", async () => {
    const me = browser();
    await me.signIn();
    await me.post("/game", EN5);
    await me.post("/guess", { ...EN5, word: "creak" });
    const { id: playerId } = JSON.parse((await me.get("/me")).body).data.player;

    const deleted = await me.post("/api/auth/delete-user", {});
    expect(deleted.statusCode).toBe(200);

    // The Account is gone, and so is the session it was holding.
    expect(await db.select().from(user)).toHaveLength(0);
    expect((await me.get("/me")).statusCode).toBe(401);

    // The Player survives, unlinked, with their Games (ADR 0020).
    const [unlinked] = await db.select().from(player).where(eq(player.id, playerId));
    expect(unlinked?.accountId).toBeNull();
    expect(await db.select().from(game).where(eq(game.playerId, playerId))).toHaveLength(1);
  });
});
