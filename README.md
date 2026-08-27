# WordleX

A daily word game in English, Bahasa Indonesia, Sundanese and Javanese.

Start with `CONTEXT.md` for the vocabulary, `docs/adr/` for the decisions, and
`docs/open-questions.md` for what is deliberately still open.

## Running it

```sh
pnpm install
docker compose up -d --wait
cp apps/api/.env.example apps/api/.env
pnpm --filter @wordlex/api db:migrate
pnpm dev
```

`docker compose` runs one Postgres container on Supabase's image, so `pg_cron`
is the same one production has (ADR 0019).

- Landing page — http://localhost:3000
- Play — http://localhost:3001
- API — http://localhost:4000/health

`pnpm build`, `pnpm check-types` and `pnpm test` run across every package.
`pnpm lint` and `pnpm format` are oxlint and oxfmt, which run over the whole
repo in one pass rather than per package.

Git hooks are lefthook's, installed by `pnpm install`. Committing formats and
lints the staged files; pushing builds whichever packages the outgoing commits
touch. Markdown is deliberately left unformatted, so the ADRs keep their
hand-wrapped prose.

## Layout

| Path | What it is |
|---|---|
| [`apps/landing`](apps/landing) | Next.js, `wordlex.com` |
| [`apps/play`](apps/play) | TanStack Start, `play.wordlex.com` |
| [`apps/api`](apps/api) | Fastify, `api.wordlex.com` |
| [`packages/domain`](packages/domain) | The vocabulary, as types and functions |
| [`packages/ui`](packages/ui) | The design system and every component |

Each has its own README. The shape and its one hard rule are in ADR 0015: the
Dictionary and Answer Pool belong to `apps/api` and must stay there, because that
is what keeps ADR 0003 true.
