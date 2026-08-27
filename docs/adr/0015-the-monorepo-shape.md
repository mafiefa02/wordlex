# The monorepo shape, and what may not be shared

One pnpm workspace, driven by Turborepo, holding three apps and one shared package:

| Path | What it is | Port in dev |
|---|---|---|
| `apps/landing` | Next.js, `wordlex.com` (ADR 0001) | 3000 |
| `apps/play` | TanStack Start, `play.wordlex.com` (ADR 0001) | 3001 |
| `apps/api` | Fastify, `api.wordlex.com` (ADR 0006) | 4000 |
| `packages/domain` | The words in CONTEXT.md, as types and functions | — |
| `packages/ui` | The design system and every shadcn/ui component (ADR 0016) | — |

`packages/domain` ships TypeScript source rather than a build step, so there is no
compile order to think about. Vite bundles it for `play`; tsup bundles it into
`api`'s output. The landing page imports nothing from it.

## What the shared package is for, and what it must never hold

It holds the vocabulary both sides need to agree on: `Track`, `Mark`, `Language`,
the guess budget, and the WordleX Day. The day maths in particular has to exist in
exactly one place — a second copy that disagreed about the 00:00 WIB rollover
(ADR 0005) would be a correctness bug, not a style problem.

**The Dictionary and the Answer Pool live inside `apps/api` and nowhere else.**
ADR 0003 keeps them off the browser, and the way to keep that true a year from now
is that `apps/play` cannot import them even by accident. If they ever move into a
shared package, the rule survives only as long as everyone remembers it.

## Choices made here rather than deferred

**Drizzle** for the database, when the database arrives. ADRs 0008, 0009 and 0012
all derive their answers by query — streaks, Candidate weights, whether a word has
ever been typed — so the layer that gets out of the way of SQL is worth more here
than the one with the nicer schema file. It also has a first-class better-auth
adapter, and plain SQL migration files. One thing it will need: Supavisor in
transaction mode does not support prepared statements, so the postgres client has
to be created with `prepare: false`.

**ArkType** for validation, on both sides. It reads as TypeScript, it is fast, and
it implements Standard Schema, which is what lets the same schema validate a request
body in Fastify and the typed search params in TanStack Start. better-auth may still
pull zod in as its own dependency; that is its business, not ours.

## Not here yet

No database, no auth, no word lists. `scripts/build-review-lists.mjs` writes the
review lists from ADR 0013, but nothing yet writes the Dictionary and Answer Pool
files the API will read.
