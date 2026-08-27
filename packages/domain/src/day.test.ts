import { describe, expect, it } from "vitest";
import { dayEndsAt, dayStartsAt, wordlexDay } from "./day";

describe("wordlexDay", () => {
  it("rolls over at 17:00 UTC, not at UTC midnight", () => {
    expect(wordlexDay(new Date("2026-08-27T16:59:59Z"))).toBe("2026-08-27");
    expect(wordlexDay(new Date("2026-08-27T17:00:00Z"))).toBe("2026-08-28");
  });

  it("gives one instant one day, wherever the reader is", () => {
    // 8pm in London, 3am the next morning in Jakarta. One Daily, not two.
    expect(wordlexDay(new Date("2026-08-27T20:00:00Z"))).toBe("2026-08-28");
  });

  it("round-trips through the start and end of a day", () => {
    const day = "2026-03-01";
    expect(wordlexDay(dayStartsAt(day))).toBe(day);
    expect(wordlexDay(new Date(dayEndsAt(day).getTime() - 1))).toBe(day);
    expect(wordlexDay(dayEndsAt(day))).toBe("2026-03-02");
  });
});
