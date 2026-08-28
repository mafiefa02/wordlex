# Play app mocks

Two sets, both opened straight from disk — no server needed:

```
docs/mocks/play-a-focus.html    the game screen, three takes
docs/mocks/play-b-twelve.html
docs/mocks/play-c-rail.html
docs/mocks/story-cards.html     the Instagram Story card, three takes
```

## The game screen

Three takes. **A is the pick**; B and C are kept for the parts of them that might
still be borrowed.

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

## The Story card

`story-cards.html` — three takes on the image a finished Game exports for an
Instagram Story. **A is the pick** and is what `apps/play/src/lib/share.ts` draws
(ADR 0028); B and C are kept, and B is the one to reach for if the card ever
needs to work at thumbnail size. Each canvas is the real thing, 1080&times;1920, drawn by the code
that would ship, shown at a quarter of its size. Change the Track, the result and
the card's palette at the top; the dashed bands are Instagram's own chrome, which
eats the top 250px and the bottom 310px of every Story.

| | A — Board | B — Score | C — Rows |
|---|---|---|---|
| **The subject** | the board | the number | the Guesses themselves |
| **Unspent rows** | drawn as outlines, like the sheet | drawn as outlines | left out, like the clipboard |
| **At thumbnail size** | a grid, no score | the score, unmissable | a stripe pattern |
| **Per-Track colour** | the logo only | a wash in the language hue | the logo only |

Two rules hold across all three, and neither is negotiable by picking a
different one:

- **No letters and no Answer, ever** — not even after the WordleX Day is over.
  The result sheet can show a lost Answer at rollover because it is on one
  screen; a PNG outlives the Day it was made in.
- **The card pins its own palette** rather than reading the theme. A share is not
  a themed surface, and `oklch()` is not safe in a canvas everywhere the tokens
  are. Light or dark is a choice made once, in code, not per player.

These mocks wrote the WordleX Day as `28 Aug 2026` while the clipboard still
wrote `2026-08-28`. That disagreement was the mocks' doing and is settled: both
paths now use the card's form, because a share is read by a person before it is
read by anything else (ADR 0028).

**Share&hellip;** hands the PNG to `navigator.share`, which is the only route a
browser has to Instagram — there is no way to open the Stories composer directly
from the web. It does nothing useful on a desktop. Open this file on a phone to
see whether Instagram actually appears in the sheet.
