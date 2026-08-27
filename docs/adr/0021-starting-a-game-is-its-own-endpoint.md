# Starting a Game is its own endpoint, and every write checks the Origin

_Amended: ADR 0022 replaces `POST /player` with `POST /game`, which issues a Game-scoped
token instead of minting a Player. Everything below about refusing an unattributable Guess,
and the whole Origin section, applies unchanged to the new endpoint._

_Implements ADR 0020's "minted the first time someone actually starts a Game". Does not
change who gets a Player row or when — it changes which request does it, and makes a
request that cannot be attributed to a Player fail instead of quietly becoming a new one._

Minting used to be a side effect of the first Guess: a `POST /guess` with no usable cookie
created a Player and carried on. That is one fewer round trip and it reads fine, but it
means the server can never tell "this is someone's first Guess" from "this Guess belongs
to nobody". Those need different answers.

So `POST /player` is what pressing Play calls. It mints a Player and sets the signed
cookie, and it is idempotent — a browser that already has a usable cookie keeps its
Player, so pressing Play twice is one row. `POST /guess` then refuses a request it cannot
attribute, with a 401, rather than minting one.

## Why a Guess with no cookie is refused rather than healed

A cleared anonymous cookie cannot be recovered. The cookie *is* the identity (ADR 0007),
and every scheme for recovering it — a game id in `localStorage`, a recovery token, a
fingerprint — is either another copy of that same secret in a place the browser clears at
the same moment, or a way to claim somebody else's history. There is no version of this
that works, which is what ADR 0020's merge-on-sign-in is for: an Account is the durable
identity, and anonymous play is not.

Given that, minting on a Guess from an unknown browser is worse than refusing. The Player
has no Game against today's Daily, so they get a fresh, fully playable board — the day
restarts. That is a restart wearing a recovery's clothes, and it is the reconnaissance
hole ADR 0010 describes, promoted into a supported flow.

**A client must not answer that 401 by calling `POST /player` and retrying.** Doing so
rebuilds exactly what the refusal removes and adds a round trip for it. The 401 has to be
visible to the person, not healed under them.

## What the split does not buy

It does not stop a script creating Players. Where forging one used to cost one request it
now costs two, and that is all. Nothing gates `POST /player` today, which matters because
ADR 0009 weights its Candidate review queue by the number of *distinct* Players who typed
a word — so that weight is forgeable, and it is forgeable in a way ADR 0009's schema
cannot catch. That is recorded in `docs/open-questions.md` rather than solved here: at
zero traffic there is no way to tell a script from a launch, which is ADR 0010's own
argument for waiting. The point of the split is that when it is time, there is one
once-per-human endpoint to hang a challenge on instead of the hot path.

## The Origin check the split forced

A dedicated mint endpoint is a state-changing `POST` that a browser will send cookies
with. That is a CSRF target, and the first version was vulnerable.

CORS does not help. It gates *reading* a response, not sending the request. A cross-site
form post is never preflighted, and `enctype="text/plain"` reaches Fastify's built-in
parser as a **top-level navigation**, which third-party cookie blocking does not touch.
The handler never reads the body, so no payload is needed.

`SameSite=Lax` inverts into the attack rather than defending against it. On a cross-site
POST the victim's cookie is withheld — so the handler sees no Player, mints one, and
overwrites the cookie that was already there at `Path=/`. Their Games, Streak and Badges
are then unreachable, permanently, from a page they merely visited.

So every request that is not `GET`, `HEAD` or `OPTIONS` must carry an `Origin` header
that is in `ALLOWED_ORIGINS`, or it is refused with 403. A missing `Origin` is refused
too: for a write, failing closed is right, and browsers have sent `Origin` on POSTs for
years.

`ALLOWED_ORIGINS` therefore does two jobs now — CORS, and this. ADR 0006 already required
it to be an explicit allowlist and never a wildcard; that requirement is now load-bearing
for more than CORS.

## Costs we accept

One extra round trip before a Player's first Guess of their life, on a path that is
already a deliberate click.

`curl` and anything else scripted needs `-H "Origin: …"` to write. This is mildly annoying
in exactly the way it is supposed to be.

A client that forgets the header fails closed with a 403 rather than degrading, which is
the correct direction but is worth knowing before debugging one.

better-auth is not mounted yet. When it is, its routes sit under this hook and will need
checking against its own CSRF handling rather than being assumed to fit.
