# @wordlex/domain

The words from `CONTEXT.md` as types and functions: `Track`, `Mark`, `Language`,
the guess budget, and the WordleX Day.

Ships TypeScript source, no build step. Vite bundles it into `play`, tsup into
`api`.

The day maths exists here once on purpose. A second copy that disagreed about the
00:00 WIB rollover (ADR 0005) would be a correctness bug, not a style problem —
which is why it is the one thing here with tests.

```sh
pnpm --filter @wordlex/domain test
```
