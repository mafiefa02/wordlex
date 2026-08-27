# Open questions

Things deliberately left undecided, work that must happen before launch, and work we have consciously chosen to do after it. Decisions that *are* made live in `docs/adr/`; vocabulary lives in `CONTEXT.md`.

## Deferred by choice

**Whether a Game with no Guesses counts as Abandoned.** ADR 0022 makes `POST /game` the
only thing that creates a Game, so pressing Play and walking away now leaves a row with zero
Guesses — as does the losing half of two racing Play presses. Those are swept to `abandoned`
at rollover alongside people who genuinely played and stopped, which is a much weaker thing.
Excluding zero-Guess Games is one query away; nothing decides it yet.

**What a Solve Rate is computed over, now that anonymous Games are cheap to make.** ADR 0022
does not make replay a click — the token is `httpOnly` and `POST /game` resumes a finished
Game — but clearing site data now costs a day rather than everything, and anything driving
its own cookie jar replays freely. ADR 0012's "share of Games that were won" therefore leans
on evidence that is easier to manufacture than it was. The flag to exclude anonymous Games
exists; which way the query goes, and what to do at launch when almost every Game is
anonymous, is not decided.

**What a Difficulty is.** The word-length axis is settled (it is part of a Track). Difficulty is a separate axis and is still undefined. Three readings were on the table — a rules ladder applied to the same word, a smaller guess budget, or harder words drawn from a different slice of the pool. Only the third multiplies Answer Pool consumption, which matters because Sundanese 5-letter has under a year of runway.

**Whether an Abandoned Game counts against a word.** ADR 0012's Solve Rate is the share of Games *won*. Someone who walked away after one Guess is much weaker evidence about an Answer than someone who spent every Guess, so ADR 0019 stores Abandoned distinctly from a loss and leaves the denominator open. Streaks are unaffected — `CONTEXT.md` counts days played.

**What a Streak counts.** One number across all twelve Tracks, or one per language; and whether losing breaks it or only absence does. ADR 0008 keeps the data shaped so either can be derived later, including retroactively.

**Whether starting a Game needs a challenge in front of it.** `POST /game`
(ADRs 0021, 0022) is deliberately ungated. A script can therefore start anonymous Games at
will, one extra request each, and ADR 0009 weights its Candidate review queue by how many
distinct people typed a word — counted per Game where the Player is unknown. So that weight
is forgeable, which is a gap in ADR 0009's reasoning rather than something the schema
catches. ADR 0022's `player_id is null` flag makes the forgeable half *visible*, which is
what lets a reviewer exclude it, but it does not make it trustworthy. ADR 0010
declined rate limiting while reasoning about the guess endpoint and about
learning the Answer; this is a different attack it did not consider. Only a
challenge (Turnstile or similar) actually stops it — per-IP limits hit Indonesian
carrier NAT first, which ADR 0010 warns about by name. Left open on purpose:
at zero traffic there is no way to tell a script from a launch. The split into
its own endpoint is what makes gating cheap when it is time.

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
