# Badges reward breadth and persistence, not speed or skill

_Amended: the twelve Badges now exist. Their ids and the predicates that earn them are in
`apps/api/src/badges.ts`, their copy is rows written by a migration, and a test checks the two
lists have not drifted. Every predicate is re-asked over the Player's whole history, so a
Badge added later still awards retroactively.

Superseding the note below about the ledger being written "when a Game finishes": it is
written at the **two** moments the earned set can change, which are a Game ending and a
Game's *first* Guess. The second is there because by ADR 0026 a Game counts as played only
once it has a Guess, and the four Badges about breadth ask exactly that — without it, four
Play presses and no words would earn "Four Languages"._

_Decided during the design session; written up afterwards, which is why the ADR that depends on it (0010) is numbered before it._

_Amended: Badges are derived from Game rows as described, but a small `badge_award` ledger is
written when a Game finishes so the play app can show a "you just earned this" toast — nothing
otherwise knows the set changed between two page loads. The ledger is a cache of the derived
set, not the source of truth, so a Badge added later still awards retroactively. Separately,
`guess` does carry a timestamp after all; "adds no tracking" below is no longer literally true,
and the defence is the one this ADR already makes — no Badge rewards speed, so the column is
inert._

Badges are earned for showing up and for reaching across languages: run-lengths, "played all four languages in one day", "a week of Javanese", "first Sundanese win". Not for solving fast, and not for win-rate ladders per language.

Two alternatives were rejected.

**Speed** would need the server to timestamp the start of a Game and every Guess, and it would put a clock in the UI. Rushing is the opposite of the unhurried thing this game is, and since ADR 0003 makes every Guess a round trip, a player's network latency would count against their time.

**Per-language mastery ladders** keyed on win-rate would need per-language rolling stats and thresholds tuned before we have a single player to tune against. Worse, a win-rate ladder quietly punishes someone for trying a language they are bad at — which is the exact behaviour WordleX exists to encourage.

Everything in the chosen set is computable from Game rows we already store, so this adds no tracking. It also fixes what "playtime" means: days played and Games played, not a stopwatch.

One non-obvious consequence, spelled out in ADR 0010: because no Badge rewards a low Guess count, there is nothing to gain from playing a Daily anonymously to learn the Answer before playing it properly. Adding a "solved in two" Badge later would create that incentive where none exists today.
