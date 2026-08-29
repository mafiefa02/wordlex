# A board that is not there yet says so

_Amended by ADR 0031: the board is a TanStack Query query now, so the names here have moved
even though the screen has not. `reading` is the query's `isFetching`, and the failure the
message reports is its `error`. "There is no board" is still the condition every surface
below keys off, and it is still `data === undefined`, not `isFetching` — a read running
behind a board that is already up changes nothing on screen._

_One behaviour did change: a Track keeps its board once it has been read, so **returning**
to a Track shows it at once rather than blanking. The treatment below is what a Track that
has never been read still gets, and it is also what a failed **first** read gets. A read
that fails behind a board already on screen keeps that board and says nothing — there is
nothing useful to say, and the board is still worth playing._

The board is read on mount, and until that read lands there is no board. For as long as
that is true the Tiles draw fainter, the ring that means *type here* is withheld, and the
keyboard is `inert` as well as dimmed. When the read fails, the message stands in the rows
the board is not using — inside the grid, not under it.

## Why

The board drew six empty rows whether or not it had any. `live` was the first row
unconditionally, so the first Tile got the ring, and `press` dropped every key because
`board` was `undefined`. The screen invited a Guess and then ate it. Three surfaces were
lying at once — the Tiles, the ring, and a keyboard at full contrast above a dead board —
and a treatment that answers only one of them leaves the other two lying.

An error fallback did exist: one muted line under a board that still looked playable. It
was not promoted because it was missing, but because nothing about the screen agreed with
it.

**The retry had no state at all.** `load` set no in-flight flag and cleared the failure
only on success, so "Try again" looked like it had done nothing until the answer arrived.
`reading` is that flag. It starts `true` because the first read goes out on mount and the
Track keys the whole screen, so a Track change is a fresh mount; only the retry has to
raise it.

## Waiting and failed are the same screen

Both are "there is no board", and they get the same treatment. Only the line changes.

This is deliberate. The difference between a read that is still out and one that failed is
information, and information belongs in words rather than in a second visual state a
player has to learn. A glance says *not yet*; reading says which.

## The message goes in the board, not under it

The board's box is known before the read is: `length` and `budget` come from the URL. So
the grid can be drawn at its final size immediately, and the message can stand in the rows
that grid is not using. `middleRows` picks them, straddling the centre — a budget with no
middle *pair* (seven Guesses, on a 6-Tile Track) gives up a third row rather than sit
off-centre. The rows are hidden, not removed, so the board is the same size with the
message in it as without.

The alternative was the line under the board, which is where the app already writes. It
was rejected because an empty board is six rows of nothing and the failure can be read
*there*, and because a message under the board pushes the board.

## What each surface does

| | no board yet | board arrived |
|---|---|---|
| Tiles | `data-blank`, drawn fainter | normal |
| the ring | withheld — there is no live row | on the next Tile |
| keyboard | `inert` and dimmed | live |
| the line under the board | empty | "Type to start.", "See result" |

`inert`, not merely dimmed: a dim leaves the keys tabbable and pressable while `press`
drops what they send, which is the same lie in a quieter voice.

## What this does not cover

A finished Game is the other place `press` drops input, and the keyboard does not say so
there. The keys carry their Marks once a Game is over, which is a record worth reading
rather than fading, so it wants an answer of its own rather than this one. The doc comment
in `keyboard.tsx` names the gap.
