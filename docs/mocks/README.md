# Play app mocks

Three takes on the game screen. **A is the pick**; B and C are kept for the parts
of them that might still be borrowed. Open them straight from disk — no server
needed:

```
docs/mocks/play-a-focus.html
docs/mocks/play-b-twelve.html
docs/mocks/play-c-rail.html
```

They are playable. Type on a real keyboard or tap the on-screen one. The Answer
is `GREAT` on 5 Tiles, `BARANG` on 6, `ARTICLE` on 7. Type something outside the
stand-in Dictionary (`ZZZZZ`) to see the Unknown Word state. The sun button in
the header flips the theme.

`tokens.css` is the real palette from `packages/ui`. `demo.js` is a stand-in for
the server — in the real app the Answer never reaches the browser until the Game
is over (ADR 0003).

## What each one decides

| | A — Focus | B — Twelve | C — Rail |
|---|---|---|---|
| **Arriving** | straight to a board, Track as a slim bar | twelve Tracks first, then a board | board, with all twelve on a rail beside it |
| **Starting** | type — the first Enter starts the Game | press Play | press Play |
| **The reveal** | Tile by Tile, flipping | the whole Guess turns as one | Tiles press in and spring back, no flip |
| **The keyboard** | keys fill with their Mark | keys fill, held lighter | ruled-out keys drain away, the rest get a Mark bar |
| **Ending** | the whole board as Marks, and a copy to the clipboard | — | — |

A finished Game in A copies as:

```
WORDLEX · English 5 Tiles
2026-08-28 · 4/6

⬛⬛🟨🟨🟨
⬛🟩🟨⬛🟨
⬛⬛🟩⬛🟩
🟩🟩🟩🟩🟩

play.wordlex.afiefabd.com
```

Marks only, so nothing about the Answer travels with a share — and the spent
rows only, where the sheet shows the whole board including the Guesses that were
never needed.

Landing-page deep links (`/?lang=su&length=6`) work in all three; B is the only
one where a player without a link meets the twelve first.

## The same in all three

Design tokens only, both themes. Every motion is one-shot and gated on
`prefers-reduced-motion`, with the Mark still landing when motion is off.
Nothing repaints on a timer — no spinner while a Guess is in flight, no blinking
caret. CONTEXT.md's words in the copy: Tile, Guess, Mark, Track, Daily, and an
Unknown Word that blames our Dictionary rather than the player.
