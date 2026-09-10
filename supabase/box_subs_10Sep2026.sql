-- ── Box league substitutes (10 Sep 2026, Richie) ──────────────────────────────────────
-- Teams log a sub for a fixture from the site: who was replaced, who stood in, and the
-- sub's Playtomic rating. The rule (rules page) is a sub within 0.75 of the player replaced;
-- the site shows the gap and flags anything outside it for W7 to review — it records, it
-- does not block. Same credential as scores: a registered email of one of the two teams.
--
--   box_log_sub(p_match, p_email, p_replaced, p_sub_name, p_sub_rating)
--     -> 'ok' | 'not_registered' | 'bad_input' | 'no_match'
create table if not exists public.box_subs (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.box_matches(id) on delete cascade,
  team_id     uuid not null references public.box_teams(id) on delete cascade,
  replaced    text not null,            -- the registered player who sat out
  sub_name    text not null,
  sub_rating  numeric(4,2),             -- Playtomic level as entered (null if unknown)
  logged_by   text not null,            -- registered email used (not shown on the site)
  created_at  timestamptz not null default now()
);
create index if not exists box_subs_match_idx on public.box_subs (match_id);
alter table public.box_subs enable row level security;
drop policy if exists "anon read box_subs" on public.box_subs;
-- names and ratings are league-public (they appear beside the fixture); the email column is
-- kept out of the site by selecting only the other columns
create policy "anon read box_subs" on public.box_subs for select using (true);
revoke select (logged_by) on public.box_subs from anon;

create or replace function public.box_log_sub(p_match uuid, p_email text, p_replaced text, p_sub_name text, p_sub_rating numeric)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  team uuid;
begin
  if p_replaced is null or length(trim(p_replaced)) < 2 or p_sub_name is null or length(trim(p_sub_name)) < 2 then
    return 'bad_input';
  end if;
  if p_sub_rating is not null and (p_sub_rating < 0 or p_sub_rating > 7) then
    return 'bad_input';
  end if;
  if not exists (select 1 from public.box_matches where id = p_match) then
    return 'no_match';
  end if;
  team := public._box_team_for_email(p_match, p_email);
  if team is null then return 'not_registered'; end if;
  -- the replaced player must be on the logging team
  if not exists (select 1 from public.box_teams t where t.id = team and (t.p1 = trim(p_replaced) or t.p2 = trim(p_replaced))) then
    return 'bad_input';
  end if;
  insert into public.box_subs (match_id, team_id, replaced, sub_name, sub_rating, logged_by)
  values (p_match, team, trim(p_replaced), trim(p_sub_name), p_sub_rating, lower(trim(p_email)));
  return 'ok';
end;
$$;
grant execute on function public.box_log_sub(uuid, text, text, text, numeric) to anon, authenticated;
notify pgrst, 'reload schema';
