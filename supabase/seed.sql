-- W7 League Tracker — team rosters (Playtomic snapshot, 24 May 2026).
-- Teams only; fixtures are generated in-app on demand.
-- Lower divisions are full (12). Upper divisions still filling — padded with TBC to 12.
-- Idempotent: re-running updates rows in place (keyed on division_id + seed).

insert into public.teams (division_id, seed, p1, p2, r1, r2, placeholder) values
  -- G1 (lower)
  ('g1-low', 1,  'Patrick Sturgess',     'Paula Battori',       2.08, 2.20, false),
  ('g1-low', 2,  'Mark O''Sullivan',     'Brian O''Sullivan',   2.14, 1.95, false),
  ('g1-low', 3,  'Kayleigh Sullivan',    'Leanne S',            null, 1.94, false),
  ('g1-low', 4,  'Ana J',                'Kieran Fraser',       1.32, 1.93, false),
  ('g1-low', 5,  'Mark Tindale',         'Mark Williams',       1.30, 1.92, false),
  ('g1-low', 6,  'Callum Smale',         'Ryan Tolan',          2.25, 0.59, false),
  ('g1-low', 7,  'Ross Hamilton',        'Lucy McGettigan',     1.50, 1.04, false),
  ('g1-low', 8,  'Lillian Carthy',       'Peter Dunne',         0.60, 1.87, false),
  ('g1-low', 9,  'Gary Brady',           'Ciaran O''Donoghue',  0.87, 1.30, false),
  ('g1-low', 10, 'Oce Mapp',             'John Frazer',         1.85, 0.52, false),
  ('g1-low', 11, 'Richie Carroll',       'Fionn O''Higgins',    1.29, 0.83, false),
  ('g1-low', 12, 'Shirley Deady',        'Rick Deady',          0.50, 0.50, false),

  -- G2 (lower)
  ('g2-low', 1,  'Aron Souto',           'John D',              2.22, 2.22, false),
  ('g2-low', 2,  'Andy Earls',           'Robert Keogh',        1.97, 2.30, false),
  ('g2-low', 3,  'Ciara Kavanagh',       'Grainne Ring',        1.66, 2.43, false),
  ('g2-low', 4,  'Patrick Kennelly',     'Aisling O''Brien',    1.99, 1.92, false),
  ('g2-low', 5,  'Brian McVicar',        'Lee Fitzpatrick',     1.69, 1.66, false),
  ('g2-low', 6,  'Shaun Humby',          'Thomas McKeon',       1.60, 1.61, false),
  ('g2-low', 7,  'Anton Burlihin',       'Mark Banim',          0.90, 2.03, false),
  ('g2-low', 8,  'Oisin Brown',          'Cillian Williams',    1.79, 0.79, false),
  ('g2-low', 9,  'Jack Wu',              'Peter Mitchell',      0.72, 0.82, false),
  ('g2-low', 10, 'Juliette Kidd',        'Marie Galligan',      null, 0.65, false),
  ('g2-low', 11, 'James Heron',          'Bairbre Heron',       0.59, 0.50, false),
  ('g2-low', 12, 'Eva Rybak',            'Kris Rybak',          0.50, 0.50, false),

  -- G3 (lower)
  ('g3-low', 1,  'Pat Fox',              'David Hennebry',      1.79, 3.51, false),
  ('g3-low', 2,  'Nicky Gethin Taggart', 'Claire Austen',       null, 2.34, false),
  ('g3-low', 3,  'Toby Wuyls',           'Mel Maciaine',        2.14, 2.02, false),
  ('g3-low', 4,  'Antonio Loboschi',     'Sahil Kaistha',       1.75, 2.00, false),
  ('g3-low', 5,  'Dilan Mordaunt',       'Conor Dodd',          1.88, null, false),
  ('g3-low', 6,  'Mark O''Sullivan',     'Danny Mccoy',         1.85, 1.38, false),
  ('g3-low', 7,  'Derek Connell',        'Suman Reddy',         1.36, 1.20, false),
  ('g3-low', 8,  'Wesley Wojnar',        'Tom Maguire',         1.22, null, false),
  ('g3-low', 9,  'Paula Wood',           'Conor O''Neill',      0.94, 1.41, false),
  ('g3-low', 10, 'Kerrie Beacom',        'Sandra Dunne',        null, 0.94, false),
  ('g3-low', 11, 'David VanDuyvenvoorde','Karl Lawler',         0.94, 0.97, false),
  ('g3-low', 12, 'Maria Neilan',         'Caragh Daly',         0.50, 0.50, false),

  -- G4 (upper) — 8 confirmed, 4 TBC
  ('g3-high', 1, 'Peter Finnegan',       'Davy O''Sullivan',    5.05, 4.58, false),
  ('g3-high', 2, 'Leah Spillane',        'Ashley Wynne',        3.52, 5.28, false),
  ('g3-high', 3, 'Shane Donohoe',        'Dylan Orr',           4.48, 4.01, false),
  ('g3-high', 4, 'David Kannan',         'Paul McGlade',        2.80, 5.58, false),
  ('g3-high', 5, 'Rob Lucy',             'Lee Biddulph',        4.28, 3.85, false),
  ('g3-high', 6, 'Colm Bolger',          'Brian Cornyn',        2.78, 3.78, false),
  ('g3-high', 7, 'Dylan Frazer',         'Sean Leonard',        3.42, 2.13, false),
  ('g3-high', 8, 'Gareth Murphy',        'Jim Foley',           2.52, 2.49, false),
  ('g3-high', 9,  'TBC', 'TBC', null, null, true),
  ('g3-high', 10, 'TBC', 'TBC', null, null, true),
  ('g3-high', 11, 'TBC', 'TBC', null, null, true),
  ('g3-high', 12, 'TBC', 'TBC', null, null, true),

  -- G5 (upper) — 9 confirmed, 3 TBC
  ('g4-high', 1, 'Gavin O''Donoghue',    'Barry Kelly',         3.49, 5.10, false),
  ('g4-high', 2, 'John Fitz 202',        'David',               4.76, 3.84, false),
  ('g4-high', 3, 'Robert Pickerill',     'David Hennebry',      4.43, 3.57, false),
  ('g4-high', 4, 'Dean Noble',           'Chris Ffrench',       3.94, 2.86, false),
  ('g4-high', 5, 'Matthew',              'Mike Shanahan',       3.40, 3.04, false),
  ('g4-high', 6, 'Greg Shine',           'Sam Vargas',          3.44, 2.68, false),
  ('g4-high', 7, 'Nathan Condell',       'Simon Matthews',      2.43, 3.25, false),
  ('g4-high', 8, 'Ella Tindale',         'Sahir Mangat',        2.05, 2.16, false),
  ('g4-high', 9, 'Kevin Finnegan',       'Richie Carroll',      2.00, 1.29, false),
  ('g4-high', 10, 'TBC', 'TBC', null, null, true),
  ('g4-high', 11, 'TBC', 'TBC', null, null, true),
  ('g4-high', 12, 'TBC', 'TBC', null, null, true)
on conflict (division_id, seed) do update set
  p1 = excluded.p1,
  p2 = excluded.p2,
  r1 = excluded.r1,
  r2 = excluded.r2,
  placeholder = excluded.placeholder;
