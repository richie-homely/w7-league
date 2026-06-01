-- W7 League Tracker — team rosters (Playtomic snapshot, 24 May 2026).
-- Snake draft rebalance applied 30 May 2026.
-- 1 Jun 2026: +3 upper-tier entrants slotted in by rating (Cian Haddock & Conn
--   Kinsella → G4, Stevan O'Toole → G5); Richie Carroll 1.29 → 1.40.
-- Lower tier totals (combined ratings): G1 31.22 | G2 31.09 | G3 31.19
-- Upper tier is provisional — 2 TBC slots remain (G4 seed 12, G5 seed 12).
--   Balanced slot-in only (G4 71.97 / G5 73.08); re-run the upper tier snake
--   draft once the final two teams are confirmed and the tier is at 24/24.
-- Teams only; fixtures are generated in-app on demand.
-- Idempotent: re-running updates rows in place (keyed on division_id + seed).

insert into public.teams (division_id, seed, p1, p2, r1, r2, placeholder) values

  -- ── G1 (lower) ───────────────────────────────────────────────────────────────
  ('g1-low',  1, 'Aron Souto',            'John D',              2.22, 2.22, false),
  ('g1-low',  2, 'Ciara Kavanagh',        'Grainne Ring',        1.66, 2.43, false),
  ('g1-low',  3, 'Patrick Kennelly',      'Aisling O''Brien',    1.99, 1.92, false),
  ('g1-low',  4, 'Mark Tindale',          'Mark Williams',       1.30, 1.92, false),
  ('g1-low',  5, 'Shaun Humby',           'Thomas McKeon',       1.60, 1.61, false),
  ('g1-low',  6, 'Derek Connell',         'Suman Reddy',         1.36, 1.20, false),
  ('g1-low',  7, 'Ross Hamilton',         'Lucy McGettigan',     1.50, 1.04, false),
  ('g1-low',  8, 'Gary Brady',            'Ciaran O''Donoghue',  0.87, 1.30, false),
  ('g1-low',  9, 'Richie Carroll',        'Fionn O''Higgins',    1.29, 0.83, false),
  ('g1-low', 10, 'Wesley Wojnar',         'Tom Maguire',         1.22, null, false),
  ('g1-low', 11, 'James Heron',           'Bairbre Heron',       0.59, 0.50, false),
  ('g1-low', 12, 'Juliette Kidd',         'Marie Galligan',      null, 0.65, false),

  -- ── G2 (lower) ───────────────────────────────────────────────────────────────
  ('g2-low',  1, 'Patrick Sturgess',      'Paula Battori',       2.08, 2.20, false),
  ('g2-low',  2, 'Mark O''Sullivan 1',    'Brian O''Sullivan',   2.14, 1.95, false),
  ('g2-low',  3, 'Antonio Loboschi',      'Sahil Kaistha',       1.75, 2.00, false),
  ('g2-low',  4, 'Mark O''Sullivan 2',    'Danny Mccoy',         1.85, 1.38, false),
  ('g2-low',  5, 'Anton Burlihin',        'Mark Banim',          0.90, 2.03, false),
  ('g2-low',  6, 'Oisin Brown',           'Cillian Williams',    1.79, 0.79, false),
  ('g2-low',  7, 'Lillian Carthy',        'Peter Dunne',         0.60, 1.87, false),
  ('g2-low',  8, 'Nicky Gethin Taggart',  'Claire Austen',       null, 2.34, false),
  ('g2-low',  9, 'Kayleigh Sullivan',     'Leanne S',            null, 1.94, false),
  ('g2-low', 10, 'Jack Wu',               'Peter Mitchell',      0.72, 0.82, false),
  ('g2-low', 11, 'Shirley Deady',         'Rick Deady',          0.50, 0.50, false),
  ('g2-low', 12, 'Kerrie Beacom',         'Sandra Dunne',        null, 0.94, false),

  -- ── G3 (lower) ───────────────────────────────────────────────────────────────
  ('g3-low',  1, 'Andy Earls',            'Robert Keogh',        1.97, 2.30, false),
  ('g3-low',  2, 'Toby Wuyls',            'Mel Maciaine',        2.14, 2.02, false),
  ('g3-low',  3, 'Brian McVicar',         'Lee Fitzpatrick',     1.69, 1.66, false),
  ('g3-low',  4, 'Ana J',                 'Kieran Fraser',       1.32, 1.93, false),
  ('g3-low',  5, 'Callum Smale',          'Ryan Tolan',          2.25, 0.59, false),
  ('g3-low',  6, 'Kerry Callery',         'Niamh Cassidy',       1.20, 1.61, false),
  ('g3-low',  7, 'Oce Mapp',              'John Frazer',         1.85, 0.52, false),
  ('g3-low',  8, 'Paula Wood',            'Conor O''Neill',      0.94, 1.41, false),
  ('g3-low',  9, 'David VanDuyvenvoorde', 'Karl Lawler',         0.94, 0.97, false),
  ('g3-low', 10, 'Dilan Mordaunt',        'Conor Dodd',          1.88, null, false),
  ('g3-low', 11, 'Eva Rybak',             'Kris Rybak',          0.50, 0.50, false),
  ('g3-low', 12, 'Maria Neilan',          'Caragh Daly',         0.50, 0.50, false),

  -- ── G4 (upper) — provisional, 1 TBC slot ─────────────────────────────────────
  ('g3-high',  1, 'Peter Finnegan',       'Davy O''Sullivan',    5.05, 4.58, false),
  ('g3-high',  2, 'Gavin O''Donoghue',    'Barry Kelly',         3.49, 5.10, false),
  ('g3-high',  3, 'Shane Donohoe',        'Dylan Orr',           4.48, 4.01, false),
  ('g3-high',  4, 'Robert Pickerill',     'David Hennebry',      4.43, 3.57, false),
  ('g3-high',  5, 'Dean Noble',           'Chris Ffrench',       3.94, 2.86, false),
  ('g3-high',  6, 'Greg Shine',           'Sam Vargas',          3.44, 2.88, false),
  ('g3-high',  7, 'Nathan Condell',       'Simon Matthews',      2.43, 3.25, false),
  ('g3-high',  8, 'Richie Cotter',        'Ronan Royce',         2.39, 2.85, false),
  ('g3-high',  9, 'Gareth Murphy',        'Jim Foley',           2.52, 2.49, false),
  ('g3-high', 10, 'Cian Haddock',         'Andras Bondar',       3.07, 1.60, false),
  ('g3-high', 11, 'Conn Kinsella',        'Kasey Clark',         0.89, 2.65, false),
  ('g3-high', 12, 'TBC',                  'TBC',                 null, null, true),

  -- ── G5 (upper) — provisional, 1 TBC slot ─────────────────────────────────────
  ('g4-high',  1, 'Leah Spillane',        'Ashley Wynne',        3.52, 5.28, false),
  ('g4-high',  2, 'John Fitz 202',        'David',               4.76, 3.84, false),
  ('g4-high',  3, 'David Kennan',         'Paul McGlade',        2.80, 5.58, false),
  ('g4-high',  4, 'Rob Lucy',             'Lee Biddulph',        4.28, 3.85, false),
  ('g4-high',  5, 'Stevan O''Toole',      'Padraic Bermingham',  2.83, 4.57, false),
  ('g4-high',  6, 'Colm Bolger',          'Brian Cornyn',        2.78, 3.78, false),
  ('g4-high',  7, 'Matthew',              'Mike Shanahan',       3.40, 3.04, false),
  ('g4-high',  8, 'Jack Furlong',         'Dylan Furlong',       2.72, 2.89, false),
  ('g4-high',  9, 'Dylan Frazer',         'Sean Leonard',        3.42, 2.13, false),
  ('g4-high', 10, 'Ella Tindale',         'Sahir Mangat',        2.05, 2.16, false),
  ('g4-high', 11, 'Kevin Finnegan',       'Richie Carroll',      2.00, 1.40, false),
  ('g4-high', 12, 'TBC',                  'TBC',                 null, null, true)

on conflict (division_id, seed) do update set
  p1          = excluded.p1,
  p2          = excluded.p2,
  r1          = excluded.r1,
  r2          = excluded.r2,
  placeholder = excluded.placeholder;
