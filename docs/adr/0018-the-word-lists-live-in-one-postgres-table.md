# The word lists live in Postgres, in one table

_This reverses the "files inside `apps/api`" assumption in ADR 0015 and in that app's README. Both carry a note pointing here._

The Dictionary and the Answer Pool are rows in a single `word` table, keyed on `(language, length, word)`, with two flags: `in_answer_pool`, and a `status` of `active` or `rejected`. A Guess is checked against it with an indexed lookup on every submission, and the result is never cached.

## Why not files

Files were the obvious choice and they are faster. We rejected them because they make every correction a deploy, and correction is the entire point of ADRs 0009 and 0012. Those two ADRs are promises to grow the Dictionary from real play and to strip bad words out of the Answer Pools once play data condemns them. If acting on either needs a release, the review queue that ADR 0009 describes as "a SQL query" ends in a pull request, and it will not happen.

The same argument rules out caching the table in memory. ADR 0006 blesses in-memory state on Fluid compute, and a `Set` lookup is free — but a warm instance would keep serving a Dictionary that no longer matches the one a reviewer just edited, and instances recycle unpredictably. Caching gives back exactly the freshness we bought. The cost of not caching is a few milliseconds on a path that ADR 0003 already spends 50-100ms on, from an API pinned beside the database in Singapore.

## Why one table and not two

`CONTEXT.md` says every Answer Pool word is also a Dictionary word. Two tables make that an invariant something has to maintain; one table with a flag makes it impossible to violate.

It also matches what a reviewer actually does, which is two different things:

- **"That is not a real word."** Out of the Dictionary and out of the Answer Pool — `status = 'rejected'`. Typing it now returns an Unknown Word.
- **"Real word, terrible Answer."** Out of the Answer Pool only — `in_answer_pool = false`. Still perfectly legal to type. ADR 0012 is explicit that a low Solve Rate "frequently means *hard word*", so this is the common case, not the rare one.

Rejected rows do a third job: they are how a ruled-out word stops resurfacing. The review queue is Unknown Word attempts with no row in `word` at all, so ADR 0009's separate verdict table is not needed — the rejection *is* the verdict.

## Where the rows come from

`scripts/build-words.mjs` returns to the repo. It fetches the sources, applies ADR 0004's derivation and the four mechanical filters ADR 0013 says actually ship, and writes one committed CSV. Seeding is a `\copy` of that file and nothing else.

Deriving at seed time instead would have avoided a megabyte in git. We rejected it because ADR 0013 makes `/usr/share/dict/web2` a macOS-only build dependency, and because the other sources are third-party URLs — the contents of four Answer Pools should not depend on what a raw file returned the morning someone deployed. Regenerating is a deliberate act perhaps twice a year, and the diff is the point.

**The seed must never overwrite a human.** It upserts only rows where `source = 'derived'` and `reviewed_at IS NULL`. Without that, re-running the derivation quietly resurrects every word a speaker rejected. This means the seed is not a bare `\copy` into `word` — the CSV carries no `status`, `source` or `reviewed_at`, so it lands in a staging table first and moves across with an `INSERT … ON CONFLICT DO UPDATE … WHERE`.

## The cost

ADR 0015's hard rule — the Dictionary and Answer Pool live in `apps/api` and nowhere else — was previously enforced by physics, because `apps/play` cannot read a file it does not have. As tables it is enforced by who holds the connection string. Only `apps/api` does, so ADR 0003 still holds, but it is now a convention rather than an impossibility, and a future reader should know the difference.
