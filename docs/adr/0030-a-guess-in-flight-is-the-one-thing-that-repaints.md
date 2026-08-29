# A Guess in flight is the one thing that repaints on a timer

_Amended by ADR 0031: a Guess is a TanStack Query mutation now. `pending` is its
`isPending`, and `unsent` is no longer a flag beside the request — it is read straight off
the mutation's own error being `UNREACHABLE`, which is the same condition that keeps the
`Idempotency-Key`. The two can no longer disagree. Clearing the message is `reset()`, and
it still fires on exactly the presses named below and no others._

While a Guess is out, the live row settles Tile by Tile and keeps settling until the answer
lands. `row-waiting` in `apps/play/src/app.css` loops. It is the only animation in this app
that does, and nothing else may follow it.

## Why an exception was needed

Every other piece of motion here describes an event: a Tile turns because its Mark landed,
a row shakes because a word was refused, the result sheet rises because a Game ended. Each
one has a beginning and an end because the thing it describes does.

A request does not. It takes as long as it takes, and it may never finish at all. Anything
that runs a fixed number of times finishes before the thing it is describing does — and
once it has, a Guess that is taking three seconds looks exactly like one that is never
coming back. That is the state the board previously had: one 220ms lift, then a static 60%
dim that said nothing further no matter how long the wait ran.

A loop is the only shape that lasts as long as its subject. This is the one place in the
app with a subject of unknown length, so it is the one place the shape is earned.

## What the exception costs, and what bounds it

The rule it breaks is real: a continuously repainting animation is expensive, and on a
high-refresh display it is expensive for as long as it runs. Three things bound it.

- **It moves `opacity` and `translate` only.** Both are compositor properties, so the wave
  costs no layout and no paint — the frames are the GPU's problem, not the main thread's.
- **It runs only while a request is genuinely in flight.** Not while the board is idle, not
  while a row is turning, not while the sheet is up. When the answer lands it stops.
- **Under `prefers-reduced-motion` it does not run at all.** The row falls back to the
  static 60% dim, which is what the board did before this and is still honest.

The Tiles carry their own `--i`, so the wave runs at the same 75ms stagger a reveal already
uses. One constant, not two.

## The row's dim is dropped while the wave runs

The 60% row dim and the wave's trough compound: together they take the word to about a
third of its contrast at the bottom of every cycle. The Tiles carry the state themselves
while the wave is running, and the dim is the reduced-motion answer only.

## A Guess that never comes back says so, and stays

A send failure was a note that left after 1.6 seconds, which is long enough to miss and too
short to act on. It now stands under the board until it is acted on.

Scoped to `UNREACHABLE`. That is the only code where `submit` keeps `guessKey`, so pressing
Enter re-sends the *same* Guess under the *same* Idempotency-Key and cannot spend a second
row (ADR 0024). The machinery was already there; only the sentence was missing. Every other
code means the server answered and the key was dropped, so a second Enter would change
nothing and those keep the note that goes.

The `startGame` leg carries the same message. ADR 0022 puts it on the first Guess of every
Track, which is the likeliest moment for a Player to be offline.

**Only a press that changes the row clears it.** In that state the row is always full, so a
letter is a no-op — and pressing a key is the natural reaction to reading the message, so
clearing on one would take the message away in exchange for nothing.

## Two numbers that move together

The strip under the board reserves two lines always, so the board does not jump at the
moment a send fails. The chrome constant in `board.tsx`'s Tile-size calculation counts that
strip. Change one and the other has to move: without the second change, a 6-Tile Track on a
667px-tall viewport starts scrolling, which is the exact case the height term exists to
prevent.
