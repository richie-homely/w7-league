-- "Find my box": which team (and box) is a registered email attached to?
-- Contacts are not publicly readable, so this runs as SECURITY DEFINER and returns
-- only the team id and box number — no emails leave the database.
-- Run once in the Supabase SQL editor (safe to re-run).

create or replace function public.box_team_for_email(p_email text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('team_id', t.id, 'box', t.box)
  from public.box_team_contacts c
  join public.box_teams t on t.id = c.team_id
  where lower(trim(c.email)) = lower(trim(p_email))
    and t.active
  order by t.box, t.seed
  limit 1;
$$;

grant execute on function public.box_team_for_email(text) to anon, authenticated;
