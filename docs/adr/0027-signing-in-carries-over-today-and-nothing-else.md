# Signing in carries over today's Games, and nothing else

_Answers what ADR 0022's amendment to ADR 0020 left open: with the anonymous Player gone,
the merge has no anonymous side, and "whatever a future slice does decide to carry over" was
never decided. This is that decision._

When a session is created, the anonymous Games this browser holds tokens for **on today's
WordleX Day** become the Player's. Nothing else moves. A Player who has not played today
carries nothing over.

## Why today and no further

Because today is all there is to carry. A Game token expires at rollover (ADR 0022), so a
browser cannot hold a claim on an older Game — the day filter in the query is not a policy on
top of what the tokens name, it is a guard against adopting a row whose token has outlived
the Game it was issued for.

The honest way to say this: ADR 0022 spent the fortnight of anonymous history, and this does
not buy it back. What it buys is the case that actually stings — someone plays today, wins,
and signs up *because* they won. Losing that Game on the way to the Account would be the
worst possible moment to lose one.

## What happens when both sides played the same Daily

The Account's Game wins and the anonymous one stays anonymous. ADR 0020's rule, unchanged:
that is the identity the Player has been deliberately building, and folding both in would
give one Player two Games against one Daily, which `CONTEXT.md` forbids and
`game_player_daily_key` enforces.

The abandoned anonymous Game is not deleted. It is a Game somebody genuinely played, its
`player_id` stays null, and that null is what the review queries already filter on (ADRs
0009, 0012).

## What deliberately does not move

**`unknown_word_attempt` rows stay anonymous, even for a Game that moves.** ADR 0020 required
every table pointing at a Player to be handled, because an anonymous *Player* row could not
be dropped while anything still referenced it. There is no such row now: those attempts key
on the Game, so leaving them collides with nothing.

The cost is a small undercount in ADR 0009's Candidate weights — a word typed today by
someone who then signed in counts as anonymous evidence rather than as a person. That is the
weaker of the two numbers and it is already visible as such. Repointing them would mean
deduplicating against whatever that Player has typed before, on a path that must not fail.

## Neither step may break signing in

The Player row is minted first, then the Games are claimed, in two separate transactions,
each swallowing its own failure. A Player who signs in and finds today's Game missing has had
a bad afternoon. A Player who cannot sign in at all has no app. Minting first means a
carry-over that fails still leaves them somewhere for tomorrow's Games to go.

The Game token cookies are left in place afterwards. They name Games that are now the
Player's, `POST /guess` still reads them, and they expire at rollover on their own.
