# @wordlex/api

Fastify server behind `api.wordlex.com`. Every Guess is scored here — the browser
never learns the Answer (ADR 0003).

```sh
docker compose -f ../../docker-compose.yml up -d --wait
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
#   ^ paste into COOKIE_SECRET, which ships blank so the server says so
pnpm db:migrate
pnpm db:seed                  # 124k rows from data/words.csv
pnpm dev                      # http://localhost:4000/health
```

`ALLOWED_ORIGINS` is a comma-separated allowlist, checked at boot: an empty one
stops the server rather than starting an API that rejects every browser. It does
two jobs — CORS, and a check on every write. **Any POST without an allowlisted
`Origin` header is refused with 403**, because CORS only gates reading a
response, and a cross-site form POST is never preflighted. Without that, an
attacker's page could POST to `/game` and overwrite a Game token, which is the
same as discarding that Game (ADRs 0021, 0022).

Every write also needs an `Idempotency-Key` holding a **uuid** (ADR 0024), so `curl`
needs both:

```sh
curl -X POST localhost:4000/game -b jar -c jar \
  -H "Origin: http://localhost:3001" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" -d '{"language":"en","length":5}'
```

The Game token is a cookie on a different origin to the play app, so the browser
sends it only with `credentials: "include"` on every `fetch`, and `curl` needs
`-b`/`-c`. Without it every write is a 401 that looks exactly like a lost token.
`COOKIE_SECRET` signs the Game token and must be at least 32 characters;
`.env.example` says how to generate one. `NODE_ENV` decides only
whether that cookie is `Secure`, and only an explicit `development` or `test`
turns it off — a deploy that never sets it still gets `Secure`.

**An `.env` from before that variable existed needs `NODE_ENV=development` added.**
Without it the Game token is `Secure` over `http://localhost`. Chrome and
Firefox allow that; Safari drops the cookie, so every Guess returns 401 with
nothing to say why. The server logs which way it resolved at boot.

## Tests

```sh
docker compose -f ../../docker-compose.yml up -d --wait db-test
pnpm test
```

`db-test` is a second container on 5433, and the suite refuses to run on 5432 —
it truncates every table before each test, and one exported `DATABASE_URL`
pointing at the container you develop against would empty it instead.
`tests/setup-env.ts` overwrites the connection unconditionally for the same
reason, and `tests/config.ts` is the only place the URL is written down.

It is a second *container* and not a second database because migration `0000`
creates `pg_cron`, which installs into exactly one database named at server
start — the same trap the section below describes. Its data directory is a
tmpfs, so every run migrates `drizzle/` from nothing, which is the point: the
migrations are part of what is under test.

The tests drive the app through `app.inject()` rather than a port, which is why
`buildApp()` lives in `src/app.ts` and `src/server.ts` is four lines. Each
Track's Answer Pool is seeded with exactly one word, so `random()` in
`wordlex_issue_daily` has nothing to choose between and today's Answer is known
before a test starts. `browser()` in `tests/helpers.ts` keeps the Game token the
API sets and sends it back, since a Game is resumable by nothing else.

`turbo run test` never caches this: the suite needs a live database, and both it
and `packages/domain`'s cross the 00:00 WIB boundary, so yesterday's pass is not
evidence about today.

## The guess path

`POST /game` with `{ language, length }` and an `Idempotency-Key` is what pressing Play
calls. It starts an anonymous Game and hands back a **Game token** — a signed Game id in
`wordlex_game_<language>_<length>`, expiring at the end of that WordleX Day
(ADR 0022). It resumes the Game a valid token already names, so pressing Play
twice is one Game, and it is the only thing that creates one.

`POST /guess` returns **401** without a token naming a Game against today's
Daily on that Track. A Guess never starts a Game: a browser that discarded its
token would otherwise silently restart the day. A client must not answer that
401 by calling `POST /game` and retrying — that rebuilds what the refusal
removes.

Losing the token loses that Game, with no recovery. There is no anonymous
Player to recover *to*: `game.player_id` is null for anonymous play, and that
null is the flag review queries filter on, because evidence that cannot be
attributed to a person is weaker for both ADR 0009's Candidate weights and ADR
0012's Solve Rate.

`GET /daily/:language/:length` is today's board for one Track: the WordleX Day,
the Guesses so far with their Marks, and the Answer once the Game is over. It
**creates nothing** — a visitor with no Game token gets an empty board, and only
`POST /game` ever starts one (ADR 0022). It does issue the Daily before reading
it, which ADR 0019 asks of every read path.

`POST /guess` with `{ language, length, word }` does everything ADR 0003 puts on
the server, in one transaction:

- Folds the word the way `scripts/build-words.mjs` folded it. Wrong length or
  anything outside `a-z` is a 400 that never reaches the Dictionary and is never
  recorded (ADR 0009).
- Issues today's Daily if it somehow has none, then reads it (ADR 0019).
- Requires a Game token for that Track and today's Daily. Creates nothing.
- Requires an `Idempotency-Key`, and replays rather than re-spending a row if it has
  seen that key against this Game before (ADR 0024).
- A word the Dictionary does not have is an **Unknown Word**: `data.outcome:
  "unknown_word"`, nothing scored, no row spent, one row per (Track, word,
  Player) where the Player is known and per (Track, word, Game) where it is not
  (ADR 0022). Anything else is scored, written, and may end the Game.

### The response shape

Every response is `{ data }` or `{ error }` and nothing else, including the ones no
handler wrote — an unknown route and an uncaught throw go through `setNotFoundHandler`
and `setErrorHandler` in `src/app.ts` so they cannot answer in Fastify's own shape
(ADR 0023).

```jsonc
{ "data": { "game": { "day": "2026-08-27", "status": "playing", "guesses": [] } } }
{ "data": { "outcome": "scored", "game": { … } } }
{ "data": { "outcome": "unknown_word", "word": "zzzzz", "game": { … } } }

{ "error": { "code": "NO_GAME_TOKEN", "message": "no Game token: press Play to start a Game" } }
```

`error.code` is the contract and comes from a closed union in `src/http.ts`;
`error.message` is for a human reading a log and may be reworded, so nothing may parse
it. The codes: `VALIDATION_ERROR`, `MALFORMED_WORD`, `IDEMPOTENCY_KEY_REQUIRED` (400),
`REQUEST_REJECTED` (any 4xx Fastify raised before a handler ran), `NO_GAME_TOKEN` (401),
`ORIGIN_NOT_ALLOWED` (403), `NOT_FOUND` (404), `GAME_OVER` (409),
`IDEMPOTENCY_KEY_REUSED` (422), `INTERNAL_ERROR` (500), `TRACK_UNAVAILABLE` (503).

Every response that carries a board puts it at `data.game`, built one way in
`src/board.ts`, and the Answer is in it only once the Game is over. **One failure carries
a board**: a Guess against a finished Game is a 409 whose `error.details.game` is the
finished board, so the client can render the ending without asking again. No other
failure carries a payload.

### Retrying a write

Both writes require an `Idempotency-Key` header holding a uuid, and are safe to retry under
the same one (ADR 0024). Call `crypto.randomUUID()` when the intent is formed — pressing
Play, composing a submission — and reuse it on every retry of that same thing. A fresh key
per attempt is not a retry; it is a new request, and will be treated as one.

**On `POST /game` the key is a credential.** It hands back a Game token, so whoever can
produce the key gets the Game. It must be random per press and must never be derived from
anything guessable — `start:en:5` would be the same string for every Player on that Track.
That is why a uuid is required rather than any string, and why a key naming a Game that
already has Guesses is refused outright.

- `POST /game` under a key that already named a Game hands that Game back, token included.
  Two presses racing under one key are one Game.
- `POST /guess` under a key that already named a Guess replays it: no second row is spent,
  and the reply is the board as it stands now rather than a copy of the first response. This
  holds for the *winning* Guess too — the key is checked before the Game's status, so a
  retry gets `outcome: "scored"` and the won board, never `GAME_OVER`.
- The same key with a different word is `422 IDEMPOTENCY_KEY_REUSED`, not a replay — and so
  is a key naming a Game that someone has already played.
- A duplicate arriving while the first is still in flight waits for it and gets its answer.

An Unknown Word records no key and needs none: it spends no row and its log insert already
collapses repeats.

There is no rate limit and that is deliberate (ADR 0010).

**The Dictionary and the Answer Pool belong to this app and must not move.** They
are rows in one `word` table (ADR 0018), reached only through this app's connection
string — which is now the only thing keeping ADR 0003 true, so no other app gets
one.

`pnpm db:seed` loads `data/words.csv`, which `scripts/build-words.mjs` at the repo
root builds from ADR 0004's sources. Neither is run automatically: regenerating
is a deliberate act perhaps twice a year, and the diff is the point. **The seed
never overwrites a reviewer** — it upserts only rows still marked `derived` with
no `reviewed_at`, or re-running the derivation would resurrect every word a
speaker rejected.

## The database

Two connections. `DATABASE_URL` is the app's, through Supavisor in transaction
mode, which is why the client is built with `prepare: false` (ADR 0015).
`DIRECT_URL` is port 5432 and is what migrations and seeding use, because
transaction-mode pooling gives out a different backend per statement and DDL
cannot rely on that. Locally both point at the same container.

`badge` holds every Badge that exists and `badge_award.badge` is a foreign key
into it, so an award always joins to a definition rather than being free text.
It ships empty: a Badge needs the query that awards it (ADR 0011), which is
code, so rows arrive with that slice rather than being authored in the database.

`src/db/schema.ts` is ours; `src/db/auth-schema.ts` is better-auth's, generated by
its CLI and committed. drizzle-kit owns every migration either way — better-auth
never issues DDL. Regenerate with:

```sh
npx @better-auth/cli@latest generate --config src/auth.ts --output src/db/auth-schema.ts
pnpm db:generate
```

`drizzle/0000_init.sql` also carries hand-written SQL that Drizzle cannot express:
`wordlex_day()`, the picker both the rollover and the read path call, the trigger
that freezes a live Daily, and the `pg_cron` schedule (ADR 0019). Anything of that
kind goes at the end of a generated migration, never in a file of its own.

One trap for a scratch or CI database: migration `0000` runs
`CREATE EXTENSION pg_cron`, and pg_cron only installs into the one database named
by `cron.database_name` at server start — which is why `docker-compose.yml` sets
`POSTGRES_DB: postgres` and says so. Point `DIRECT_URL` at any other database and
`db:migrate` hangs on that statement rather than failing.

Deployed to Vercel, pinned to Singapore (`sin1`) so a Guess from Jakarta is not a
trans-Pacific round trip.
