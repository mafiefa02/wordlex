# @wordlex/domain

The words from `CONTEXT.md` as types and functions: `Track`, `Mark`, `Language`,
the guess budget, the WordleX Day, and `score`, which turns a Guess and an Answer
into one Mark per Tile.

Ships TypeScript source, no build step. Vite bundles it into `play`, tsup into
`api`.

The day maths exists here once on purpose. A second copy that disagreed about the
00:00 WIB rollover (ADR 0005) would be a correctness bug, not a style problem —
which is why it is one of the two things here with tests. The other is `score`:
exact matches consume the Answer letter they matched before anything can be
`present`, and that ordering is where this game's bugs live.

```sh
pnpm --filter @wordlex/domain test
```
