# Deriving the word lists

Every Track needs two lists: a permissive **Dictionary** (what you may type) and a small, strict **Answer Pool** (what may be the secret word). The two are derived differently per language, because the sources have opposite problems.

## Sundanese and Javanese — subtract Indonesian

Source is the Saka-NLP dictionaries (`sunda_dict.json`, `jawa_dict.json`), keyed by headword with an Indonesian gloss as the value. They are not equally clean. The Sundanese file is well-formed. The Javanese file has the Indonesian side of the dictionary flattened into the keys — `sepeda`, `kemarin`, `sekarang`, `dengan` and `tetapi` all appear as Javanese headwords, 393 key pairs are reciprocal, and 8,874 of 20,347 keys are punctuation or multi-word glosses.

We exploit the Dictionary / Answer Pool split rather than trying to clean one list for both jobs:

- **Dictionary** keeps the pollution. Single tokens only, `a-z` after folding diacritics. Accepting an Indonesian word in Javanese mode is a shrug; wrongly rejecting a real Javanese word is not. This also cushions the fact that these dictionaries are an order of magnitude smaller than English.
- **Answer Pool** subtracts every word in the Indonesian wordlist. Over-filtering is free — we need a few hundred and the subtraction leaves that. It does discard genuinely Javanese words that Indonesian also uses, and we accept that.

## English and Indonesian — narrow by frequency

These have the opposite problem: 15,921 English and 8,346 Indonesian five-letter words, most far too obscure to be a fair Answer. The Answer Pool is the intersection of the dictionary with the top 10,000 words of an OpenSubtitles frequency list.

## Measured Answer Pool sizes

Before any quality pass, at the top-10k frequency cut for EN/ID:

| Track | 5 | 6 | 7 |
|---|---|---|---|
| English | 1,712 | 1,777 | 1,547 |
| Indonesian | 998 | 803 | 837 |
| Sundanese | 275 | 485 | 502 |
| Javanese | 493 | 473 | 411 |

All twelve are viable. Sundanese 5-letter is the only Track under a year of Dailies and is the one to watch.

## Two filters still missing

The frequency cut does not remove proper nouns — `oscars`, `rudolf`, `teheran`, `andreas` and `cicero` all survive it — and the OpenSubtitles corpus drags in vocabulary nobody wants as a Daily, `bokep` being the clearest Indonesian example. A proper-noun filter and a per-language blocklist are required, not optional. See `docs/open-questions.md`.

## Diacritics

Folded to base letters (`é`, `ê`, `è` → `e`) everywhere, forced by the A-Z keyboard in ADR 0002. This recovers ~1,200 words across Sundanese and Javanese. The accented spelling is kept for the post-game reveal.
