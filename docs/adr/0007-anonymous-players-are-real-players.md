# Anonymous players are real rows, and sign-up merges them

_Amended again: ADR 0022 reverses this ADR's anonymous half. An anonymous visitor gets no
`player` row at all — only a Game-scoped token — so there is nothing for sign-up to merge
and the streak this ADR set out to protect does not survive it. What follows still holds
for signed-in Players._

_Amended: signing *in* has the same problem and was not covered here — see ADR 0020, which
also closes the expiry question below. Anonymous Players are never expired._

A visitor can play without an account. The server issues an anonymous player identified by a cookie and records Games against it exactly as it would for a signed-in player — same table, same columns, same scoring path. Signing up merges the anonymous player into the new account, carrying the streak and history over.

This is a deliberate cost. The alternative — requiring sign-up — has a simpler data model with no anonymous rows, no merge path and no orphaned history to expire. We took the more complex model because Daily-only play means a curious visitor gets exactly one game, and asking them to create an account before that single game is asking for a commitment they have no basis for yet.

The merge is the one piece of this that must be correct: it runs once per player, at the moment they are most invested, and getting it wrong loses the streak that motivated the sign-up. Consequences elsewhere: every foreign key to a player must tolerate an anonymous one, and anonymous players that never sign up need an expiry policy or the table grows without bound.
