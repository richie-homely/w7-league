-- W7 Box League — launch prep (generated 4 Sep 2026 by build from the Playtomic Players sheet, extract 1 Sep)
-- Run in the Supabase SQL editor. Three parts; each is safe to re-run.

-- ── PART 1: team contact emails (what the self-serve score entry validates against) ──
-- 125 of 134 roster players matched (119 by exact name + 6 by rating); every team has at least one contact. to a Playtomic account email by name. Unmatched players are
-- listed at the end for manual entry — a team with NO contact cannot submit or confirm a result.
insert into public.box_team_contacts (team_id, email) values
  ('ef27c047-a4c8-42ef-935a-6245c22b47fc', 'swdonoh@gmail.com')  -- box 1 · Shane Donohoe,
  ('ef27c047-a4c8-42ef-935a-6245c22b47fc', 'dylanorr7@gmail.com')  -- box 1 · Dylan Orr,
  ('498ffd8b-74ee-42eb-aff8-a75f04623fe4', 'david.osullivan658@gmail.com')  -- box 1 · Davy O''Sullivan,
  ('498ffd8b-74ee-42eb-aff8-a75f04623fe4', 'davidmhennebry7@gmail.com')  -- box 1 · David Hennebry,
  ('0ebdfafd-c2ad-459f-b31e-42c7e3f2587f', 'jpftcomerford@gmail.com')  -- box 1 · J.P. Comerford,
  ('0ebdfafd-c2ad-459f-b31e-42c7e3f2587f', 'booms86@gmail.com')  -- box 1 · Conor Ruttledge,
  ('3fc6509d-ed1e-41a6-b565-feb27a40d4f4', 'tomas.morrissey@gmail.com')  -- box 1 · Tomas Morrissey,
  ('3fc6509d-ed1e-41a6-b565-feb27a40d4f4', 'briancornyn44@gmail.com')  -- box 1 · Brian Cornyn,
  ('3636f27a-e3f8-4d15-a321-c5271daac392', 'daviddeady89@gmail.com')  -- box 1 · David Deady,
  ('3636f27a-e3f8-4d15-a321-c5271daac392', 'roblucy7@gmail.com')  -- box 1 · Rob Lucy,
  ('60c2bd07-4193-4dd8-8f21-a7dfced6b1ef', 'jamesconnolly1@live.ie')  -- box 2 · James Connolly,
  ('c4dd0621-84df-4872-8bd2-9ad3cddedf5b', 'mikemaxshanahan@gmail.com')  -- box 2 · Mike Shanahan,
  ('c4dd0621-84df-4872-8bd2-9ad3cddedf5b', 'me@gregshine.com')  -- box 2 · Greg Shine,
  ('c35a25fb-2d8b-4744-a293-15e49c826ae8', 'deannoble106@gmail.com')  -- box 2 · Dean Noble,
  ('c35a25fb-2d8b-4744-a293-15e49c826ae8', 'chrisffrench.cf@gmail.com')  -- box 2 · Chris Ffrench,
  ('4ed49361-e165-463c-8083-c44c39b0460e', 'dylanfurlong265@gmail.com')  -- box 2 · Dylan Furlong,
  ('4ed49361-e165-463c-8083-c44c39b0460e', 'furlongjack1@gmail.com')  -- box 2 · Jack Furlong,
  ('27a58ca6-4efd-4740-87a9-3564f03a7acb', 'antonio.loboschi@gmail.com')  -- box 2 · Antonio Loboschi,
  ('27a58ca6-4efd-4740-87a9-3564f03a7acb', 'cssahilkaistha@gmail.com')  -- box 2 · Sahil Kaistha,
  ('be7f7cba-4c46-4731-89d7-406afb069ec7', 'mattcullen11@hotmail.com')  -- box 3 · Matthew,
  ('be7f7cba-4c46-4731-89d7-406afb069ec7', 'nathancondell1992@gmail.com')  -- box 3 · Nathan Condell,
  ('656b17ef-f80b-49e8-9277-ad1d36739de8', 'seanleonard01@outlook.com')  -- box 3 · Sean Leonard,
  ('656b17ef-f80b-49e8-9277-ad1d36739de8', '13dfraze@gmail.com')  -- box 3 · Dylan Frazer,
  ('30aba35b-4cad-4eb9-8a96-41820e5bdf16', 'ingvard14@gmail.com')  -- box 3 · Ingvard Hanssen,
  ('30aba35b-4cad-4eb9-8a96-41820e5bdf16', 'oisinbreen@gmail.com')  -- box 3 · Oisin Breen,
  ('26383bba-2b81-4ea1-915e-bf0319819441', 'rubmail4me@gmail.com')  -- box 3 · Rory Fahey,
  ('362920ca-96e2-40d3-8179-e4f4b327cb57', 'dawn.beas@gmail.com')  -- box 3 · Dawn B,
  ('f156bab2-fc91-4ed5-b89a-4c6549023731', 'dm@desmartin.io')  -- box 4 · Desmond Martin,
  ('a00c6557-84e3-42d0-af82-a2884809307c', 'markbanim@gmail.com')  -- box 4 · Mark Banim,
  ('a00c6557-84e3-42d0-af82-a2884809307c', 'burihhin@icloud.com')  -- box 4 · Anton Burihhin,
  ('68890fb7-682d-4a4b-9748-3af70b32b0ca', 'kfraser@tcd.ie')  -- box 4 · Kieran Fraser,
  ('68890fb7-682d-4a4b-9748-3af70b32b0ca', 'anajimezg@gmail.com')  -- box 4 · Ana J,
  ('f2ea1c18-f9a5-4755-acba-872c27cdcbeb', 'shaun.humby@gmail.com')  -- box 4 · Shaun Humby,
  ('f2ea1c18-f9a5-4755-acba-872c27cdcbeb', 'thomasmckeon1997@gmail.com')  -- box 4 · Thomas McKeon,
  ('6fe8960c-cc69-4bc8-a13f-3a6ef9a93ca3', 'tommaguire21@gmail.com')  -- box 4 · Tom Maguire,
  ('6fe8960c-cc69-4bc8-a13f-3a6ef9a93ca3', 'mr.osullivan@holyrosaryschool.ie')  -- box 4 · Brian O''Sullivan,
  ('43314654-aaae-49f6-8633-f9ba392d2369', 'lee@rosannaconstruction.ie')  -- box 5 · Lee Fitzpatrick,
  ('43314654-aaae-49f6-8633-f9ba392d2369', 'momodunner9@gmail.com')  -- box 5 · Mo Dunne,
  ('8a70dcc1-549b-43db-9615-dc355f938df1', 'kaysully97@gmail.com')  -- box 5 · Kayleigh Sullivan,
  ('8a70dcc1-549b-43db-9615-dc355f938df1', 'lasully1017@gmail.com')  -- box 5 · Leanne S,
  ('1ba22a96-804d-4108-807e-3b5cacb81b2f', 'cmlee191@gmail.com')  -- box 5 · Charles Lee,
  ('6559dfc8-6d28-4cc8-a5a2-cb0cf2d1eee8', '56gstz8rp6@privaterelay.appleid.com')  -- box 5 · Karol Stankiewicz,
  ('6559dfc8-6d28-4cc8-a5a2-cb0cf2d1eee8', 'sathrajith2022@gmail.com')  -- box 5 · Sath,
  ('68c4d5c6-d656-4885-88fc-f091d28700c3', 'itto@protonmail.ch')  -- box 5 · Gabriel Uribe,
  ('68c4d5c6-d656-4885-88fc-f091d28700c3', 'asouto244@gmail.com')  -- box 5 · Aron Souto,
  ('3c20fbf9-bbca-48a2-b0fd-7c1fb43d2c0c', 'callumsmale10@gmail.com')  -- box 6 · Callum Smale,
  ('3c20fbf9-bbca-48a2-b0fd-7c1fb43d2c0c', 'ryantolanchr@gmail.com')  -- box 6 · Ryan Tolan,
  ('f3d1b367-58fd-4358-89f5-ec23c0d74628', 'chris@squirrelsscramble.ie')  -- box 6 · Chris Lang,
  ('65858db9-e0fc-45c1-aeb3-2fa632c3f7f7', 'cillian.w191@gmail.com')  -- box 6 · Cillian Williams,
  ('65858db9-e0fc-45c1-aeb3-2fa632c3f7f7', 'wava16@icloud.com')  -- box 6 · Ava Williams,
  ('a5d1d9e0-4f46-4737-8033-5f42ccc04a5f', 'johndaly0064@gmail.com')  -- box 6 · John D,
  ('a5d1d9e0-4f46-4737-8033-5f42ccc04a5f', 'samharte@ymail.com')  -- box 6 · Sam Harte,
  ('c58f0c33-9b3a-4e5e-94ef-aa6eee4743a4', 'toby_wuyts@hotmail.co.uk')  -- box 6 · Toby Wuyts,
  ('c58f0c33-9b3a-4e5e-94ef-aa6eee4743a4', 'dunnj015@gmail.com')  -- box 6 · Jack Dunn,
  ('80a5f295-9473-4811-93c9-87d47f903e13', 'oussama.milahaa@gmail.com')  -- box 7 · Oussama Kenouche,
  ('80a5f295-9473-4811-93c9-87d47f903e13', 'jackcolaluca1@icloud.com')  -- box 7 · Jack Colaluca,
  ('4b8fcf66-30a8-472d-8dc8-7e2bdc0b72f2', 'filang@outlook.ie')  -- box 7 · Fionn Lang,
  ('4b8fcf66-30a8-472d-8dc8-7e2bdc0b72f2', 'abeattie77@gmail.com')  -- box 7 · Anthea Lang,
  ('21b495fa-3bdd-408e-9904-3a12e66273c7', 'p.dunne@holyrosaryschool.ie')  -- box 7 · Peter Dunne,
  ('21b495fa-3bdd-408e-9904-3a12e66273c7', 'lilliancarthy@hotmail.com')  -- box 7 · Lillian Carthy,
  ('3c871c9c-2906-487d-8ab0-43717146dab3', 'tinaphysio1@gmail.com')  -- box 7 · Tina Meehan,
  ('dcc6c204-5bb6-46be-a72a-abfa3b725e6e', 'kieranfitz03@gmail.com')  -- box 7 · Kieran Fitzpatrick,
  ('dcc6c204-5bb6-46be-a72a-abfa3b725e6e', 'stephenmfitzpatrick@hotmail.com')  -- box 7 · Stephen Fitzpatrick,
  ('a4a988f2-534d-407c-8b82-385055474d83', 'dylanoneill0909@gmail.com')  -- box 8 · David O Neill,
  ('a4a988f2-534d-407c-8b82-385055474d83', 'naileroneill80@gmail.com')  -- box 8 · John O Neill,
  ('63be0815-8bf3-496f-b2ad-5cee983e2c45', 'metindale@gmail.com')  -- box 8 · Mark Tindale,
  ('63be0815-8bf3-496f-b2ad-5cee983e2c45', 'msg8f59z7p@privaterelay.appleid.com')  -- box 8 · Mark Williams,
  ('8bab54cc-1b09-4d80-8896-b2f3c909e7e9', 'tomfoley55@gmail.com')  -- box 8 · Tom Foley,
  ('8bab54cc-1b09-4d80-8896-b2f3c909e7e9', '7hmm2tv628@privaterelay.appleid.com')  -- box 8 · Fernando Souza,
  ('c3ea409c-2cd6-417f-afbd-ec0a488fad50', 'gjgstephenson@yahoo.ie')  -- box 8 · Gary Stephenson,
  ('c3ea409c-2cd6-417f-afbd-ec0a488fad50', 'wayneneary1979@gmail.com')  -- box 8 · Wayne Neary,
  ('2d28b79b-5379-4285-b85a-c0fb71f92aec', 'damien.dunne4@gmail.com')  -- box 8 · Damien Dunne,
  ('2d28b79b-5379-4285-b85a-c0fb71f92aec', 'jplunkettdunne@gmail.com')  -- box 8 · Joanne Dunne,
  ('feaa8554-0736-47df-8005-611769fbb5c0', 'eclairejausten@gmail.com')  -- box 9 · Claire Austen,
  ('d93ef2f3-ab90-4373-9417-59fd9d99a80a', 'franford2007@hotmail.com')  -- box 9 · Fran Ford,
  ('d93ef2f3-ab90-4373-9417-59fd9d99a80a', 'durwyn.mongey@gmail.com')  -- box 9 · D M,
  ('aecb5db1-ae09-497e-b010-c1fc7bf90d03', 'cassidyniamh@gmail.com')  -- box 9 · Niamh Cassidy,
  ('aecb5db1-ae09-497e-b010-c1fc7bf90d03', 'lindadempseyred@gmail.com')  -- box 9 · Linda Dempsey,
  ('fc2c41d8-8356-4c1c-a0d2-407b8ce607b4', 'boodhanrampersaud@gmail.com')  -- box 9 · Boodhan Rampersaud,
  ('fc2c41d8-8356-4c1c-a0d2-407b8ce607b4', 'anthonydoran88@gmail.com')  -- box 9 · Anto Doran,
  ('282e4e04-640a-41f5-9750-6e8a48d8773b', 'ddrick25@gmail.com')  -- box 10 · Rick Deady,
  ('282e4e04-640a-41f5-9750-6e8a48d8773b', 'ddshir2025@gmail.com')  -- box 10 · Shirley Deady,
  ('d2adc15d-44ee-486b-b02c-ee4a6a486813', 'shelly_mccormack@hotmail.com')  -- box 10 · Michele McCormack,
  ('d2adc15d-44ee-486b-b02c-ee4a6a486813', 'sonja.dorlas94@gmail.com')  -- box 10 · Sonja,
  ('c9aa6b18-959c-4348-97bd-3bf3a3851684', 'zydre.guo@gmail.com')  -- box 10 · Zydre,
  ('c9aa6b18-959c-4348-97bd-3bf3a3851684', 'indreslaiskas@gmail.com')  -- box 10 · Indre Simkute,
  ('99078702-8117-4f31-980b-3469f510f632', 'ewarybak81@gmail.com')  -- box 10 · Eva Rybak,
  ('99078702-8117-4f31-980b-3469f510f632', 'kris30garage@gmail.com')  -- box 10 · Kris Rybak,
  ('4cce1449-56a0-4dc7-9f02-db1a7f08f6d5', 'conordodd98@gmail.com')  -- box 10 · Conor Dodd,
  ('4cce1449-56a0-4dc7-9f02-db1a7f08f6d5', 'mordauntdillon@gmail.com')  -- box 10 · Dillon Mordaunt,
  ('f17db97f-f8bf-4982-a54a-44098554175a', 'q9rgxnfphk@privaterelay.appleid.com')  -- box 11 · Eoin Tiernan,
  ('f17db97f-f8bf-4982-a54a-44098554175a', 'eamonnmadden@hotmail.com')  -- box 11 · Eamonn Madden,
  ('f692e7d0-9d89-4d9b-a2e6-1c8b03adb9f7', 'johnlester18@gmail.com')  -- box 11 · John Lester,
  ('60a451f4-0c48-42c2-bc09-391f1b22ff68', 'katiemarie1968@gmail.com')  -- box 11 · Katie Marie,
  ('60a451f4-0c48-42c2-bc09-391f1b22ff68', 'aoifewilliams7@gmail.com')  -- box 11 · Aoife Williams,
  ('294f1ef2-9507-4f1b-af7c-35cb3176f690', 'iandonoghue77@gmail.com')  -- box 11 · Ian Donoghue,
  ('294f1ef2-9507-4f1b-af7c-35cb3176f690', 'seanclearyj@gmail.com')  -- box 11 · Sean Cleary,
  ('0188c802-b980-4fb5-9ab8-7825ba386a90', 'garybrady10@hotmail.com')  -- box 11 · Gary Brady,
  ('0188c802-b980-4fb5-9ab8-7825ba386a90', 'dunnington1989@gmail.com')  -- box 11 · Ciaran O''Donoghue,
  ('efa55504-089e-4954-9b47-db5bdac4b334', 'orlatmurphy@icloud.com')  -- box 12 · Orla Murphy Fleming,
  ('efa55504-089e-4954-9b47-db5bdac4b334', 'doireannennis@yahoo.com')  -- box 12 · Doireann,
  ('9d03e175-a431-4eaf-baae-1b01988dad11', 'sandradunne75@gmail.com')  -- box 12 · Sandra Dunne,
  ('9d03e175-a431-4eaf-baae-1b01988dad11', 'kerriegbeacom@yahoo.ie')  -- box 12 · Kerrie Beacom,
  ('b69f176c-3290-4eb8-907d-b0d833e98fae', 'jacklucasevans@gmail.com')  -- box 12 · Jack Evans,
  ('b69f176c-3290-4eb8-907d-b0d833e98fae', 'gavinfogarty1501@gmail.com')  -- box 12 · Gavin Fogarty,
  ('b1f7429c-87ed-484a-ab7e-8e74d1ee6eb7', 'yg6jw48g4y@privaterelay.appleid.com')  -- box 12 · Ciaran Conlon,
  ('bb59000e-2583-49da-a510-a16482a33e9b', 'elaine.kirwan3@gmail.com')  -- box 13 · Elaine Kirwan,
  ('bb59000e-2583-49da-a510-a16482a33e9b', 'christinamaryreilly@gmail.com')  -- box 13 · Christina Reilly,
  ('e60af5fb-5614-4df1-8f13-15879d235747', 'shineaoife@gmail.com')  -- box 13 · Aoife Shine,
  ('e60af5fb-5614-4df1-8f13-15879d235747', 'nryanie@gmail.com')  -- box 13 · Niall Ryan,
  ('c18ca509-1bc5-424c-8a9e-ba865183f942', 'adamaca@gmail.com')  -- box 13 · Adam Macaulay,
  ('c18ca509-1bc5-424c-8a9e-ba865183f942', 'giedrike@gmail.com')  -- box 13 · Giedre Guobyte,
  ('518bc015-bc90-4c6f-b70e-b440864b6317', 'bairbreheron@gmail.com')  -- box 14 · Bairbre Heron,
  ('518bc015-bc90-4c6f-b70e-b440864b6317', 'jamesheron2010@gmail.com')  -- box 14 · James Heron,
  ('63a72e80-de70-41a1-b7ed-2b50e5214a20', 'kavanaghjo@gmail.com')  -- box 14 · John Kavanagh,
  ('63a72e80-de70-41a1-b7ed-2b50e5214a20', 'kellie.kavanagh@gmail.com')  -- box 14 · Kellie Kavanagh,
  ('c541c9ac-af98-4eda-a3ef-0aceeb956141', 'jeffrey.j.obrien@gmail.com')  -- box 14 · Jeff O''Brien,
  ('575d43d9-927d-4aab-9bc2-e19847cbb88c', 'strangedays@duck.com')  -- box 14 · Ken,
  ('575d43d9-927d-4aab-9bc2-e19847cbb88c', 'neilanmaria@gmail.com')  -- box 14 · Maria Neilan
on conflict do nothing;

-- Resolved by Playtomic rating where two accounts share a name, or the name differs slightly:
insert into public.box_team_contacts (team_id, email) values
  ('1f7f7507-5f27-45d6-b8e0-1ad1dfd8e6d4', 'barrymaccourt@gmail.com')  -- box 13 · Barry MacCourt (matched by rating),
  ('26383bba-2b81-4ea1-915e-bf0319819441', 'dgwwtqj76q@privaterelay.appleid.com')  -- box 3 · Ciara Kavanagh (matched by rating),
  ('3c871c9c-2906-487d-8ab0-43717146dab3', 'lorrainegwicklow@gmail.com')  -- box 7 · Lorraine Gallagher (matched by rating),
  ('929137f4-7f08-4ef4-9d11-3bc00bf9525e', 'nikimello@hotmail.com')  -- box 9 · Nicole Mello Teixeira de Almeida (matched by rating),
  ('929137f4-7f08-4ef4-9d11-3bc00bf9525e', 'graring@gmail.com')  -- box 9 · Grainne Ring (matched by rating),
  ('b1f7429c-87ed-484a-ab7e-8e74d1ee6eb7', 'kavanaghciara@gmail.com')  -- box 12 · Ciara Kavanagh (2) (matched by rating)
on conflict do nothing;

-- Still unmatched — no Playtomic account under this name (9 players; their partner's email covers the team).
-- Add by hand when known: insert into public.box_team_contacts (team_id, email) values ('<team_id>', '<email>');)
--   box  2 · James Connolly & Michael Connolly · Michael Connolly
--   box  3 · Ronel Pickford & Dawn B · Ronel Pickford
--   box  4 · Desmond Martin & Dave Smyth · Dave Smyth
--   box  5 · Charles Lee & Cami Ammirevole · Cami Ammirevole
--   box  6 · Keefe Lang & Chris Lang · Keefe Lang
--   box  9 · Claire Austen & CJ Adams · CJ Adams
--   box 11 · John Lester & Kyle Dempsey · Kyle Dempsey
--   box 13 · Barry MacCourt & Michael Gombart · Barry MacCourt
--   box 13 · Barry MacCourt & Michael Gombart · Michael Gombart
--   box 14 · Rhys Mansueto & Jeff O'Brien · Rhys Mansueto

-- ── PART 2: generate the cycle-1 fixtures (all-play-all within each box; idempotent) ──
-- generate_box_matches() checks is_admin() on the JWT, which the SQL editor does not carry, so insert directly:
insert into public.box_matches (box, cycle, team1_id, team2_id)
select a.box, 1, a.id, b.id from public.box_teams a join public.box_teams b on b.box = a.box and b.active and a.seed < b.seed
where a.active on conflict (cycle, team1_id, team2_id) do nothing;

-- ── PART 3: TEST FIXTURE for the self-serve entry (box 99, two dummy teams, one match) ──
-- Richie's Gmail +tags act as two different registered players. Remove with the cleanup at the end.
insert into public.box_teams (box, seed, name, p1, p2, r1, r2, active) values
  (99, 1, 'TEST Team A', 'Test Alpha', 'Test Aoife', 2.0, 2.0, true),
  (99, 2, 'TEST Team B', 'Test Bravo', 'Test Bríd', 2.0, 2.0, true)
on conflict (box, seed) do nothing;
insert into public.box_team_contacts (team_id, email)
select id, 'richiecarroll65+boxa@gmail.com' from public.box_teams where box = 99 and seed = 1
union all select id, 'richiecarroll65+boxb@gmail.com' from public.box_teams where box = 99 and seed = 2
on conflict do nothing;
insert into public.box_matches (box, cycle, team1_id, team2_id)
select 99, 1, a.id, b.id from public.box_teams a, public.box_teams b where a.box = 99 and a.seed = 1 and b.box = 99 and b.seed = 2
on conflict (cycle, team1_id, team2_id) do nothing;

-- ── CLEANUP after the test (contacts, matches and score log cascade from the teams) ──
-- delete from public.box_teams where box = 99;
