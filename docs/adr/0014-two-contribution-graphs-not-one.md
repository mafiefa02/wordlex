# Two contribution graphs, not one

The play history uses **one thin calendar per language, stacked** — four rows, position carries the language, shade carries the count. Anywhere the graph has to be small (a card, a share image) it falls back to **a single calendar shaded by total games**, with language only in the tooltip.

Having two encodings for the same data is the surprising part, so: the stacked version needs four times the height, which the profile page can afford and a card cannot. Rather than compromise both, each place gets the one that fits it.

Two alternatives were built and rejected. **Hue as the language** — colouring each cell by the language played most that day — is the tempting one, and it is a fiction: two English and two Javanese games render as a single colour and the reader cannot tell. It also rests the entire encoding on hue, which is exactly what fails for colourblind readers and in print. **Four quadrants per cell** is honest and loses nothing, but needs 16px cells to be readable, at which point a year no longer fits on screen.

The stacked version has a property the others don't: language survives without colour vision, because it is carried by row position. Its obvious cost — a language you have never played is a permanently empty row — we read as a feature. A blank Sundanese row is an invitation.

The four language colours are validated for both themes rather than chosen by eye; the green/amber pair separates only thinly under tritanopia, which is a further reason not to let hue carry meaning alone.

Mocks: `mocks/contribution-graph.html`.
