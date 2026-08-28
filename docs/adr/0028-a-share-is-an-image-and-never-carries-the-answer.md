# A share is an image, and never carries the Answer

_Settles the "Shareable result grids" assumption in `docs/open-questions.md`. ADR 0005 leaned
on comparable shared grids to justify the single global rollover, but sharing itself was only
ever assumed from Wordle and never specified. It is specified here._

A finished Game can leave the app two ways: as text on the clipboard, which it already could,
and as a **1080x1920 PNG** built for an Instagram Story. Both are drawn from the same board and
both live in `apps/play/src/lib/share.ts`, so they cannot drift apart.

## No letters and no Answer, on either path, at any time of day

The result sheet reveals a lost Answer once the WordleX Day is over — ADR 0003 only holds it
back while the Game is live, and by rollover there is nobody left to spoil. A share does not
get that concession. The sheet is one screen that closes; a PNG sitting in a camera roll can
be posted a week later, and everyone who has not played that Daily yet is on the same word.

So the picture is Marks and nothing else, and the rule is the flat one rather than the clever
one: never, rather than never-before-rollover. The clever version is a branch that has to stay
correct forever, on the one path where being wrong is unrecoverable.

## Why an image and not just the text

The text share is fine on a platform that renders text. Instagram Stories is not one. Pasting
a grid of emoji squares into a Story means typing it into a text box, at whatever size and
font the composer feels like, which is not a thing anyone will do twice.

## Why the card draws itself rather than rasterising the DOM

A library that turns a DOM node into an image would let the existing mini-grid be the share,
which is the tempting version. It also inherits every way that translation goes wrong — web
fonts that have not loaded, CSS the rasteriser does not implement, `oklch()` colours — and
those failures are silent and land in the artifact rather than on screen.

The card is four rounded-rect loops and four lines of text. Drawing it directly on a canvas is
less code than configuring the library would be, and it fails loudly.

## The card pins its own palette

Dark, with the token values copied in as hex rather than read off the page. Two reasons: an
export is not a themed surface, so "does the share follow dark mode?" is a question worth never
having; and `oklch()` in a canvas `fillStyle` is not supported everywhere the tokens are, where
it fails by drawing nothing at all.

The cost is that the design system can move and the card will not move with it. That is the
same trade `docs/mocks/tokens.css` already makes, and a share image is exactly the kind of
thing that should look the same in six months.

## The image shows the whole board; the clipboard shows only what was spent

These disagree on purpose. In text, a blank row reads as a row of Marks, so the clipboard has
always sent only the Guesses that were made. In a picture, an outline is visibly an outline —
the same thing it is on the board itself — so the card shows the full budget and the unspent
rows say how much room was left.

## Layout is built around Instagram's chrome, not around the canvas

Instagram covers roughly the top 250px and the bottom 310px of a Story with the account row and
the reply bar. Everything on the card sits between those, which is why the lockup starts low
and the URL stops well short of the bottom edge.

## There is no deep link, and there was never going to be

`instagram-stories://share` needs a registered Facebook App ID and a native app to hold it. From
a browser the only route is `navigator.share({ files })` — the operating system's share sheet,
where Instagram appears as one destination among many. Where that is unavailable the file is
downloaded instead and the button says "Save image" rather than "Share image".

The card is drawn when the result sheet opens rather than when the button is pressed. Safari
refuses `navigator.share` once too much time has passed since the gesture that led to it, and
drawing is the slow half.

## Both paths write the WordleX Day the same way

`28 Aug 2026`, on the card and on the clipboard. It was `2026-08-28` on the clipboard before
this. The month name stays English on all twelve Tracks, which is the honest cost — the
alternative was ISO everywhere, and a share is read by a person before it is read by anything
else.

Mocks: `docs/mocks/story-cards.html`. A is what shipped; B and C are kept, and B's take — the
score as the whole picture — is the one to reach for if the card ever needs to work at
thumbnail size.
