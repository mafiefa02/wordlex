# Anonymous play is scoped to one Game, not to a Player

_Reverses the anonymous half of ADR 0007 and ADR 0020, and replaces `POST /player` from
ADR 0021 with `POST /game`. A **Player** now means a signed-in Player. Everything those
ADRs say about Accounts, and ADR 0021's Origin check, still stands._

_Amended by ADR 0024: "Two Play presses racing each other do make two Games… The client
must not fire concurrent starts" below is now conditional. Both `POST /game` and
`POST /guess` require an `Idempotency-Key`, and two starts carrying the same one collapse
into a single Game. The reasoning below is still why — there is no cookie yet and nulls are
distinct in `game_player_daily_key`, so nothing on the server can join two presses — but the
client can now join them itself, and a retry after a lost response is covered too._

An anonymous visitor no longer gets a `player` row. They get a **Game token**: a signed
Game id in a cookie, one per Track, good only for the Game it names and only while that
Game's WordleX Day lasts. `game.player_id` is null for those Games.

## Why

A durable anonymous identity was buying history that nothing shows and nothing promises.
Anonymous play is one Daily at a time; there is no anonymous profile, no anonymous
history view, and — see below — no anonymous Badge. Paying for a permanent row, a cookie
that has to survive a year, and a three-table merge in order to support that was the
wrong shape.

The token is what anonymous play actually needs: proof that this browser is the one
playing *this* Game. Nothing more, and nothing that outlives the day.

## What this gives up, plainly

**Sign-up carries nothing over.** This is the big one, and it reverses ADR 0007's stated
purpose. Someone who plays anonymously for two weeks and then signs up starts at zero,
because there is no anonymous Player to merge from. A future merge could repoint the
Games whose tokens the browser still holds, but tokens expire at rollover, so that is at
most today's — never a fortnight of history. ADR 0007 accepted the complexity of
anonymous Players specifically to protect "the streak that motivated the sign-up". That
protection is gone and it is not coming back in this shape.

**Replaying today's Daily gets cheaper, though not free.** The token is `httpOnly`, no
endpoint clears it, and `POST /game` resumes the Game a valid token names even once that
Game is over. So from a browser, pressing Play after finishing returns the finished board,
and ADR 0005's one Game per Daily still holds. What changed is the price of the
cookie-clearing hole ADR 0010 already accepts: it used to cost every Track and every day of
history, and now it costs one day. Anything that controls its own cookie jar replays for
nothing — but that was already true.

`game_player_daily_key` still holds one Game per Player per Daily. Postgres treats nulls as
distinct, so it does not constrain anonymous Games — there is no identity to constrain them
by, and the token is what stands in for one.

Two Play presses racing each other do make two Games, for that same reason: neither request
has the cookie the other is about to set, and there is nothing to serialize on. The client
must not fire concurrent starts.

**ADR 0012's Solve Rate is the signal to watch.** Replay is not a click away (above), so the
exposure is a determined or scripted replay rather than casual retrying. It is still real,
and the losing half of two racing Play presses lands in the same denominator. Solve Rate
should be computed over signed-in Games, or with anonymous ones clearly separated — the flag
below is not only for the Candidate queue.

**ADR 0009's Candidate weight is weaker for anonymous play.** A Candidate's weight is how
many *distinct* people typed a word. ADR 0009 counts one row per `(Track, word, Player)`,
and that is unchanged where we know the Player. Where we do not, the key falls back to the
Game, so one person playing the same Track twice in a day counts twice.

**Badges are signed-in only.** `badge_award` points at a Player, and an anonymous Game has
none. This does simplify ADR 0020's merge, which no longer has an anonymous side.

## The flag, which is the point

`game.player_id IS NULL` marks an anonymous Game, and `unknown_word_attempt.player_id IS
NULL` an anonymous attempt. Every review query filters or weights on it, so evidence that
cannot be attributed to a person is visibly weaker rather than silently mixed in.

That last part is a genuine improvement on what came before. Under ADR 0007 anonymous and
signed-in Players were the same row shape, so a Candidate's weight mixed forgeable and
non-forgeable counts with nothing to tell them apart. Now the review queue can prioritise
signed-in evidence and include anonymous evidence deliberately, with a toggle.

`unknown_word_attempt` therefore carries a nullable `player_id`, a `game_id`, and
two partial unique indexes: one on `(language, length, word, player_id)` where the Player
is known, one on `(language, length, word, game_id)` where it is not. Both are Track-scoped,
as ADR 0009 asks — the same word in English-5 and Indonesian-5 is two different Dictionaries
and needs two answers.

`game_id` is nullable, so the column could be added to a table that already had rows: those
predate anonymous Games, so they carry a Player and no Game. A check constraint requires one
identity or the other.

The cost of the flag is that at launch almost every row is anonymous. Prioritising
signed-in evidence means prioritising very little of it for the first months, and ADR
0012's cleaning plan has to live with that.

## The token

A signed Game id, in `wordlex_game_<language>_<length>`, expiring at `dayEndsAt()`.

Per Track rather than one cookie for all twelve, because all twelve Dailies are open every
day and one combined cookie would be rewritten on every Guess on any Track. Twelve is the
ceiling, and they expire on their own.

Signed, because an unsigned Game id would let a browser name any Game and claim it. Scoped
to the Daily it was issued against, so presenting yesterday's token, or another Track's,
finds nothing rather than attaching the request to a Game it was not issued for.

`POST /game` is the only thing that creates a Game — a Guess never does. It resumes the
Game a valid token already names, so pressing Play again after the first response is the
same Game.
`POST /guess` and `GET /daily/:language/:length` both read the token; the Guess refuses
without one, and the read returns an empty board.

## Costs we accept

A finished anonymous board is unreachable after rollover. Win at 23:50 WIB and the result
grid is gone at midnight. That follows from tokens expiring with their day, and it is the
same statement as "anonymous play is one Daily at a time".

Losing the token mid-Game loses that Game's progress, with no recovery. This is not a
regression — it was already true of the Player cookie — but the blast radius is now one
Game rather than everything, which is the one place this trade pays out.

`player` and `badge_award` keep their shape and wait for the auth slice. Nothing writes a
`player` row today.
