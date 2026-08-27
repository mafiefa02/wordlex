import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db";

// The two bits of ADR 0019 that live in SQL rather than in TypeScript, because
// neither a trigger nor pg_cron can call TypeScript. `wordlex_rollover()` is not
// here: it is a loop over the picker below on a schedule, and a test of it would
// mostly be a test of `now()`. Everything else about the Daily is covered
// through the routes.
const issue = (offset: number) =>
  db.execute(sql`select * from wordlex_issue_daily('en', 5, wordlex_day() + ${offset}::int)`);

/** Drizzle wraps the driver's error, so the trigger's own message is underneath. */
async function refusal(query: Promise<unknown>) {
  try {
    await query;
  } catch (error) {
    const { cause } = error as { cause?: { message?: string } };
    return cause?.message ?? String(error);
  }
  throw new Error("expected the database to refuse this");
}

describe("wordlex_issue_daily", () => {
  it("issues one Daily however many times it is called", async () => {
    await issue(0);
    await issue(0);
    const rows = await db.execute(sql`select word, rotation from daily where language = 'en'`);
    expect(rows).toHaveLength(1);
  });

  it("starts the next Rotation once the Answer Pool is used up", async () => {
    // The pool holds one word, so tomorrow cannot be on today's Rotation.
    await issue(0);
    await issue(1);
    const rows = await db.execute(
      sql`select rotation from daily where language = 'en' order by day`,
    );
    expect(rows.map((row) => row.rotation)).toEqual([1, 2]);
  });

  it("gives no Daily to a Track with no Answer Pool", async () => {
    await db.execute(sql`select * from wordlex_issue_daily('id', 6, wordlex_day())`);
    const rows = await db.execute(sql`select 1 from daily where language = 'id'`);
    expect(rows).toHaveLength(0);
  });
});

describe("the freeze trigger", () => {
  it("refuses to change a Daily whose day has started", async () => {
    await db.execute(sql`select * from wordlex_issue_daily('en', 5, wordlex_day())`);

    expect(
      await refusal(db.execute(sql`update daily set word = 'creak' where day = wordlex_day()`)),
    ).toMatch(/is live/);
    expect(await refusal(db.execute(sql`delete from daily where day = wordlex_day()`))).toMatch(
      /is live/,
    );
  });

  it("leaves a future Daily editable, which is where a bad Answer is removed", async () => {
    await db.execute(sql`select * from wordlex_issue_daily('en', 5, wordlex_day() + 1)`);
    await db.execute(sql`delete from daily where day = wordlex_day() + 1`);
    const rows = await db.execute(sql`select 1 from daily`);
    expect(rows).toHaveLength(0);
  });
});
