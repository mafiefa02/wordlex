# Open questions

Things deliberately left undecided, work that must happen before launch, and work we have consciously chosen to do after it. Decisions that *are* made live in `docs/adr/`; vocabulary lives in `CONTEXT.md`.

## Deferred by choice

**What a Difficulty is.** The word-length axis is settled (it is part of a Track). Difficulty is a separate axis and is still undefined. Three readings were on the table — a rules ladder applied to the same word, a smaller guess budget, or harder words drawn from a different slice of the pool. Only the third multiplies Answer Pool consumption, which matters because Sundanese 5-letter has under a year of runway.

**Whether an Abandoned Game counts against a word.** ADR 0012's Solve Rate is the share of Games *won*. Someone who walked away after one Guess is much weaker evidence about an Answer than someone who spent every Guess, so ADR 0019 stores Abandoned distinctly from a loss and leaves the denominator open. Streaks are unaffected — `CONTEXT.md` counts days played.

**What a Streak counts.** One number across all twelve Tracks, or one per language; and whether losing breaks it or only absence does. ADR 0008 keeps the data shaped so either can be derived later, including retroactively.

## Launch gates

**The word pipeline.** `scripts/build-words.mjs` has to come back (ADR 0018). It fetches ADR 0004's sources, applies the four mechanical filters ADR 0013 says actually ship, and writes the committed CSV that seeds the `word` table. Nothing is playable until it has run. It is recoverable from `ba775eb`, but it has never emitted rows, so the output shape is new work — and realistically this is the larger half of the remaining unknowns, not the schema.

Every word-*quality* step is still either mechanical or deferred — see ADR 0013's "What actually ships".

## Deliberately after launch

**Reviewing the Answer Pools.** All four languages, unreviewed at launch, cleaned from play data instead — ADR 0012 records the risk and the two signals we will use. The review files were generated once — 2,638 Indonesian words and 17 Sundanese/Javanese ones, in a delete-what-is-fine format — and then taken back out of the repo along with the script that builds them. Both are in commit `ba775eb` if the review ever happens, and the script refetches its sources from scratch.

**Profanity in Indonesian, Sundanese and Javanese.** No blocklist source exists for any of the three (ADR 0013). English is covered mechanically by LDNOOBW. This rides along with the pool review above.

**Reading the Candidate queue.** ADR 0009 records Unknown Words from day one. Reading them can wait for an admin UI; the data accumulates either way, and nothing is lost by looking late.

**Answer Pool runway.** ADR 0005 notes that pool depth is an operational concern. Sundanese 5-letter has roughly nine months, so there is time before anyone needs a way to see this.

## Assumptions worth revisiting

**Shareable result grids.** ADR 0005 cites comparable shared grids as a reason for the single global rollover. Sharing was never actually specified as a feature — it was assumed from Wordle. If sharing is dropped, the rollover decision still holds on its own: local-midnight rollover would have to trust the browser clock, which reopens the streak-faking hole that ADR 0003 exists to close.

**The landing page cannot promise instant play.** With Daily-only, a visitor who clicks "Play" gets exactly one game and then waits until tomorrow. The landing page has to sell the ritual rather than the immediacy.
