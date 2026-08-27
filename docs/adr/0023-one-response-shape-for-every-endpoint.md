# One response shape for every endpoint

Every response the API sends is one of two shapes:

```jsonc
{ "data": { /* the payload */ } }

{ "error": { "code": "NO_GAME_TOKEN", "message": "…", "details": { /* optional */ } } }
```

The top-level key is the discriminant. `data` present means it worked; `error` present
means it did not. The status code confirms which, rather than being the only way to tell.

`error.code` comes from a closed union in `apps/api/src/http.ts` and is the contract.
`error.message` is for a human reading a log and may be reworded at any time — nothing
may parse it.

## Why

Before this the API had three success shapes and one error shape, and the error shape was
a bare sentence:

| | was |
|---|---|
| `GET /health` | `{ ok, day }` |
| `GET /daily/:language/:length`, `POST /game` | `{ game }` |
| `POST /guess` | `{ outcome, game }` |
| any failure | `{ error: "no Game token: press Play to start a Game" }` |

Two problems, and the second is the one that would have hurt.

**The payload had no fixed home.** A client had to know per route whether to read the root
or a key, so no shared code could handle a response before knowing which route produced it.

**The only machine-readable part of a failure was the status code, and a status code is
too coarse.** `POST /guess` answered both "your body is the wrong shape" and "that is not
five characters of a-z" with a 400, and a client wants to render those very differently —
one is a bug, the other is a typo the Player can fix. The only thing that separated them
was the prose, which made the prose the contract: reword a message and something breaks.
That is Hyrum's Law arriving through the least convenient door. A `code` gives the
difference a name that is safe to depend on and leaves the sentence free.

## What this decides

**A failure carries state in exactly one place.** `POST /guess` against a finished Game is
a 409 with `code: "GAME_OVER"` and the finished board at `error.details.game`, so the
client can render the ending without a second round trip. `details` exists for this and
nothing else does it today. Everywhere else, a failure is a failure and carries no payload.

**Responses no handler wrote are in the envelope too.** `build-app.ts` (then named `app.ts`) sets a not-found handler
and an error handler, because otherwise an unknown route and any uncaught throw answer in
Fastify's `{ statusCode, error, message }` — and "consistent across every endpoint" is not
true if the two responses that skip every endpoint are shaped differently. A 5xx says
`INTERNAL_ERROR` with a fixed message; the real reason goes to the log, never to a browser.

**`/health` is wrapped, not exempted.** `{ data: { ok: true, day } }` reads slightly worse
under `curl`, and a probe checks `.data.ok`. Wrapped anyway: an endpoint excused because it
is "only a health check" is how a convention starts collecting exceptions.

**Enum values on the wire stay lowercase; `error.code` is UPPER_SNAKE.** `playing`, `won`,
`lost`, `abandoned` are a Postgres enum and `exact`, `present`, `absent` come from
`packages/domain`. Upper-casing them at the boundary would buy a mapping layer and nothing
else. `error.code` is new and tied to nothing, so it takes the conventional shouting case —
which has the happy side effect of making the two kinds of value distinguishable on sight.

**`POST /guess` keeps its discriminated union.** `outcome: "scored" | "unknown_word"` under
`data`, with `word` present only on the second. Varying by a tagged field is the pattern,
not a violation of it.

## What was considered and not done

**Status codes are unchanged.** `GET /daily/en/4` is a 400 where a 404 is arguably more
correct, and `POST /game` returns 200 even when it creates. The second is deliberate beyond
inertia: the endpoint resumes *or* creates, and a 201 would tell the caller which happened
— exactly the kind of observable detail someone then depends on. This ADR is about shape.

**The wire types stay in `apps/api`.** `apps/play` fetches nothing yet. When it does, the
coupling that decides the move is `Board["status"]`, which is read off the Drizzle schema
(`typeof gameStatus.enumValues[number]`); relocating it to `packages/domain` means writing
that union by hand and asserting the database enum still matches.

## Migration

None. `apps/play` fetches no endpoint yet, which is why this landed now rather than later —
it is the cheapest this convention will ever be.
