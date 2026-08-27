# A Streak counts days won, and a Game counts as played once it has a Guess

_Settles the Streak scope ADR 0008 deliberately left open, and amends `CONTEXT.md`, whose
**Streak** entry said "days on which a Player played"._

A **Streak** is consecutive WordleX Days on which a Player **won at least one Game, on any
Track**. One number, not one per language. A day with no win breaks it, whether they played
and lost or never showed up.

Separately, and everywhere else that counts: a Game counts as **played** once it has at
least one Guess.

## Why winning, and why one number

The alternative was days *played*, which is what `CONTEXT.md` said and what most of these
games count. It rewards opening the app, and opening the app is one request. A Streak that
survives typing nothing is a number about habit, not about the game, and a Player who works
that out stops believing it.

One number across all twelve Tracks rather than one per language follows ADR 0011's whole
argument: WordleX rewards breadth, and per-language Streaks punish it. Twelve Streaks would
mean a Player who plays Javanese one day and Sundanese the next has broken two of them,
which is the exact behaviour the Badges exist to encourage.

The cost: a Player having a bad week on one Track can protect their Streak by winning an
easy English Daily instead. That is fine. Showing up somewhere is what the number is about,
and ADR 0011 already refused to reward difficulty.

Nothing is stored (ADR 0008). The Streak is `streak()` in `packages/domain` over the days a
Player won, computed on the way out, so this rule can change again and be right about last
year when it does.

## Why a Guess is what makes a Game count

`POST /game` creates a Game (ADRs 0021, 0022) and pressing Play costs one request. Without a
floor, "played all four languages in one WordleX Day" is four clicks and no words, and the
contribution graph shades a day nobody played on.

So the Badges that count breadth, and the contribution graph behind ADR 0014, both filter on
`guesses > 0`. The Streak needs no such filter — you cannot win without guessing.

This also answers the question `docs/open-questions.md` held open about zero-Guess Games:
they are swept to `abandoned` at rollover along with everyone else who did not finish, which
is what the rollover already did, and they are excluded from the denominator of a word's
Solve Rate (see the amendment to ADR 0012). A Game nobody typed into is evidence about
nothing.
