# Google is the only way to sign in

_Fills in the half ADR 0022 deferred: it removed the anonymous Player and said a **Player**
now means a signed-in Player, without saying how anyone signs in._

_Amended: two names below are stale. The session cookie's domain is `wordlex.afiefabd.com`
(a leading dot is a no-op), and the redirect URI registered with Google is
`https://api.wordlex.afiefabd.com/api/auth/callback/google` — it must still match
`BETTER_AUTH_URL` exactly. See the amendment on ADR 0006._

better-auth is mounted on the API at `/api/auth/*`, with one social provider configured and
nothing else. No email and password, no magic links, no other provider. Signing in creates a
`player` row keyed to the Account, and every Game a signed-in Player starts carries that
`player_id`.

## Why one provider, and why this one

Every sign-in method is a support surface: email and password needs a reset flow, which needs
mail that arrives in Indonesia, which needs a sending domain with a reputation. Magic links
need the same mail. A second provider needs a second set of credentials to rotate, a second
console to keep access to, and an account-linking question the moment someone uses both.

None of that is work the game gets anything back for. WordleX asks for an Account for one
reason — a history that survives a lost cookie — and the cheapest honest way to offer that is
a provider almost everyone already has. Google's Android share in Indonesia makes it the one
that fails least often.

The cost is real and worth naming: someone without a Google account cannot have a history at
all. They can still play, every day, on every Track — anonymous play is a first-class path
(ADR 0022), not a trial. What they cannot have is a Streak that outlives their cookies.

Adding a second provider later is a config block and a redirect URI. Nothing in the schema
prefers Google: `player.account_id` points at better-auth's `user`, and which credential
produced that row lives in better-auth's own `account` table, where a second one just adds
rows.

## What a signed-in Player gets that an anonymous one does not

**Their Games are found by who they are, not by what they hold.** Every route that asks looks
a signed-in Player's Game up by `(player_id, daily_id)`, through one function so they cannot
disagree — a board that showed Guesses the Guess endpoint would then refuse is the bug that
shape prevents. Losing the Game token — a different browser, cleared site data, a phone — reads
and resumes the same Game rather than starting a second one, which `game_player_daily_key`
would refuse anyway. Anonymously, the token *is* the claim and losing it loses the Game
(ADR 0022).

The Game token is still set for a signed-in Player. It costs nothing and it is what the
anonymous half of every route needs anyway.

**The `Idempotency-Key` stops being a credential for them.** ADR 0024 requires a uuid on
`POST /game` because the key is what a retry is recognised by, so anyone who can produce it
gets the Game. A signed-in Player is recognised by their session instead, so the extra refusal
ADR 0024 added — a key naming a Game that already has Guesses — applies to anonymous starts
only. Resuming a Game they have already played is the whole point of being signed in.

## The one place ADR 0023 does not hold

`/api/auth/*` answers in better-auth's response shape, not in `{ data }` / `{ error }`.
better-auth's own client is what parses those bodies, and rewriting a library's responses
breaks the library. Every route this app writes is still in the envelope; this is a mounted
library, not an endpoint we designed.

The auth routes are otherwise inside everything else the app does: the Origin allowlist covers
them like any other write, `Cache-Control: private, no-store` is set for them, and the URL
better-auth sees is rebuilt on `BETTER_AUTH_URL` rather than on the `Host` header, so a
spoofed Host cannot move the origin it thinks it is serving.

## Deleting an Account, with no mail to fall back on

better-auth will delete an Account without a password when the session is **fresh**, and
otherwise wants an email verification we have no way to send. With one provider and no mail,
a re-sign-in *is* the confirmation step, so `session.freshAge` is five minutes rather than
better-auth's one day: almost every deletion is preceded by signing in again, which is the
whole protection an Account has against a walk-up on an unlocked browser. Freshness is asked
about nowhere else, so tightening it costs nothing.

What deletion does is ADR 0020's rule, unchanged: the Account goes, the Player stays,
unlinked and unreachable, with everything they played still in the database.

## Configuration, and the two ways it goes wrong

`BETTER_AUTH_SECRET` is separate from `COOKIE_SECRET` on purpose. They sign different things
with different lifetimes, and rotating the Game token's secret — which costs a day of
anonymous Games — should not sign every Account out at the same time.

The redirect URI registered with Google must match `BETTER_AUTH_URL` exactly, scheme and port
included. A mismatch fails at Google with an error the app never sees.

In production the session cookie is set on `.wordlex.com` via `AUTH_COOKIE_DOMAIN`, so one
sign-in covers all three subdomains (ADR 0006). It is unset locally, where every app is on
`localhost` and a domain-scoped cookie is neither needed nor accepted.
