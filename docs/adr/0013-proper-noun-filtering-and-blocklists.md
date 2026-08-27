# Proper-noun filtering and blocklists

_Amended: the human review steps below were deferred before launch, so only the mechanical parts run for the first release. See "What actually ships" at the end._

_Amended again: `scripts/build-review-lists.mjs` and the `data/review/` files it wrote were removed from the repo. Every path named below is recoverable from commit `ba775eb`; the script refetches its own sources, so nothing is lost._

Answer Pools ship without a human quality pass (ADR 0012). This ADR covers what can be done about names and unusable words *without* a human, and records what is left on the table when nobody reviews. Each language gets a different treatment, because the available resources differ wildly.

## English — mechanical, no review

macOS ships Webster's Second at `/usr/share/dict/web2`, and unlike every word list we could find online it is **cased**. So the rule is simply: a word that appears there only capitalised is a proper noun.

| | pool | kept | dropped |
|---|---|---|---|
| EN-5 | 1,712 | 1,541 | 171 — `aaron, agnes, alice, allen, alvin, andre, anita, anton…` |
| EN-6 | 1,777 | 1,604 | 173 — `adrian, alaska, albert, amanda, amazon, andrea, angela…` |
| EN-7 | 1,547 | 1,429 | 118 — `abraham, america, arizona, atlanta, babylon, barbara…` |

Two known imperfections we accept. Webster is from 1934, so roughly a quarter of each pool is absent from it entirely, and that bucket still hides `africa`, `angeles`, `adams`, `arabs`. And it wrongly drops the odd real word — `amigo`. Neither is worth more machinery: a leaked `africa` is a perfectly playable Answer, and ADR 0012's play-data signals will surface anything that actually hurts.

This makes `web2` a build-time dependency on macOS. If the pipeline ever has to run in CI, the file needs vendoring.

## Indonesian — a review list, never a filter

There is no cased Indonesian dictionary, so we use a different signal: a word present in at least four of six unrelated European frequency lists (`en de es fr tr pt`). It finds names well — `anton, angus, baker, baron, buddha, bangkok, francis, jupiter, kristen, miranda, montana`.

**It must not run automatically.** The identical test flags `album, alias, alibi, alien, arena, aroma, agenda, armada, basket, brutal, editor, global, digital, episode, mineral, monitor, monster` — every one a legitimate Indonesian word. What it really detects is international borrowing, and Indonesian is full of legitimate international borrowings. Automating it would quietly strip the modern half of the language out of the Answer Pool.

So it emits 204 words to `data/review/indonesian-proper-nouns.txt` for a native speaker to skim. Expect most of the list to survive.

## Sundanese and Javanese — already handled

ADR 0004's Indonesian subtraction turns out to have removed the names as a side effect, because international names appear in the Indonesian wordlist too. Across all six Tracks only 17 words trip the same test, and most are genuine words that merely collide — `pedes`, `seger`, `pager`, `tales`. The list is written to `data/review/sundanese-javanese-proper-nouns.txt` with each word's Indonesian gloss, which makes the real words obvious at a glance.

## Blocklists — and where this runs out

| Language | Source | Who |
|---|---|---|
| English | LDNOOBW, 403 entries | Free download |
| Indonesian | **None exists** | Superseded — review the whole pool instead |
| Sundanese, Javanese | **None exists** | Deferred to ADR 0012's pool review |

LDNOOBW covers 28 languages. It has no `id`, no `su`, no `jv`. There is no ready blocklist for any of the three Indonesian languages, which is the one place the "needs no speaker" framing of this gate breaks down.

For **Indonesian** we are not writing a blocklist at all. A blocklist would only ever need to cover words that are actually in the Answer Pool, and that pool is 2,638 words — one sitting for a native speaker. Reviewing it directly closes the blocklist, the proper-noun list and ADR 0012's deferred Indonesian quality pass in a single pass, so writing a general profanity list first would be strictly more work for a strictly worse result. `data/review/indonesian-answer-pool.txt` is that review, sorted rarest word first so the obscure tail where bad Answers live comes first and a partial review still catches the worst of it. The 204-word `indonesian-proper-nouns.txt` survives as the five-minute version.

For **Sundanese and Javanese** the same argument applies and the same conclusion follows, except that we have no speaker: those pools hold 275–500 words each, so a blocklist costs the same speaker-hours as reviewing the whole pool. Both stay deferred to ADR 0012, and those two languages ship with that risk open.

**A blocklist is not only about profanity.** `allah` sits in both the English and Indonesian Answer Pools as derived; both filters here happen to catch it, but that is luck rather than design. For an Indonesian audience, religiously sensitive words matter at least as much as rude ones, and no open list covers that category in any language. Whoever writes the Indonesian blocklist needs to be looking for both.

## What actually ships for the first release

No review happens before launch. That leaves the four mechanical steps, all of which run with no human involvement:

- English proper nouns dropped by the Webster filter — 171 / 173 / 118 across the three lengths.
- English blocklist from LDNOOBW.
- Indonesian: the 204 cross-language flags applied **as a filter** rather than as a review list.
- Sundanese and Javanese: the 17 flags applied the same way.

Applying those last two automatically is a reversal of the reasoning above, and the reversal is deliberate. The case against automating them was that a human would do strictly better — the same test that catches `bangkok` also catches `agenda`. That argument only holds while a human is actually going to look. With nobody looking, a blunt filter beats no filter: it costs 204 of 2,638 Indonesian words (7.7%) and 17 of 2,639 Sundanese and Javanese words (0.6%), and in exchange no personal or place name reaches a Daily. Every Track keeps more than two years of runway either way.

The specific thing this buys: `allah` is present in both the English and Indonesian pools as derived. An obscure word making a poor Daily is a bad day. A religiously sensitive word served as a puzzle to an Indonesian audience is a different category of problem, and it is not one to leave to a review that has been deferred indefinitely.

What still ships unreviewed, and is accepted under ADR 0012: obscure and archaic words in every pool, and profanity in Indonesian, Sundanese and Javanese, for which no blocklist source exists in any of the three languages.

## Reproducing this

`scripts/build-review-lists.mjs` fetches every source, caches under `data/.cache/`, prints the English drop counts and writes both review lists. The review format is deletion-based: remove any line that is a legitimate word, and whatever remains is what gets dropped from the Answer Pool.
