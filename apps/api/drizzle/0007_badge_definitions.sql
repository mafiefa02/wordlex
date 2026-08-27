-- The twelve Badges that exist (ADR 0011). Reference data, not authoring: each
-- one needs the predicate in `src/badges.ts` that earns it, and a row here with
-- no predicate is a Badge nobody can ever be awarded. The two lists are checked
-- against each other in `tests/me.test.ts`.
--
-- Rewording is a new migration that inserts the same ids, which is why this
-- overwrites the copy rather than skipping rows it has already seen.
INSERT INTO badge (id, name, description) VALUES
  ('first-win',         'First Word',       'Won your first Game.'),
  ('first-win-en',      'English',          'Won your first English Game.'),
  ('first-win-id',      'Bahasa Indonesia', 'Won your first Indonesian Game.'),
  ('first-win-su',      'Basa Sunda',       'Won your first Sundanese Game.'),
  ('first-win-jv',      'Basa Jawa',        'Won your first Javanese Game.'),
  ('all-four-in-a-day', 'Four Languages',   'Played all four languages in one WordleX Day.'),
  ('streak-7',          'Seven Days',       'A Streak of seven days.'),
  ('streak-30',         'Thirty Days',      'A Streak of thirty days.'),
  ('streak-100',        'Hundred Days',     'A Streak of a hundred days.'),
  ('all-twelve-tracks', 'Every Track',      'Played all twelve Tracks at least once.'),
  ('full-house',        'Full House',       'Played all twelve Dailies in one WordleX Day.'),
  ('week-of-one',       'Devotion',         'Seven days in a row on one language.')
ON CONFLICT (id) DO UPDATE
  SET name = excluded.name, description = excluded.description;
