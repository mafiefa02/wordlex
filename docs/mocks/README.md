# Mocks

Three sets, all opened straight from disk — no server needed:

```
docs/mocks/play-a-focus.html    the game screen, three takes
docs/mocks/play-b-twelve.html
docs/mocks/play-c-rail.html
docs/mocks/story-cards.html     the Instagram Story card, three takes
docs/mocks/og-cards.html        the landing page's social card, four takes
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
`prefers-reduced-motion`, with the Mark still landing when motion is off. No
blinking caret. These three show a Guess in flight as a static dim, which is
what the board did when they were drawn; it runs a wave there now, and that is
the one thing in the app that repaints on a timer — see ADR 0030. CONTEXT.md's words in the copy: Tile, Guess, Mark, Track, Daily, and an
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

## The social card

`og-cards.html` — four takes on the 1200&times;630 image a link to the landing
page unfurls with. Each card is the real size shown at half, with the same card
beside it at the size a chat client actually renders a thumbnail — which is
where the four stop being equivalent.

| | A — Hero | B — Board | C — Twelve | D — Band |
|---|---|---|---|---|
| **The subject** | the headline | the headline, and a board | the twelve Tracks | the board |
| **Says "word game"** | only by reading it | before a word is read | by reading it | before a word is read |
| **At thumbnail** | the headline still lands | the grid reads, the words do not | a smear of colour | the band and two lines of type |
| **Tiles** | — | five | — | seven |

**D at one row is the pick**, and is what `apps/landing/src/app/opengraph-image.tsx`
draws. It puts the board across the full width with the headline above it and the
promise below, so the board is the card rather than an illustration beside it.
Seven Tiles, not five: the headline claims more than five letters and this is
the only take with the width to show it.

The toggle above the card still switches the row count, because that was the
decision and the alternative is worth being able to see. What the rows leave
over is what the type gets: one row keeps the headline at 56px, two rows drops
it to 42px to show a solve happening. The headline is what makes someone click,
so the row lost. Note the single row carries its own Marks rather than a slice
of the pair — sliced, it would be the winning row, and seven greens reads as a
colour swatch rather than a word game.

One thing the mock cannot show: the shipped card renders in **Geist Regular**,
not the 600 the mocks use, because `next/og` bundles Geist Regular as its only
font and Satori cannot read the variable `.woff2` that `packages/ui` ships.
Matching the site's weight means committing a static SemiBold `.ttf`.

Whichever is picked gets built as `apps/landing/src/app/opengraph-image.tsx`,
which draws through Satori rather than a browser: **flexbox only, no CSS grid**,
so every layout in this file is already inside what that renderer accepts.

Two rules carried over from the Story card, and neither is up for grabs:

- **No letters and no Answer.** The board in B is Marks only. A social card is
  cached by every client that ever saw it, so it outlives any WordleX Day.
- **The card pins its own palette** rather than reading the theme. Whoever
  renders an unfurl has no theme of ours to read, so light or dark is a choice
  made once, in code.
