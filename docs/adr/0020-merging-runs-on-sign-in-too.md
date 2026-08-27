# Every Player is a row, and merging runs on sign-in as well as sign-up

_Amended: the deletion this ADR describes now exists. `POST /api/auth/delete-user` drops the
Account and every session with it; `player.account_id` is `on delete set null`, so the Player
survives with their Games, Badges and Unknown Words intact. Nobody can reach that history
again — signing in with the same Google account afterwards is a new Player starting at zero —
and that is the trade: the play data stays as evidence for ADRs 0009 and 0012, stripped of
who it belonged to._

_Amended again: ADR 0027 decides what the merge carries. Today's Games and nothing else, with
the collision rule below unchanged and `unknown_word_attempt` deliberately left where it is._

_Amended: ADR 0022 removes the anonymous Player, so the merge no longer has an anonymous
side to run. `badge_award` in particular can never hold an anonymous row. The
collision-then-repoint rule below still applies to whatever a future slice does decide to
carry over._

_Extends ADR 0007, which covered only sign-up._

Everything that belongs to a Player — Games, Unknown Word attempts, anything added later — points at `player.id`. A `player` row carries a nullable, unique `account_id`; nothing points at better-auth's `user` table directly. The row is minted the first time someone actually starts a Game, never on page load, and the anonymous cookie holds a *signed* player id.

## The case ADR 0007 missed

ADR 0007 describes sign-up: an anonymous Player becomes an Account, and the history carries over. Signing *in* is the harder case and it was not written down.

You have an Account with forty days of history. Your session expires, or you pick up a phone where you have never signed in. You play today's Javanese-6 anonymously and win. Then you sign in. There are now two Player rows with Games, and the clean one-statement merge cannot run — you cannot set `account_id` on the anonymous Player, because the Account already has one. Worse, the two histories can overlap, and folding them together would give one Player two Games against one Daily, breaking `CONTEXT.md` outright.

This is more likely than signing out ever is. The common path is not logging out; it is playing anonymously on a phone for a week and then signing in with an account made on a laptop.

Discarding the anonymous Player would have been simplest, and it throws away Games someone genuinely played — breaking a Streak on a day they did show up, which is the exact failure ADR 0007 exists to prevent, merely moved from sign-up to sign-in. Asking them was the honest alternative, and we rejected it as a dialog at the moment a Player wants to get on with playing.

## One merge, both directions

In one transaction, and for **every** table that points at a Player: delete the anonymous Player's rows that would collide with one the Account already has, repoint the rest, then drop the anonymous row. Today that is `game` (keyed on the Daily), `unknown_word_attempt` (keyed on the word), and `badge_award` (keyed on the Badge). Missing any one of them aborts the whole merge on a unique violation — so a table that gains a `player_id` later has to be added here, not just to the schema. The Account's Game survives a collision because that is the identity the Player has been deliberately building, and a collision requires playing one Track twice in a day under two identities.

Sign-up then becomes the case where the Account's Player simply has no Games yet. better-auth's create-user hook always mints a Player row, and both paths call the same function. One code path, not two — the single-`UPDATE` version turns out to be an optimisation not worth keeping.

## Nothing else ever deletes a Player

ADR 0007 said anonymous Players "need an expiry policy or the table grows without bound". We are closing that instead of writing one.

That sentence predates minting the row only at first Game, which is what the policy was really for: without it you get a row per crawler, with it you get a row per human who played at least once. A Player row is around sixty bytes. This does not grow without bound in any sense that matters, and there is nothing personal in an anonymous Player to retain — ADR 0009 already stores no IP address.

Deleting is actively harmful. ADRs 0009 and 0012 both mine Guesses and Unknown Words for evidence that gets *better* with age; a three-year-old anonymous Game still answers "has any real person ever typed `afiun`", which ADR 0012 calls the sharp signal.

This also quietly settles a wrinkle ADR 0009 accepted. That ADR expected attempt rows to outlive their Player and Candidate weights to under-count slightly as a result. With nothing expiring and the merge repointing rows rather than orphaning them, `player_id` is never null and the case does not arise. Do not reintroduce `SET NULL` to honour that paragraph — `player_id` is part of the attempt table's primary key and cannot be nullable.

So the merge is the only thing that removes a Player, and it repoints rows before dropping one. Foreign keys to `player` are therefore `ON DELETE RESTRICT`: an accidental `DELETE FROM player` fails loudly instead of quietly nulling out the evidence. The exception is `player.account_id`, which is `ON DELETE SET NULL` — deleting an Account turns that Player anonymous again and keeps their history.
