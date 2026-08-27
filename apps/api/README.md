# @wordlex/api

Fastify server behind `api.wordlex.com`. Every Guess is scored here — the browser
never learns the Answer (ADR 0003).

```sh
cp .env.example .env
pnpm dev            # http://localhost:4000/health
```

`ALLOWED_ORIGINS` is a comma-separated allowlist, checked at boot: an empty one
stops the server rather than starting an API that rejects every browser.

**The Dictionary and the Answer Pool belong to this app and must not move.** They
are rows in one `word` table (ADR 0018), reached only through this app's connection
string — which is now the only thing keeping ADR 0003 true, so no other app gets
one. Neither list exists yet; `scripts/build-words.mjs` has to be written before
anything is playable.

Deployed to Vercel, pinned to Singapore (`sin1`) so a Guess from Jakarta is not a
trans-Pacific round trip.
