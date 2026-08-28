# TanStack Start for the play app, Next.js for the landing page

> **Amended 2026-08-28 (the board is not in the first paint).** "Start still gives
> us server rendering so the day's board is in the HTML on first paint" below is
> wrong, and cannot be made right without changing something else.
>
> The Game token is `httpOnly` and host-only to the API's origin — no `Domain`
> attribute, set by `setGameToken` in `apps/api/src/session.ts` (ADRs 0006, 0022).
> The browser therefore never sends it to `play.wordlex.afiefabd.com`, so this
> app's server cannot know which Game a visitor is playing. Neither can it ask on
> their behalf: forwarding a cookie it was never given is not something it has.
>
> What is server-rendered is the shell — the header, the Track bar, and an empty
> board of the right shape for the Track in the URL. `GET /daily/:language/:length`
> fills it in on mount. There is no flash of the wrong thing, because an empty
> board is the honest state for a visitor with no Game (ADR 0022 says so outright),
> and it is what most arrivals see anyway.
>
> **The decision itself stands, on the other half of its reasoning.** The Track
> lives in typed search params, every pill in the Track bar is a real link, and a
> junk `?length=99` falls back per field rather than erroring — that is what this
> ADR was really buying, and it is load-bearing. Server rendering is still worth
> having for the shell and for the landing page's links resolving to something
> immediately.
>
> Three ways out, none taken and none needed yet: scope the Game token to the
> shared parent domain the way the session cookie already is, which would let this
> app's server read it and hand the whole thing back to CORS reasoning; give the
> API an endpoint the play server can call with a forwarded credential; or accept
> the fetch, which is what we do. The first is the one to reach for if the empty
> first paint ever becomes a problem.

_Amended: the search params are spelled `?lang=su&length=6`. CONTEXT.md was written
after this ADR and put "mode" on the list of words to avoid, since a Track is a
language paired with a word length._

WordleX runs two different frontend frameworks on purpose. The landing page is Next.js because it is a marketing document that needs to be indexed and to render fast from the server. The play app is TanStack Start because the game board is an application: it leans on typed routes and typed search params (`?lang=su&mode=6`) to make the language/mode matrix safe to navigate, and Start still gives us server rendering so the day's board is in the HTML on first paint.

The obvious alternative was Next.js for both, dropping TanStack Router entirely. We rejected it because the language x mode x difficulty matrix lives in the URL, and hand-rolling typed search params in Next is exactly the kind of avoidable complexity this project is trying to dodge.

The cost we accept: two frameworks in one monorepo means two sets of build and deploy quirks, and TanStack Start is younger and less battle-tested than Next.js.
