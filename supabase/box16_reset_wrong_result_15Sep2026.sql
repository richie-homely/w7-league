-- ── Box 16: clear a result entered on the wrong fixture (15 Sep 2026, Richie) ──────────────
-- Helena Plower & Olive Ramsay entered their Monday 14 Sep 6-1, 6-2 win against Sandra Dunne &
-- Kerrie Beacom (confirmed, correct) a second time on their Caragh Daly & Kerry Callery fixture.
-- Caragh replied: "We haven't played yet. They got mixed up with another Kerrie I think. Playing
-- over the weekend." (booked Sat 19 Sep 10:00, Padel 2). So that fixture goes back to unplayed.
--
-- Only touches the one match, and only while it is still disputed.
update public.box_matches
   set sets = null,
       status = 'pending',
       submitted_team = null,
       submitted_at = null,
       confirmed_at = null,
       updated_at = now()
 where id = '79a4dd2d-aaa8-4d06-ba52-a0ae70b8d956'
   and status = 'disputed'
returning id, box, status, sets;
