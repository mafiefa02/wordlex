# Open questions

Things deliberately left undecided, work that must happen before launch, and work we have consciously chosen to do after it. Decisions that *are* made live in `docs/adr/`; vocabulary lives in `CONTEXT.md`.

## Decided since

**What a Streak counts, and what makes a Game count at all.** ADR 0026: consecutive WordleX
Days with a win on any Track, one number across all twelve, broken by a day with no win. A
Game counts as played once it has a Guess, which is also what makes zero-Guess Games
`abandoned` and keeps them out of a word's Solve Rate.

**What a Solve Rate is computed over.** The amendment at the top of ADR 0012: Games won over
Games finished, anonymous Games included, Abandoned ones excluded. Excluding anonymous play at
launch would leave most Tracks with no evidence at all, and `player_id is null` stays visible
so a reviewer can still split the two.

**What carries over from an anonymous Game on sign-in.** ADR 0027: today's Games and nothing
else, with the Account's own Game surviving a collision.

**How anyone signs in.** ADR 0025: Google, and only Google.

**What a share is.** ADR 0028: the clipboard text it always was, plus a 1080x1920 image
for an Instagram Story, neither of which ever carries a letter or the Answer — not even
after rollover, because a picture outlives the WordleX Day it was made in. This was the
last assumption ADR 0005 was resting on that nobody had actually decided.

## Deferred by choice

**What a Difficulty is.** The word-length axis is settled (it is part of a Track). Difficulty is a separate axis and is still undefined. Three readings were on the table — a rules ladder applied to the same word, a smaller guess budget, or harder words drawn from a different slice of the pool. Only the third multiplies Answer Pool consumption, which matters because Sundanese 5-letter has under a year of runway.

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

**Which error tracker, if any.** Everything is logged as structured JSON to stdout and the
platform collects it; `logFatalExits()` makes sure a crash says why before it goes. Nothing
alerts. Choosing Sentry or anything like it means sending errors — which carry request paths
and sometimes cookies — to a third party, so it is a decision to take deliberately rather than
a default to reach for at zero traffic.

**Reading the Candidate queue.** ADR 0009 records Unknown Words from day one. Reading them can wait for an admin UI; the data accumulates either way, and nothing is lost by looking late.

**Showing an Account what it has earned.** Signing in now lives in `apps/play` and nowhere
else — the header reads `GET /me` for a name and an avatar, and that is all it reads. The rest
of what the API already answers is still uncalled: `GET /me/history` has no contribution graph
to draw (ADR 0014), `POST /me/badges/seen` has no Badge toast to dismiss, and the Streak and
Badges `GET /me` returns are thrown away. There is no profile screen for any of it to live on.

**Answer Pool runway.** ADR 0005 notes that pool depth is an operational concern. Sundanese 5-letter has roughly nine months, so there is time before anyone needs a way to see this.

## Assumptions worth revisiting

**The landing page cannot promise instant play.** With Daily-only, a visitor who clicks "Play" gets exactly one game and then waits until tomorrow. The landing page has to sell the ritual rather than the immediacy.
