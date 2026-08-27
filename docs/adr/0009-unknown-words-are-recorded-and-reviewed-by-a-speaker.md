# Unknown Words are recorded, counted by distinct Player, and reviewed by a speaker

When a Player submits a word that isn't in the Dictionary, we record it. Our Sundanese Dictionary holds 4,284 words and Javanese 11,364, against 15,921 for English at five letters alone — these lists *will* reject words that real speakers type, and this log is the only way we find out which.

This is the payoff we bought in ADR 0003. Checking the Dictionary on the server costs us latency on every rejection; if nobody records or reads the rejections, we paid that cost for nothing.

## What is recorded

One row per `(Track, word, Player)`, inserted once and ignored on conflict. Nothing else: no IP address, no timing. The word is normalised exactly as the Dictionary lookup normalises it — lowercased, diacritics folded, `a-z` only — or we would log words that a correct lookup would have matched.

Wrong-length input and anything with characters outside `a-z` never reaches the Dictionary check and is never logged, so the table stays clean by construction.

A separate small table records a reviewer's verdict per `(Track, word)`, so a word a speaker has already ruled out does not resurface every time someone tries it again.

## Counting distinct Players, not attempts

A Candidate's weight is the number of *distinct* Players who tried it. "Forty different people typed NGGAWE in Javanese-6" is a signal about the Dictionary; "one person typed it forty times" is someone manufacturing one. The unique constraint collapses the second case to a weight of 1, which is why this is a property of the schema rather than something a filter has to catch.

Following ADR 0008, the count is derived by query rather than kept as a counter.

## Nothing is added automatically

Candidates go to a human. For Sundanese and Javanese that human must be a speaker. Auto-adding would let anyone inject words into the Dictionary, and — more likely in practice — it is exactly how Indonesian would quietly flow into the Javanese Dictionary, which ADR 0004 already identifies as that source file's defining problem.

No admin UI for now. The review queue is a SQL query. The threshold starts at one Player, because at launch volume every Unknown Word is worth looking at; raise it when volume makes that impractical.

## Nothing caps how much one Game can record

We considered stopping after twenty Unknown Words in a single Game, as a storage guard now that ADR 0010 declines rate limiting. We rejected it, because it would discard exactly the rows we most want.

The Sundanese Dictionary holds 670 words at five letters. A Sundanese speaker playing that Track is *supposed* to hit rejection after rejection — that is the gap this log exists to find — and twenty in one Game is entirely plausible for a real player rather than a script. A per-Game cap would therefore go silent precisely on the highest-signal players in the two languages where we have the least data.

Distinct-Player counting already prevents a script from distorting the signal, which is the thing worth protecting. All a cap buys is table size, and rows are cheap in a way that a missing Candidate from the one player who found a gap is not. If the table ever becomes a real problem, that is a problem we will be able to see.

One known wrinkle: anonymous Players that are eventually expired take their identity with them. Attempt rows outlive the Player, so historical Candidates under-count slightly. Those words will long since have been reviewed, and we accept it.

## The other thing this log is good for

It also tells us which words Players *expect* a language to contain. For Sundanese and Javanese, where the frequency data behind ADR 0004 is weakest, that is a better source for growing the Answer Pool than a subtitle corpus.
