import type { Language, Length } from "@wordlex/domain";
import { wordlexDay } from "@wordlex/domain";
import { describe, expect, it } from "vitest";
import { BADGES } from "../src/badges";
import { badge, db } from "../src/db";
import { ANSWER, browser } from "./helpers";

const EN5 = { language: "en", length: 5 } as const;

/** Signs in, plays today's English-5 Daily and wins it. */
async function winToday() {
  const me = browser();
  await me.signIn();
  await me.post("/game", EN5);
  const won = await me.post("/guess", { ...EN5, word: ANSWER.en5 });
  return { me, won: JSON.parse(won.body).data };
}

describe("a Player's own history", () => {
  it("counts a Streak of one from today's win", async () => {
    const { me } = await winToday();
    const profile = JSON.parse((await me.get("/me")).body).data;
    expect(profile.streak).toEqual({ current: 1, longest: 1 });
  });

  it("has no Streak from a Game that was lost", async () => {
    const me = browser();
    await me.signIn();
    await me.post("/game", EN5);
    await me.post("/guess", { ...EN5, word: "creak" });

    expect(JSON.parse((await me.get("/me")).body).data.streak).toEqual({ current: 0, longest: 0 });
  });

  it("does not count a day where Play was pressed and nothing typed", async () => {
    const me = browser();
    await me.signIn();
    await me.post("/game", EN5);

    expect(JSON.parse((await me.get("/me/history")).body).data.days).toEqual([]);
  });

  it("counts one day per language played", async () => {
    const me = browser();
    await me.signIn();
    await me.post("/game", EN5);
    await me.post("/guess", { ...EN5, word: "creak" });
    await me.post("/game", { language: "su", length: 5 });
    await me.post("/guess", { language: "su", length: 5, word: ANSWER.su5 });

    const history = JSON.parse((await me.get("/me/history")).body).data;
    expect(history.days).toEqual([{ day: wordlexDay(), counts: { en: 1, su: 1 } }]);
  });

  it("refuses every route to anyone who is not signed in", async () => {
    const nobody = browser();
    const refused = await Promise.all(["/me", "/me/history"].map((url) => nobody.get(url)));
    for (const response of refused) {
      expect(JSON.parse(response.body).error.code).toBe("NOT_SIGNED_IN");
    }
    expect(JSON.parse((await nobody.post("/me/badges/seen", {})).body).error.code).toBe(
      "NOT_SIGNED_IN",
    );
  });
});

describe("badges", () => {
  it("awards them on the Guess that ends the Game", async () => {
    const { won } = await winToday();
    expect(won.game.status).toBe("won");
    expect(won.badges.map((earned: { id: string }) => earned.id)).toEqual([
      "first-win",
      "first-win-en",
    ]);
    expect(won.badges[0]).toEqual({
      id: "first-win",
      name: expect.any(String),
      description: expect.any(String),
    });
  });

  it("awards nothing to an anonymous Player", async () => {
    const me = browser();
    await me.post("/game", EN5);
    const won = JSON.parse((await me.post("/guess", { ...EN5, word: ANSWER.en5 })).body).data;
    expect(won.game.status).toBe("won");
    expect(won.badges).toBeUndefined();
  });

  it("shows them in the profile, unseen until they have been shown", async () => {
    const { me } = await winToday();

    const before = JSON.parse((await me.get("/me")).body).data.badges;
    expect(before.map((earned: { id: string }) => earned.id)).toEqual([
      "first-win",
      "first-win-en",
    ]);
    expect(before.every((earned: { seenAt: string | null }) => earned.seenAt === null)).toBe(true);

    expect(JSON.parse((await me.post("/me/badges/seen", {})).body).data).toEqual({ seen: 2 });

    const after = JSON.parse((await me.get("/me")).body).data.badges;
    expect(after.every((earned: { seenAt: string | null }) => earned.seenAt !== null)).toBe(true);
    // Nothing left to mark, and saying so twice is not an error.
    expect(JSON.parse((await me.post("/me/badges/seen", {})).body).data).toEqual({ seen: 0 });
  });

  it("awards one about playing without waiting for a Game to end", async () => {
    const me = browser();
    await me.signIn();

    /** Starts a Track and spends one Guess on it, without finishing it. */
    const play = async (language: Language, length: Length, word: string) => {
      await me.post("/game", { language, length });
      const played = JSON.parse((await me.post("/guess", { language, length, word })).body).data;
      expect(played.game.status).toBe("playing");
      return (played.badges ?? []).map((earned: { id: string }) => earned.id);
    };

    const english = await play("en", 5, "creak");
    const indonesian = await play("id", 5, "minum");
    const sundanese = await play("su", 5, "manuk");
    const javanese = await play("jv", 7, "kawanan");

    expect([english, indonesian, sundanese]).toEqual([[], [], []]);
    expect(javanese).toEqual(["all-four-in-a-day"]);
  });

  it("has a row for every Badge the code can award, and no others", async () => {
    const defined = await db.select({ id: badge.id }).from(badge);
    expect(new Set(defined.map((row) => row.id))).toEqual(new Set(Object.keys(BADGES)));
  });
});
