import { describe, expect, it } from "vitest";
import { streak } from "./streak";

const TODAY = "2026-08-27";

describe("streak", () => {
  it("is zero for a Player who has never done it", () => {
    expect(streak([], TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it("counts a run ending today", () => {
    const days = ["2026-08-25", "2026-08-26", "2026-08-27"];
    expect(streak(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it("keeps a run alive that ended yesterday, since today is not over", () => {
    expect(streak(["2026-08-25", "2026-08-26"], TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it("breaks a run that skipped the day before yesterday", () => {
    const days = ["2026-08-20", "2026-08-21", "2026-08-22"];
    expect(streak(days, TODAY)).toEqual({ current: 0, longest: 3 });
  });

  it("remembers the longest run after the current one has broken", () => {
    const days = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-27"];
    expect(streak(days, TODAY)).toEqual({ current: 1, longest: 4 });
  });

  it("counts a repeated day once", () => {
    expect(streak(["2026-08-27", "2026-08-27"], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it("crosses a month boundary", () => {
    expect(streak(["2026-07-31", "2026-08-01"], "2026-08-01")).toEqual({ current: 2, longest: 2 });
  });
});
