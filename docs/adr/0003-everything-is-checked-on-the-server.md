# Everything is checked on the server

Nothing about the word lists reaches the browser. When a player fills a row and presses Enter, the Guess goes to the API, which decides two things in one call: whether it is a real word at all, and if so how it scores. The Answer and the Dictionary both stay server-side.

Original Wordle ships everything to the browser and the answer is one devtools line away. We can't do that — WordleX has badges, streaks and a play history, and those are worth nothing if they're self-reported.

We also considered shipping only the Dictionary, which is not a secret, so that non-words could be rejected without a network call. We rejected it. The saving is smaller than it looks: the browser only ever talks to the server on Enter, never while typing, so the only thing a local Dictionary buys is a faster rejection of a word that doesn't exist. Against that, our Sundanese Dictionary holds 4,284 words and Javanese 11,364 — English has 15,921 at five letters alone. Those lists *will* reject words that real speakers type. Checking on the server means every rejection is visible and the lists can be grown from actual play; checking in the browser makes that feedback invisible, and the thin-Dictionary problem never gets fixed. Keeping one list in one place also removes any chance of a bundled copy drifting from the server's.

Two things this forces:

- The API must distinguish **not a word** — costs nothing, consumes no row — from **a valid Guess**, which is scored and spends a row. Conflating them would silently spend a row on a typo, which is about the most infuriating bug this game could have.
- There is no client-side filter in front of the guess endpoint any more, so per-player, per-Game rate limiting is required from day one rather than added later.

Costs we accept: roughly 50-100ms per Guess, no offline play, and game state living in Postgres rather than the browser. If rejection latency ever becomes a real complaint we can ship a Dictionary to the browser purely as an optimisation, but not before.
