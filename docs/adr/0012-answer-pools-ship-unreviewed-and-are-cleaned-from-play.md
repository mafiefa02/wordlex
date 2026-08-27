# Answer Pools ship unreviewed and are cleaned from play data

No human reads the Answer Pools before launch. They ship as derived in ADR 0004 — frequency-cut for English and Indonesian, Indonesian-subtracted for Sundanese and Javanese — and we clean them afterwards using signals from real play.

This is a deliberate risk. ADR 0005 made Daily-only the whole game, so a bad Answer is not a mildly obscure word someone shrugs at: it ruins that day for everyone on that Track, with no second Game to redeem it. We know words like `afiun`, `anbiya`, `arakian` and `apngal` are still in there.

We take it anyway because the alternative — blocking launch on a speaker reviewing several thousand Sundanese and Javanese words — is slow, can't be delegated, and would be done blind. Cleaning from play data is done with evidence.

## Two signals, neither of which removes anything on its own

**Solve rate.** A word that almost nobody solved is suspect. This is the obvious signal and the weak one: sample size is tiny, because Daily-only means a word is the Answer for exactly one day, and the Tracks that most need cleaning are the Tracks with the fewest players. Three Sundanese players failing a word is noise. It is also confounded — genuinely hard real words exist, and English Wordle's most-failed answers are all perfectly good words.

**Whether anyone ever types the word.** Sharper, and free. Every Guess is already stored, because ADR 0003 puts Game state in Postgres. So for any word in an Answer Pool we can ask how many distinct Players have ever submitted it as a Guess, across every Game and every day — not just the one day it was the Answer. Words real speakers know get typed. `gedhe` gets typed constantly; `afiun` never gets typed by anyone. This accumulates over time instead of being one-shot, which is exactly what solve rate can't do.

The strong candidate is a word that scores badly on both: never guessed by anyone, and unsolved when it came up.

Both are derived by query from Game rows, following ADR 0008. Nothing new is stored.

## Never automatic

Low solve rate does not mean "not a word" — it frequently means "hard word". These signals produce a review queue and nothing else, the same rule ADR 0009 applies to Unknown Words. Removing an Answer automatically would quietly strip the hardest real words out of every Track, which is the opposite of what we want.

## What still happens before launch

The one filter we are not deferring is the mechanical one: proper nouns and a per-language blocklist. `oscars`, `rudolf`, `teheran`, `andreas` and `cicero` survive the frequency cut, and the OpenSubtitles corpus contributed `bokep` to Indonesian. That needs no speaker and no play data, so there is no reason to ship without it.
