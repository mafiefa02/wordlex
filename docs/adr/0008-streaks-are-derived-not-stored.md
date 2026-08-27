# Streaks are derived from Game history, never stored as a counter

There is no `current_streak` column. A Streak is computed from Game rows, each of which records the Player, the Track, the WordleX Day and whether they won.

We do not yet know what a Streak should mean: one number across all twelve Tracks or one per language, and whether a loss breaks it or only absence does. Both readings are defensible and the decision is deferred until there is a reason to prefer one. Storing history rather than a counter means we can answer either question later — including retroactively, for players who were already playing.

The obvious optimisation is to maintain the counter on write. We are declining it. A Player produces at most twelve Game rows per day, so deriving a Streak is a cheap scan over a small, well-indexed set, and a stored counter would lock in a definition we have not made yet — and would be wrong for every historical player the day we changed our minds.
