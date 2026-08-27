# Open questions

Things deliberately left undecided, work that must happen before launch, and work we have consciously chosen to do after it. Decisions that *are* made live in `docs/adr/`; vocabulary lives in `CONTEXT.md`.

## Deferred by choice

**What a Difficulty is.** The word-length axis is settled (it is part of a Track). Difficulty is a separate axis and is still undefined. Three readings were on the table — a rules ladder applied to the same word, a smaller guess budget, or harder words drawn from a different slice of the pool. Only the third multiplies Answer Pool consumption, which matters because Sundanese 5-letter has under a year of runway.

**Whether an Abandoned Game counts against a word.** ADR 0012's Solve Rate is the share of Games *won*. Someone who walked away after one Guess is much weaker evidence about an Answer than someone who spent every Guess, so ADR 0019 stores Abandoned distinctly from a loss and leaves the denominator open. Streaks are unaffected — `CONTEXT.md` counts days played.

**What a Streak counts.** One number across all twelve Tracks, or one per language; and whether losing breaks it or only absence does. ADR 0008 keeps the data shaped so either can be derived later, including retroactively.

## Launch gates

None left that are about words. `scripts/build-words.mjs` is back and `data/words.csv` is committed: 124,734 Dictionary rows across the twelve Tracks, of which 9,602 are answerable. Every pre-filter Answer Pool size reproduces ADR 0004's table exactly, and the Webster filter reproduces ADR 0013's. LDNOOBW drops 28 further English words, a number that ADR 0013 never published.

One measurement to keep in view: the filters leave Sundanese 5-letter with 272 answerable words, so that Track starts repeating after about nine months. ADR 0004's warning that Sundanese 5 is the one to watch survives the measurement; ADR 0013's aside that every Track keeps more than two years of runway does not. Nothing breaks — an exhausted pool starts again as the next Rotation (ADR 0019) — but see "Answer Pool runway" below.

Every word-*quality* step is still either mechanical or deferred — see ADR 0013's "What actually ships".

## Deliberately after launch

**Reviewing the Answer Pools.** All four languages, unreviewed at launch, cleaned from play data instead — ADR 0012 records the risk and the two signals we will use. The review files were generated once — 2,638 Indonesian words and 17 Sundanese/Javanese ones, in a delete-what-is-fine format — and then taken back out of the repo along with the script that builds them. Both are in commit `ba775eb` if the review ever happens, and the script refetches its sources from scratch.

**Profanity in Indonesian, Sundanese and Javanese.** No blocklist source exists for any of the three (ADR 0013). English is covered mechanically by LDNOOBW. This rides along with the pool review above.

**Reading the Candidate queue.** ADR 0009 records Unknown Words from day one. Reading them can wait for an admin UI; the data accumulates either way, and nothing is lost by looking late.

**Answer Pool runway.** ADR 0005 notes that pool depth is an operational concern. Sundanese 5-letter has roughly nine months, so there is time before anyone needs a way to see this.

## Assumptions worth revisiting

**Shareable result grids.** ADR 0005 cites comparable shared grids as a reason for the single global rollover. Sharing was never actually specified as a feature — it was assumed from Wordle. If sharing is dropped, the rollover decision still holds on its own: local-midnight rollover would have to trust the browser clock, which reopens the streak-faking hole that ADR 0003 exists to close.

**The landing page cannot promise instant play.** With Daily-only, a visitor who clicks "Play" gets exactly one game and then waits until tomorrow. The landing page has to sell the ritual rather than the immediacy.
