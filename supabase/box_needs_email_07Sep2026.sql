-- Which teams have no usable email (7 Sep 2026, Richie): the site shows a note beside
-- their name asking them to email welcome@w7padel.com with their name and address.
-- Returns team ids only — never the addresses. Apple "Hide My Email" relays do not count
-- as usable because the confirm/notify emails do not reliably reach them.
create or replace function public.box_teams_needing_email()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select t.id
  from public.box_teams t
  where t.active
    and t.box <> 99
    and not exists (
      select 1 from public.box_team_contacts c
      where c.team_id = t.id
        and lower(c.email) not like '%@privaterelay.appleid.com'
    );
$$;
grant execute on function public.box_teams_needing_email() to anon, authenticated;
notify pgrst, 'reload schema';
