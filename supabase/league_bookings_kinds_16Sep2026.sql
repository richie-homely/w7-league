-- ── League bookings: say what a booking actually is (16 Sep 2026, Richie) ──────────────────
-- Richie: "The usage table said 10 summer league games were playing this week but that can't be
-- the case ... let's stop showing those as summer league and see what they actually are."
--
-- The detector called any booking with four players from two same-tier summer teams a summer
-- league game, so friendlies between league players, and bookings where only one team was named,
-- were counted as fixtures. There are only a handful of knockout ties left, so the weekly usage
-- table read far too high. The detector now classifies each booking and the site and the daily
-- email count only real fixtures:
--   box       a box league fixture (unchanged)
--   summer    an actual knockout tie from the bracket: both teams named, both qualified,
--             neither already knocked out (or the tie is already in KNOCKOUT_RESULTS)
--   open      one summer team named, opponents not on the booking yet — may become a tie
--   friendly  two summer league teams who are not drawn against each other: not a fixture
alter table public.league_bookings drop constraint if exists league_bookings_kind_check;
alter table public.league_bookings add constraint league_bookings_kind_check
  check (kind in ('box', 'summer', 'open', 'friendly'));
notify pgrst, 'reload schema';
