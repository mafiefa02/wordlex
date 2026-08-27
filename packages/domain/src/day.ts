/**
 * The WordleX Day: the 24 hours beginning at 00:00 WIB (UTC+7), the same
 * instant everywhere on Earth (ADR 0005). Written as `YYYY-MM-DD`, which is
 * the calendar date in Jakarta, not in the reader's timezone.
 *
 * WIB has no daylight saving and has not changed offset since 1964, so a fixed
 * offset is correct here and avoids pulling in a timezone database.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type WordlexDay = string;

/** The WordleX Day an instant falls in. Defaults to right now. */
export function wordlexDay(at: Date = new Date()): WordlexDay {
  return new Date(at.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant a WordleX Day begins — 00:00 WIB, as UTC. */
export function dayStartsAt(day: WordlexDay): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - WIB_OFFSET_MS);
}

/** The instant a WordleX Day rolls over into the next one. */
export function dayEndsAt(day: WordlexDay): Date {
  return new Date(dayStartsAt(day).getTime() + 24 * 60 * 60 * 1000);
}
