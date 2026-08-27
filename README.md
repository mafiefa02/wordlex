# WordleX

A daily word game in English, Bahasa Indonesia, Sundanese and Javanese.

Start with `CONTEXT.md` for the vocabulary, `docs/adr/` for the decisions, and
`docs/open-questions.md` for what is deliberately still open.

## Running it

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

- Landing page — http://localhost:3000
- Play — http://localhost:3001
- API — http://localhost:4000/health

`pnpm build`, `pnpm check-types` and `pnpm test` run across every package.

## Layout

See ADR 0015. Three apps under `apps/`, one shared package under `packages/domain`.
The Dictionary and Answer Pool belong to `apps/api` and must stay there — that is
what keeps ADR 0003 true.
