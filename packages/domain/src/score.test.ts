import { describe, expect, it } from "vitest";
import { score } from "./score";

describe("score", () => {
  it("marks every Tile exact when the Guess is the Answer", () => {
    expect(score("steal", "steal")).toEqual(["exact", "exact", "exact", "exact", "exact"]);
  });

  it("marks every Tile absent when nothing is shared", () => {
    expect(score("humid", "creak")).toEqual(["absent", "absent", "absent", "absent", "absent"]);
  });

  it("only lets leftover Answer letters be present", () => {
    // The Answer's one `l` is spent by the first `l` in the Guess, and its one
    // `s` by the exact match at the front, so the repeats are absent.
    expect(score("sells", "steal")).toEqual(["exact", "present", "present", "absent", "absent"]);
  });

  it("lets an exact match take its letter from an earlier duplicate", () => {
    // The `s` at position 3 is exact and consumes the Answer's only `s`, so
    // neither `s` before it has anything left to be present against.
    expect(score("sassy", "beast")).toEqual(["absent", "present", "absent", "exact", "absent"]);
  });

  it("hands out one present per repeat the Answer actually has", () => {
    // Three `e` in the Answer: one exact, one present, and one still spare.
    expect(score("seven", "geese")).toEqual(["present", "exact", "absent", "present", "absent"]);
  });

  it("scores a seven-Tile Guess the same way", () => {
    expect(score("kawanan", "makanan")).toEqual([
      "present",
      "exact",
      "absent",
      "exact",
      "exact",
      "exact",
      "exact",
    ]);
  });
});
