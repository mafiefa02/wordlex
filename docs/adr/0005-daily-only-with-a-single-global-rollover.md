# Daily only, with a single global rollover at 00:00 WIB

There is no unlimited practice mode. Each of the twelve Tracks issues exactly one Daily per WordleX Day, and a player gets one Game against it. Every game a player plays is a game that counts.

The WordleX Day begins at 00:00 WIB (UTC+7) — the same instant everywhere on Earth. Three of the four launch languages are Indonesian, so the product keeps Indonesian time. Local-midnight rollover was rejected on two grounds: it splits players onto different words either side of a timezone line, which makes a shared result grid meaningless; and it would have to trust the browser's clock, which reopens exactly the streak-faking hole that server-side scoring in ADR 0003 was there to close.

Two costs we accept. Players outside Indonesia see the word flip at an arbitrary local hour. And Answer Pool depth becomes an operational concern rather than a non-issue — the thinnest Track, Sundanese 5-letter, holds roughly nine months of Dailies before it must repeat, so runway-per-Track needs to be visible somewhere we will actually look at it.
