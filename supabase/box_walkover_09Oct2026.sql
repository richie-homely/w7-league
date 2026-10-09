-- ── Walkovers in the box league (Richie, 9 Oct 2026: "add the ability to add in a walkover ...
-- they get 3 points rather than 4 ... retroactively mark any walkovers accordingly") ────────────
-- A fixture one side concedes is recorded as status 'walkover' with walkover_to = the team that
-- was ready to play. Standings (src/lib/box.ts, scripts/box_cycle_close.py) give that team 3
-- points, as for a win decided in the tiebreak, counted as 2-0 in sets and no games; the team
-- conceding gets 0. Walkovers are applied by W7 through box_admin_set_walkover (SITE_ADMIN_KEY),
-- never entered as a score by players, and a player submit cannot overwrite one. Paste once.

alter table public.box_matches add column if not exists walkover_to uuid references public.box_teams(id);

alter table public.box_matches drop constraint if exists box_matches_status_check;
alter table public.box_matches
  add constraint box_matches_status_check
  check (status in ('pending','submitted','confirmed','disputed','void','walkover'));

-- Only the admin functions may move a fixture out of 'walkover'; they flag themselves with a
-- transaction-local setting before writing. submit_box_score and confirm_box_score are untouched
-- and simply fail on a walkover (the trigger raises, the player sees "didn't go through").
create or replace function public._box_guard_walkover()
returns trigger language plpgsql as $$
begin
  if old.status = 'walkover' and new.status <> 'walkover'
     and coalesce(current_setting('w7.admin', true), '') <> 'on' then
    raise exception 'walkover can only be changed by W7';
  end if;
  return new;
end;
$$;
drop trigger if exists box_matches_walkover_guard on public.box_matches;
create trigger box_matches_walkover_guard before update on public.box_matches
  for each row execute function public._box_guard_walkover();

-- Set (p_winner = the team awarded the walkover) or clear (p_winner null -> back to pending).
create or replace function public.box_admin_set_walkover(
  p_match uuid,
  p_winner uuid,
  p_reason text,
  p_key text
) returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
begin
  if p_key is null or p_key = '' or not exists (select 1 from public.site_admin_keys where key = p_key) then
    return 'not_authorised';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    return 'reason_required';
  end if;
  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;
  perform set_config('w7.admin', 'on', true);
  if p_winner is null then
    update public.box_matches
       set status = 'pending', walkover_to = null, sets = null, submitted_team = null,
           submitted_at = null, confirmed_at = null, updated_at = now()
     where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'admin_walkover_clear: ' || left(trim(p_reason), 180), 'admin', null);
    return 'ok_cleared';
  end if;
  if p_winner <> m.team1_id and p_winner <> m.team2_id then return 'bad_winner'; end if;
  update public.box_matches
     set status = 'walkover', walkover_to = p_winner, sets = null, submitted_team = null,
         submitted_at = null, confirmed_at = now(), updated_at = now()
   where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'admin_walkover to ' || p_winner::text || ': ' || left(trim(p_reason), 160), 'admin', m.sets);
  return 'ok_walkover';
end;
$$;
revoke all on function public.box_admin_set_walkover(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.box_admin_set_walkover(uuid, uuid, text, text) to anon, authenticated;

-- box_admin_set_result: same body as 25 Sep 2026, plus the admin flag and clearing walkover_to,
-- so an admin correction can still move a walkover back to a scored result.
create or replace function public.box_admin_set_result(
  p_match uuid,
  p_sets jsonb,
  p_reason text,
  p_key text
) returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
begin
  if p_key is null or p_key = '' or not exists (
       select 1 from public.site_admin_keys where key = p_key) then
    return 'not_authorised';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    return 'reason_required';
  end if;
  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;
  perform set_config('w7.admin', 'on', true);
  if p_sets is null then
    update public.box_matches
       set sets = null, status = 'pending', submitted_team = null, walkover_to = null,
           submitted_at = null, confirmed_at = null, updated_at = now()
     where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'admin_clear: ' || left(trim(p_reason), 180), 'admin', null);
    return 'ok_cleared';
  end if;
  if not public._box_sets_valid(p_sets) then return 'bad_sets'; end if;
  update public.box_matches
     set sets = p_sets, status = 'confirmed', walkover_to = null, confirmed_at = now(), updated_at = now()
   where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'admin_set: ' || left(trim(p_reason), 180), 'admin', p_sets);
  return 'ok_set';
end;
$$;
