# Every write carries an Idempotency-Key

_Amends ADR 0022, which asked the client not to fire concurrent starts because the server
could not tell a double press from two people. It still cannot tell — but it can now be
told, and the key is how._

`POST /game` and `POST /guess` both require an `Idempotency-Key` header **holding a
uuid**. Missing or any other shape is a 400 with `IDEMPOTENCY_KEY_REQUIRED`. The key is stored on the row the write
creates, and a unique constraint is what claims it:

| table | constraint | scope |
|---|---|---|
| `game` | `game_daily_idempotency_key` | `(daily_id, idempotency_key)` |
| `guess` | `guess_game_idempotency_key` | `(game_id, idempotency_key)` |

## Why

Every call has three outcomes, not two: it worked, it failed, or **nobody knows**. A
timeout tells a client nothing about whether the effect applied — and Jakarta on mobile
data produces plenty of them. Without a key the only safe options were "never retry" and
"retry and hope", and neither was written down.

**`POST /guess` was the expensive one.** The row a Guess takes is `guesses.length + 1`,
computed inside the transaction, so a retry appended a *second* Guess and spent a row the
Player never meant to spend. On a 5-Tile Track that is a sixth of the Game. The `for
update` lock already in that handler prevents two submissions *racing* for the same
position; it does nothing about a retry arriving a second later, and conflating the two is
easy — they are genuinely different problems.

**`POST /game` was the one ADR 0022 already knew about.** Two presses at the same time made
two Games, because neither request holds the cookie the other is about to set and
`game_player_daily_key` does not constrain a null `player_id`. The loser was orphaned and
swept to `abandoned` with no Guesses, landing in ADR 0012's Solve Rate denominator. ADR
0022 could only ask the client to behave. The key is the first thing that actually joins
two starts, and it fixes the retry case too: a browser that never received the first
response has no token, so the key is all that is left to recognise it by.

## The key names an intent, and the intent is scoped

A key is opaque to the server — the only checks are a length bound and a character class.
What matters is what it is scoped *against*:

- On `game`, the intent is "start this Track today", so the key is unique per Daily. The
  same key on another Track is a different intent and gets its own Game.
- On `guess`, the intent is "this submission against this Game", so the key is unique per
  Game.

This is why neither constraint is global. A Guess belongs to a Game; the same key presented
against a different Game is not a duplicate of anything, and treating it as one would mean
answering with a Guess from a Game the caller did not ask about.

**The client generates a random uuid once per intent and reuses it on every retry of that
intent** — `crypto.randomUUID()` when Play is pressed or a submission is composed, held in
memory or `sessionStorage` for as long as retries might happen. A fresh uuid per *attempt*
puts `POST /game` back to two Games on a double press: the server still cannot tell a
double-click from two people, it can only be told.

The usual advice for an idempotency key is to derive it from the intent — `start:en:5`, or
something built from an immutable id. **That advice is wrong here, and dangerously so.**

## On `POST /game` the key is a credential

That endpoint hands back a Game token when a key names a Game that already exists. It has
to: a retry that never received the first response holds no token, and the key is the only
thing left to recognise it by. Which means **whoever can produce the key gets the Game** —
its board, and the token to spend its Guesses.

So a key derived from the intent would be the same string for every anonymous Player on
that Track. `start:en:5` is what a careful engineer writes after reading the usual advice,
and it collapses the whole Daily: the second person to press Play is handed the first
person's board and token. ADR 0022 signed the Game token specifically so that a browser
could not name a Game and claim it; a guessable key is that hole reopened beside it.

Two things close it, and both are in the code:

- **The key must be a uuid** (`src/http.ts`). This is not about collision-resistance — it is
  the cheapest way to make "generate a random one per press" the only natural way to use the
  header, and to make the readable-key mistake fail at the door instead of in production.
- **A key naming a Game that already has Guesses is refused** with 422, and no token goes
  out. A genuine retry cannot have played anything, because it never received the token a
  Guess needs. So Guesses mean the Game is somebody's and this is not the lost response it
  claims to be. This shrinks the window on a leaked key from the rest of the WordleX Day to
  the moment before its first Guess.

**The residual cost, stated plainly:** between a Game being started and its first Guess, the
key alone is enough to claim it. A client that hard-codes one uuid for everybody would hand
its players each other's Games in that window. Nothing on the server can distinguish that
from the retry it is designed to serve — the two requests are identical — so this is
accepted rather than solved. It is acceptable because the key never leaves the client that
generated it, exactly like the Game token, and because there is no client yet to get it
wrong.

`POST /guess` has none of this exposure. Its key is scoped to one Game, and reaching that
Game at all requires the signed token, so the key reaches nothing on its own.

## What each endpoint does with a repeat

**`POST /game` claims by inserting.** There is no row to lock on — this request is what
creates one — so `onConflictDoNothing` on the constraint is the claim, and reading first
would let two starts both read "no Game" and both insert. Nothing inserted means the key
already named a Game: Postgres made the loser wait for the winner to commit, so the row is
readable immediately after, and the token goes out again because the response carrying it
is the one that was lost.

**`POST /guess` reads then inserts, and that is safe only because of the lock.** The Game
row is locked with `for update` before either, and stays locked until commit, so every
submission against one Game is serialized. The unique constraint is the invariant behind
that reasoning rather than the mechanism — if the reasoning is ever wrong, it fails loudly
instead of quietly duplicating a Guess.

**The key is checked before the Game's status, and that order is the whole point.** A retry
of the *winning* Guess arrives at a Game that is no longer `playing`. Asking about the
status first answers it with `GAME_OVER`, and the client cannot tell "my Guess landed and
won" from "rejected, the Game was already over". The terminal Guess is the response a client
most needs to recover, so the key decides first, every time. There is a test named for this.

**A key that comes back naming a different word is a 422**, not a replay. Serving the first
response to a second, different request answers a question nobody asked; a client bug should
be loud. `IDEMPOTENCY_KEY_REUSED` is checked ahead of the status too — a reused key is worth
surfacing whatever state the Game is in.

**An in-flight duplicate waits.** Both endpoints block on a lock the first request holds —
the Game row on `/guess`, Postgres's speculative insertion lock on `/game` — and answer once
it commits. That is deliberate rather than what fell out: the alternative is a 409 telling
the client to try later, which for a Guess means a person staring at a board that has not
moved. The bound is the transaction's own duration, and these transactions are short.

## What this deliberately does not do

**A replay returns the current board, not the first response's bytes.** Retry Guess 3 after
Guess 4 has landed and the reply contains four Guesses. This is a real deviation from
"serve the stored response", and someone diffing `guesses.length` across a retry will see
it. It is the better answer — the board is what is true now, and it is built by the one
`readBoard` both routes use — and it avoids storing response bodies and deciding when they
expire.

**The Unknown Word path records no key.** It spends no row, and its
`unknown_word_attempt` insert is already `onConflictDoNothing`, so a retry re-runs the branch
and reaches the same answer. There is nothing to make idempotent.

The cost is that the reuse check has nothing to check against there: a key first sent with an
Unknown Word and then sent again with a real word **scores it** rather than answering 422,
because the lookup only reads the `guess` table and no row was written the first time. The
outcome is still correct — exactly one row is spent, on the word that was actually a Guess —
so this is a missed loud failure rather than a wrong answer. Catching it would mean recording
keys for submissions that spend nothing, which is a second table for no correctness gain.

**422 is a new status for this API.** ADR 0023 said status codes were unchanged, meaning it
did not renumber existing ones. A new failure gets the status that fits it, and 422 —
well-formed request, semantically refused — is exactly this.

**Retention is forever, because the keys live on rows nothing deletes.** No sweeper, no TTL,
no window to get wrong. This matters more than it looks: a key retention shorter than the
longest path that can re-deliver a request is a duplicate waiting to happen, and here there
is no such path — a Game token expires at rollover, so no client can present a key older
than a WordleX Day anyway.

**It does not gate anything.** A script can still start Games at will; it just needs a new
key each time, which costs nothing. `docs/open-questions.md` still holds the question of
whether starting a Game needs a challenge in front of it, and this changes none of it.

## Migration

`drizzle/0005` is hand-edited, the way `0000` is: drizzle-kit generates `ADD COLUMN … NOT
NULL` with no default, which cannot run against a table that already holds rows. It adds the
column nullable, backfills with `gen_random_uuid()::text`, then sets `NOT NULL`. Rows that
predate this ADR were made without a key and no client will ever present one of theirs, so a
fresh uuid each is exactly the right filler.

No client change is needed, because there is no client: `apps/play` still fetches nothing.
