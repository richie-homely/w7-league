-- Add home_team_id to fixtures: designates which team hosts each match.
-- Assigned evenly by the fixture-generation algorithm (each team home ~5-6 times).
alter table public.fixtures
  add column home_team_id uuid references public.teams(id) on delete set null;
