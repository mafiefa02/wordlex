import { nextDay, previousDay, type WordlexDay } from "./day";

/**
 * A run of consecutive WordleX Days on which something happened, counted two
 * ways: the run still going, and the longest there has ever been.
 *
 * What "something" is depends on who asks. The Streak a Player is shown counts
 * days they *won* on any Track (ADR 0026); the Badges that reward devotion count
 * days they played one language (ADR 0011). Neither is stored — both are this
 * function over rows that already exist (ADR 0008), which is what lets the rule
 * change later and apply retroactively.
 *
 * `current` allows the run to end yesterday as well as today, because a day is
 * not lost until it is over: someone who won yesterday and has not played yet
 * has a Streak at risk, not a Streak broken.
 */
export function streak(
  days: Iterable<WordlexDay>,
  today: WordlexDay,
): { current: number; longest: number } {
  const on = new Set(days);

  // Walk forward from each day that starts a run, so every run is measured once
  // and no ordering has to be imposed on the days first.
  let longest = 0;
  for (const day of on) {
    if (on.has(previousDay(day))) continue;
    let run = 0;
    let walk = day;
    while (on.has(walk)) {
      run += 1;
      walk = nextDay(walk);
    }
    if (run > longest) longest = run;
  }

  let current = 0;
  let counting = on.has(today) ? today : previousDay(today);
  while (on.has(counting)) {
    current += 1;
    counting = previousDay(counting);
  }

  return { current, longest };
}
