# WordleX

A daily word-guessing game in the Wordle tradition, played across four languages (English, Bahasa Indonesia, Sundanese, Javanese) and multiple word lengths, with persistent player profiles.

## Language

### The board

**Tile**:
One square on the board, holding exactly one Latin character.
_Avoid_: cell, box, letter

**Guess**:
One complete row of Tiles the player submits for scoring.
_Avoid_: attempt, try, word (a Guess is a word, but not every word is a Guess)

**Answer**:
The secret word a Player is trying to find. Never sent to the browser until the Game is over.
_Avoid_: solution, target, secret word

**Mark**:
The result the server assigns to a single Tile in a scored Guess — `exact`, `present`, or `absent`.
_Avoid_: green/yellow/grey (those are the presentation, not the concept), state, status

### Words

**Dictionary**:
The set of words a Player is *allowed to type* in a given language and length. Not a secret, but server-only all the same.
_Avoid_: word list, valid words, allowed guesses

**Answer Pool**:
The much smaller, curated set of words that can be chosen as an Answer. Server-only.
_Avoid_: word list, solutions

**Unknown Word**:
A word a Player submitted that isn't in the Dictionary. Named for our ignorance, not the Player's — it may well be a real word our list is missing.
_Avoid_: invalid word, bad guess, typo, rejected guess

**Candidate**:
An Unknown Word that enough distinct Players have tried to be worth a speaker looking at.
_Avoid_: suggestion, submission, pending word

**Solve Rate**:
The share of Games against a given Answer that were won. Weak evidence a word is bad, since hard words are real words.
_Avoid_: success rate, win rate (a Player has a win rate; a word has a Solve Rate)

### People

**Player**:
Anyone playing WordleX, whether signed in or not. Games belong to Players.
_Avoid_: user, visitor, guest

**Account**:
The signed-in identity a Player can claim, which makes their history durable.
_Avoid_: user, profile (a profile is what an Account displays, not the Account itself)

### Time and structure

**Track**:
A language paired with a word length — Sundanese 5, Javanese 7, and so on. Twelve exist.
_Avoid_: mode, variant, category, channel

**WordleX Day**:
The 24 hours beginning at 00:00 WIB (UTC+7). The same instant worldwide, and the unit everything is counted in.
_Avoid_: today, date, day (unqualified)

**Daily**:
The one Answer issued to a Track for a given WordleX Day. Every player on that Track gets the same one.
_Avoid_: puzzle, today's word, round

**Game**:
One Player's attempt at one Daily — word length plus one Guesses, ending in a win or a loss.
_Avoid_: session, play, round, match

### Progress

**Streak**:
A run of consecutive WordleX Days on which a Player played. Always derived from Game history, never stored as a counter.
_Avoid_: run, chain, combo

**Badge**:
A named achievement a Player has earned, awarded for breadth across languages or persistence over time.
_Avoid_: achievement, trophy, award

## Relationships

- A **Guess** is made of **Tiles**; scoring a Guess produces one **Mark** per Tile
- Every **Answer** is in the **Answer Pool**; every word in the **Answer Pool** is also in the **Dictionary**
- The reverse is not true: most **Dictionary** words are never **Answers**
- Each **Track** has its own **Dictionary** and **Answer Pool**
- An **Unknown Word** is *not* a **Guess** — it is never scored and never spends a row
- Enough distinct **Players** submitting the same **Unknown Word** makes it a **Candidate**; only a human turns a **Candidate** into a **Dictionary** entry
- A low **Solve Rate** flags an **Answer Pool** word for review; it never removes one
- A **Track** has exactly one **Daily** per **WordleX Day**; a **Player** has at most one **Game** per **Daily**
- All twelve **Dailies** are open every **WordleX Day** — a **Player** may play as many as they like
- An **Account** owns one **Player**; a **Player** may exist without an **Account**

## Example dialogue

> **Dev:** "If someone types a real word that's just obscure, do we reject it?"
> **Domain expert:** "No — if it's in the **Dictionary** it's a legal **Guess**. The **Answer Pool** is separate and much smaller, because nobody wants to be asked to guess an obscure word."
> **Dev:** "So KUCING is six **Tiles**, not five with an NG **Tile**?"
> **Domain expert:** "Six. One Latin character per **Tile**, in every language."
>
> **Dev:** "If I'm in London, is my **Daily** the same as someone's in Bandung?"
> **Domain expert:** "Yes. There's one **WordleX Day** for the whole world and it starts at midnight in Jakarta. Your **Daily** flips at 5pm your time — that's the trade we made so shared grids always compare."
>
> **Dev:** "If I play English and Javanese on the same day, is that one **Game** or two?"
> **Domain expert:** "Two. All twelve **Dailies** are open every day. The rule is one **Game** per **Daily**, not one per day."
>
> **Dev:** "So if I type a Sundanese word we don't have, I've wasted a **Guess**?"
> **Domain expert:** "No — that's an **Unknown Word**, not a **Guess**. Nothing is scored and you keep your row. And we write it down, because you're probably right and we're probably missing it."

## Flagged ambiguities

- "letter" was used to mean both a written character and a **Tile** — resolved: one Latin character is one **Tile**, so in WordleX they coincide by design. Say **Tile** when talking about the board.
- "word list" was used for both the **Dictionary** and the **Answer Pool** — resolved: these are distinct, differently-sized, and have different secrecy rules.
- "game mode" was used for both the word-length choice and for difficulty — partly resolved: word length is part of a **Track**. **Difficulty** is a separate axis and is deliberately still undefined; it has no entry here until it means something specific.
- "day" is ambiguous across timezones — resolved: always say **WordleX Day**, which is fixed to WIB.
- "invalid word" implied the Player was wrong — resolved: it is an **Unknown Word**, because with Dictionaries this thin the list is at least as likely to be at fault as the Player.
- "user" was used for both the **Player** and the **Account** — resolved: these are distinct, because a **Player** can exist with no **Account** at all.
- **Streak** scope is deliberately undecided — whether it is one number across all **Tracks** or one per language, and whether losing breaks it, are open. The data is stored so either can be derived later.
