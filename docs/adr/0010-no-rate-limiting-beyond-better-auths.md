# No rate limiting beyond better-auth's own

The guess endpoint has no rate limit. Login does, because better-auth ships one. This is a deliberate no, and a future reader looking at a public, unauthenticated, server-scored endpoint will reasonably wonder whether it was an oversight.

## Why a limit wouldn't buy what it looks like it buys

The obvious fear is someone brute-forcing today's Answer. The guess budget already prevents that: a Game grants word-length + 1 Guesses and then it is over, so valid Guesses are capped by the rules of the game rather than by any limit.

The hole that actually exists is not a volume problem. An anonymous Player is a cookie, so anyone can clear it, play today's Daily as a throwaway, learn the Answer, and then solve it in one Guess on their real account. That costs one extra cookie, not a burst of traffic. No rate limit touches it, and requiring sign-up wouldn't either, since accounts are free. Wordle has the same hole.

What actually defuses it is the choice in ADR 0011 to make Badges reward breadth and persistence rather than brilliance: there is no "solved in one" achievement to farm, so the reconnaissance Game buys nothing but a prettier grid. **If Badges or Difficulty ever add a low-Guess-count achievement, this stops being true.** The fix at that point is to not award that Badge, not to rate limit harder.

## What we are therefore accepting

Cost and denial-of-service exposure on the guess endpoint. At zero users this is theoretical, and the honest reason to skip it is that we have no traffic to shape and no idea yet what normal looks like. Two things to know when it does become real:

- A limit written inside the Fastify handler does not protect the bill. On Vercel the invocation is the billing unit (ADR 0006), so a request rejected in application code has already been paid for. Cost limits belong at the edge, before the function runs.
- Per-IP limits must be generous. Indonesian mobile carriers put many customers behind a single public address, so a tight per-IP rule blocks real players in Bandung well before it blocks anyone worth blocking.

ADR 0009 considered a per-Game cap on how many Unknown Words we record, as a storage guard in place of a rate limit, and rejected it for reasons specific to that log.

## better-auth

Its defaults stand: 100 requests per 60 seconds globally, 3 per 10 seconds on `/sign-in/email`. Its rate-limit storage must be set to `database`. The default is in-memory, and Vercel runs more than one instance, so each would keep a private count and the effective limit would silently be several times what it says.
