# Badges reward breadth and persistence, not speed or skill

_Decided during the design session; written up afterwards, which is why the ADR that depends on it (0010) is numbered before it._

Badges are earned for showing up and for reaching across languages: run-lengths, "played all four languages in one day", "a week of Javanese", "first Sundanese win". Not for solving fast, and not for win-rate ladders per language.

Two alternatives were rejected.

**Speed** would need the server to timestamp the start of a Game and every Guess, and it would put a clock in the UI. Rushing is the opposite of the unhurried thing this game is, and since ADR 0003 makes every Guess a round trip, a player's network latency would count against their time.

**Per-language mastery ladders** keyed on win-rate would need per-language rolling stats and thresholds tuned before we have a single player to tune against. Worse, a win-rate ladder quietly punishes someone for trying a language they are bad at — which is the exact behaviour WordleX exists to encourage.

Everything in the chosen set is computable from Game rows we already store, so this adds no tracking. It also fixes what "playtime" means: days played and Games played, not a stopwatch.

One non-obvious consequence, spelled out in ADR 0010: because no Badge rewards a low Guess count, there is nothing to gain from playing a Daily anonymously to learn the Answer before playing it properly. Adding a "solved in two" Badge later would create that incentive where none exists today.
