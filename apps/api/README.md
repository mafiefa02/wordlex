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
same as discarding that Game (ADRs 0021, 0022). It also means `curl` needs
`-H "Origin: http://localhost:3001"` to write anything.

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

## The guess path

`POST /game` with `{ language, length }` is what pressing Play calls. It starts an
anonymous Game and hands back a **Game token** — a signed Game id in
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
- A word the Dictionary does not have is an **Unknown Word**: `outcome:
  "unknown_word"`, nothing scored, no row spent, one row per (Track, word,
  Player) where the Player is known and per (Track, word, Game) where it is not
  (ADR 0022). Anything else is scored, written, and may end the Game.

Every response that carries a board puts it at `game`, built one way in
`src/board.ts`, and the Answer is in it only once the Game is over. `POST /guess`
adds `outcome`; failures add `error`. There is no rate limit and that
is deliberate (ADR 0010).

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
