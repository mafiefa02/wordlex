import type { Mark } from "./mark";

/**
 * Scores one Guess against the Answer, one Mark per Tile.
 *
 * Both words are the normalised form the Dictionary is keyed by — lowercased,
 * diacritics folded, `a-z` only — and one Latin character is one Tile (ADR 0002),
 * so comparing them character by character is comparing them Tile by Tile.
 *
 * Exact matches are assigned first and *consume* the Answer letter they matched;
 * only what is left over can make a Tile `present`. That ordering is the whole
 * subtlety: guessing `sells` against `steal` scores exact, present, present,
 * absent, absent, because the Answer's only `l` and only `s` are already spoken
 * for by the time the repeats are looked at.
 */
export function score(guess: string, answer: string): Mark[] {
  const guessTiles = [...guess];
  const answerTiles = [...answer];
  const marks: Mark[] = guessTiles.map(() => "absent");

  // What the Answer still has to offer after every exact match has taken its own.
  const unspoken = new Map<string, number>();
  answerTiles.forEach((tile, i) => {
    if (guessTiles[i] === tile) marks[i] = "exact";
    else unspoken.set(tile, (unspoken.get(tile) ?? 0) + 1);
  });

  guessTiles.forEach((tile, i) => {
    if (marks[i] === "exact") return;
    const left = unspoken.get(tile) ?? 0;
    if (left === 0) return;
    marks[i] = "present";
    unspoken.set(tile, left - 1);
  });

  return marks;
}
