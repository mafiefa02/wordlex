# Three subdomains on Vercel, with a shared auth cookie

> **Amended 2026-08-28 (the domain).** The registrable domain is
> `afiefabd.com`, not `wordlex.com`. The apps deploy to `wordlex.afiefabd.com`
> (landing), `play.wordlex.afiefabd.com` (play) and `api.wordlex.afiefabd.com`
> (API), and the session cookie's `Domain` is `wordlex.afiefabd.com`.
>
> Everything below still holds — three deployments, one shared parent, a cookie
> on it, CORS against an explicit allowlist. Only the names change, and one
> nesting level is added: the shared parent is now itself a subdomain. That is
> what keeps the cookie off the rest of `afiefabd.com`; scoping it to the
> registrable domain would send it to every other site there.
>
> A leading dot does nothing (RFC 6265 strips it), so `.wordlex.afiefabd.com`
> and `wordlex.afiefabd.com` are the same cookie.
>
> This ADR owns the topology. Where another file still says `wordlex.com`, the
> names here are the ones to read.

All three apps deploy to Vercel: the landing page at `wordlex.com`, the play app at `play.wordlex.com`, and the Fastify API at `api.wordlex.com`. Vercel supports Fastify as a first-class backend framework and deploys it with no special configuration.

better-auth lives in the Fastify app because that is what owns the database, and it sets its session cookie with `Domain=.wordlex.com` so all three subdomains can read it. This is the reason all three must sit under one registrable domain; the topology stops working the moment one of them moves elsewhere. CORS is configured with credentials against an explicit origin allowlist.

Path-routing everything behind a single origin would have avoided cross-origin concerns entirely, but it puts one proxy config in front of all three apps as a single point of failure. We preferred three independent deployments.

An earlier version of this decision put Fastify on Fly.io or Railway, on the grounds that serverless meant a cold start on every guess and no way to hold the day's Answers in memory. That reasoning no longer holds. Vercel's Fluid compute has been the default for new projects since April 2025: multiple invocations share one instance and its global state, production functions are pre-warmed, and Node 20+ bytecode is cached across cold starts. In-memory caching of the day's Answers works — as a cache, not a store, since instances still recycle.

Three things this requires:

- Pin the API's function region to Singapore (`sin1`), or every guess from Jakarta takes a trans-Pacific round trip. Hobby is single-region, which is fine for us.
- Reach Supabase through the Supavisor pooler in transaction mode. Instances scale up and down, and direct connections will exhaust the free tier.
- Watch invocation count. ADR 0003 moved the Dictionary check to the server, so invalid-word attempts are now billable invocations, and on Vercel the invocation *is* the billing unit — unlike a rented machine, where extra requests are free. Irrelevant at our traffic, but it is the one place these two decisions compound.
