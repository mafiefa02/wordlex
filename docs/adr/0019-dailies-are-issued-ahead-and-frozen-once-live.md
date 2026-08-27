# Dailies are issued ahead of time and frozen once they are live

_Amended: an exhausted Answer Pool no longer leaves a Track with no Daily. The pool starts
again as the next Rotation, recorded on `daily.rotation`, so "no repeats until the pool is
genuinely exhausted" below now means no repeats within a Rotation. How often a word has come
up and which Rotations it appeared in are queries against that column, not stored counters._

A `daily` row holds the Answer for one `(language, length, day)`, unique on exactly that. A `pg_cron` job at 00:00 WIB tops the buffer back up to seven days ahead. Once a WordleX Day has started, its row can never be changed.

## Why the Answer is written down rather than computed

The stateless version is tempting: `pool[hash(track, day) % poolSize]`, no table, no writes. It breaks the moment ADR 0012 does its job. That ADR's whole plan is to remove words from an Answer Pool once play data condemns them — and removing one word shifts every index, so last Tuesday's Answer silently becomes a different word. Every Game already played would then be scored against a word its Player never saw. Solve Rate per Answer, "has anyone ever typed this word", shared grids: all quietly wrong, with nothing to signal it.

Materialising also pays for two things ADR 0005 asks for and could not otherwise have. Runway becomes one query — pool size minus distinct Answers used — which is the "somewhere we will actually look" that ADR named. And picking a word that is not already in this Track's history means no repeats until the pool is genuinely exhausted, rather than trusting a hash not to collide early.

## Why ahead of time, and why the read path still inserts

Filling at the moment of rollover would put the one window where the game is broken at 00:00 WIB, which is peak for three of the four languages. It would also turn a silent `pg_cron` failure into an outage across all twelve Tracks, discoverable only in `cron.job_run_details`, which nobody reads at midnight.

So each run tops a seven-day buffer rather than issuing tomorrow. That is idempotent: miss three runs and the next one catches up on its own, with no separate "am I nearly empty" check to write or get wrong.

The read path still does `INSERT … ON CONFLICT DO NOTHING RETURNING` before reading. If the buffer is healthy the insert is a no-op costing nothing; if every run has failed for a week, the first Player creates the row and never knows. Ten lines that remove the last failure mode. The play app keeps a visible fallback for the case where even that fails, but it is an error state, not a rollover state, and should say so.

Both paths call one SQL function so there is a single definition of how a word is chosen.

## Frozen, enforced by trigger

A `BEFORE UPDATE OR DELETE` trigger on `daily` raises whenever `OLD.day <= wordlex_day()`. Convention would not hold here — the people most likely to break it are us at 1am with `psql` open, and a `pg_cron` job written next year by someone who did not read this. Rows for future days stay freely editable, which is where ADR 0012's word removal acts; when it condemns an already-scheduled word, the row is deleted and the next run refills the hole.

The cost is real: there is no emergency fix for a genuinely awful Answer once its day has started. That is a bad day we ride out, and we prefer it to an Answer that can change under a Player mid-game.

## `wordlex_day()`, and the exception it makes to ADR 0015

The cron job, the trigger, and the sweep below all need to know when a WordleX Day begins. ADR 0015 says that maths must exist in exactly one place, `packages/domain/src/day.ts`, and calls a second disagreeing copy "a correctness bug, not a style problem".

This is a second copy, and it is deliberate. It is one SQL function created in the first migration, called by everything in the database that needs it, with a comment pointing at the TypeScript. WIB has no daylight saving and Postgres carries the real timezone database, so the two cannot drift on the thing ADR 0015 was worried about — but the function is not covered by the tests `day.ts` has, and that is the accepted cost. One copy in SQL, not one per caller. It must be declared `STABLE`, never `IMMUTABLE`, or Postgres is free to fold today's date into the trigger's cached plan and freeze the boundary where it was when the plan was built.

## Abandoned Games

The same job sweeps Games still marked `playing` whose Daily has passed, and marks them `abandoned`, so no stale row outlives its day. Abandoned is kept distinct from a loss on purpose: ADR 0012's Solve Rate is the share of Games that were *won*, and someone who walked away after one Guess is much weaker evidence than someone who burned every Guess. Storing them separately leaves that denominator open to decide later. Neither affects Streaks, which `CONTEXT.md` defines by days played.
