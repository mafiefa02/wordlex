# @wordlex/api

Fastify server behind `api.wordlex.com`. Every Guess is scored here — the browser
never learns the Answer (ADR 0003).

```sh
cp .env.example .env
pnpm dev            # http://localhost:4000/health
```

`ALLOWED_ORIGINS` is a comma-separated allowlist, checked at boot: an empty one
stops the server rather than starting an API that rejects every browser.

**The Dictionary and the Answer Pool belong in this app and must not move.** If
they end up in a shared package, `apps/play` can import them and ADR 0003 quietly
stops being true. Neither list exists yet — nothing generates them today.

Deployed to Vercel, pinned to Singapore (`sin1`) so a Guess from Jakarta is not a
trans-Pacific round trip.
