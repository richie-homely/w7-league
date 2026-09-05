-- Refresh Playtomic ratings on box_teams from the venue extract of 5 Sep 2026 (players' levels have moved since entry).
-- Ratings only — no emails. Safe to re-run.
begin;
update public.box_teams set r1 = 4.53, r2 = 4.16 where name = 'Shane Donohoe & Dylan Orr';  -- was 4.51 / 4.13
update public.box_teams set r1 = 4.55, r2 = 3.86 where name = 'Davy O''Sullivan & David Hennebry';  -- was 4.53 / 3.51
update public.box_teams set r1 = 3.71, r2 = 3.81 where name = 'Tomas Morrissey & Brian Cornyn';  -- was 3.51 / 3.8
update public.box_teams set r1 = 2.73, r2 = 4.27 where name = 'David Deady & Rob Lucy';  -- was 2.73 / 4.34
update public.box_teams set r1 = 3.56, r2 = 3.31 where name = 'Mike Shanahan & Greg Shine';  -- was 3.52 / 3.24
update public.box_teams set r1 = 3.70, r2 = 3.35 where name = 'Dean Noble & Chris Ffrench';  -- was 3.72 / 2.85
update public.box_teams set r1 = 3.30, r2 = 3.20 where name = 'Dylan Furlong & Jack Furlong';  -- was 3.32 / 3.2
update public.box_teams set r1 = 2.84, r2 = 3.74 where name = 'Antonio Loboschi & Sahil Kaistha';  -- was 2.79 / 3.61
update public.box_teams set r1 = 3.52, r2 = 2.61 where name = 'Matthew & Nathan Condell';  -- was 3.47 / 2.63
update public.box_teams set r1 = 4.02, r2 = 1.51 where name = 'Ingvard Hanssen & Oisin Breen';  -- was 3.87 / 1.49
update public.box_teams set r1 = 1.41, r2 = 3.69 where name = 'Ciara Kavanagh & Rory Fahey';  -- was 1.47 / 3.69
update public.box_teams set r1 = 2.74, r2 = 2.04 where name = 'Shane Devlin & Karl Earls';  -- was 2.8 / 2.04
update public.box_teams set r1 = 2.50, r2 = 2.08 where name = 'Mark Banim & Anton Burihhin';  -- was 2.6 / 2.17
update public.box_teams set r1 = 2.63, r2 = 1.72 where name = 'Kieran Fraser & Ana J';  -- was 2.8 / 1.88
update public.box_teams set r1 = 2.43, r2 = 2.26 where name = 'Shaun Humby & Thomas McKeon';  -- was 2.3 / 2.32
update public.box_teams set r1 = 2.17, r2 = 2.46 where name = 'Tom Maguire & Brian O''Sullivan';  -- was 2.12 / 2.44
update public.box_teams set r1 = 2.39, r2 = 2.20 where name = 'Lee Fitzpatrick & Mo Dunne';  -- was 2.33 / 2.2
update public.box_teams set r1 = 2.07, r2 = 2.72 where name = 'Kayleigh Sullivan & Leanne S';  -- was 2.18 / 2.29
update public.box_teams set r1 = 2.30, r2 = 2.04 where name = 'Gabriel Uribe & Aron Souto';  -- was 2.23 / 2.01
update public.box_teams set r1 = 2.67, r2 = 1.63 where name = 'Callum Smale & Ryan Tolan';  -- was 2.64 / 1.57
update public.box_teams set r1 = 2.68, r2 = 1.46 where name = 'Keefe Lang & Chris Lang';  -- was 2.68 / 1.51
update public.box_teams set r1 = 2.87, r2 = 1.75 where name = 'Cillian Williams & Ava Williams';  -- was 2.53 / 1.66
update public.box_teams set r1 = 2.08, r2 = 2.17 where name = 'John D & Sam Harte';  -- was 2.11 / 2.02
update public.box_teams set r1 = 2.32, r2 = 1.44 where name = 'Toby Wuyts & Jack Dunn';  -- was 2.39 / 1.73
update public.box_teams set r1 = 2.46, r2 = 2.34 where name = 'Oussama Kenouche & Jack Colaluca';  -- was 2.36 / 1.69
update public.box_teams set r1 = 2.48, r2 = 1.86 where name = 'Fionn Lang & Anthea Lang';  -- was 2.11 / 1.88
update public.box_teams set r1 = 2.49, r2 = 1.45 where name = 'Peter Dunne & Lillian Carthy';  -- was 2.41 / 1.54
update public.box_teams set r1 = 2.35, r2 = 1.80 where name = 'David O Neill & John O Neill';  -- was 1.97 / 1.68
update public.box_teams set r1 = 1.55, r2 = 2.04 where name = 'Mark Tindale & Mark Williams';  -- was 1.6 / 1.98
update public.box_teams set r1 = 1.60, r2 = 1.95 where name = 'Tom Foley & Fernando Souza';  -- was 1.5 / 1.79
update public.box_teams set r1 = 1.28, r2 = 1.81 where name = 'Gary Stephenson & Wayne Neary';  -- was 1.2 / 2.04
update public.box_teams set r1 = 1.76, r2 = 0.99 where name = 'Fran Ford & D M';  -- was 1.82 / 1.14
update public.box_teams set r1 = 0.95, r2 = 1.91 where name = 'Niamh Cassidy & Linda Dempsey';  -- was 0.95 / 2.0
update public.box_teams set r1 = 1.64, r2 = 1.27 where name = 'Zydre & Indre Simkute';  -- was 1.29 / 1.27
update public.box_teams set r1 = 0.97, r2 = 1.05 where name = 'John Lester & Kyle Dempsey';  -- was 1.28 / 1.05
update public.box_teams set r1 = 1.19, r2 = 1.00 where name = 'Ian Donoghue & Sean Cleary';  -- was 1.12 / 1.0
update public.box_teams set r1 = 0.89, r2 = 1.55 where name = 'Gary Brady & Ciaran O''Donoghue';  -- was 0.71 / 1.29
update public.box_teams set r1 = 0.51, r2 = 0.94 where name = 'Emily Tebbitt & Noeleen Cunningham';  -- was 0.83 / 0.94
update public.box_teams set r1 = 1.00, r2 = 0.59 where name = 'Jack Evans & Gavin Fogarty';  -- was 0.83 / 0.8
update public.box_teams set r1 = 1.04, r2 = 0.56 where name = 'Ciara Kavanagh (2) & Ciaran Conlon';  -- was 1.0 / 0.56
update public.box_teams set r1 = 1.20, r2 = 0.50 where name = 'Marie Galligan & Juliette Kidd';  -- was 0.67 / 0.5
update public.box_teams set r1 = 0.66, r2 = 1.00 where name = 'Adam Macaulay & Giedre Guobyte';  -- was 0.66 / 0.5
commit;
