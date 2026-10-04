-- ── Cycle close: void unplayed fixtures, apply promotion/relegation, open the next cycle ──
-- Richie, 4 Oct 2026: "align cycle dates to end on these dates, then process the next box
-- overnight that night ... then have draft emails: you've been promoted / your new box is x /
-- you stay in box x".
--
-- The standings and the moves are worked out by scripts/box_cycle_close.py (the same points
-- and tiebreak rules as src/lib/box.ts) and handed in as p_moves, one row per active team.
-- This function applies them in ONE transaction so the site never shows a half-moved league:
--   1. fixtures of the closing cycle: 'submitted' (entered, never confirmed by the deadline)
--      become confirmed; 'pending' become 'void' (-1 to both teams, rules of 5 Sep 2026);
--      'disputed' are left for Richie and count for nothing;
--   2. every team moves to its new box and seed;
--   3. the moves are recorded in box_cycle_moves (public: no emails, nothing private);
--   4. the next cycle's all-play-all fixtures are generated;
--   5. box_cycle_log marks the cycle closed, so a second run is a no-op.
-- Gated on SITE_ADMIN_KEY like box_admin_set_result: callable from the NUC with the anon key,
-- never from a browser.
--
-- Run once in the Supabase SQL editor. Then: python scripts/box_cycle_close.py --cycle 1 --dry-run

-- 1. a fixture can now be void
alter table public.box_matches drop constraint if exists box_matches_status_check;
alter table public.box_matches
  add constraint box_matches_status_check
  check (status in ('pending','submitted','confirmed','disputed','void'));

-- 2. where each team went at the end of each cycle
create table if not exists public.box_cycle_moves (
  cycle      int  not null,
  team_id    uuid not null references public.box_teams(id) on delete cascade,
  box_from   int  not null,
  box_to     int  not null,
  seed_to    int  not null,
  place      int  not null,            -- finishing position in box_from
  pts        int  not null,
  played     int  not null,
  won        int  not null,
  voided     int  not null default 0,  -- fixtures not played by the deadline (-1 each)
  outcome    text not null check (outcome in ('up','down','stay')),
  winner     boolean not null default false,   -- topped the box: EUR20 Playtomic credit per player
  created_at timestamptz not null default now(),
  primary key (cycle, team_id)
);
alter table public.box_cycle_moves enable row level security;
drop policy if exists "public read box_cycle_moves" on public.box_cycle_moves;
create policy "public read box_cycle_moves" on public.box_cycle_moves for select using (true);

create table if not exists public.box_cycle_log (
  cycle     int primary key,
  closed_at timestamptz not null default now(),
  summary   jsonb not null default '{}'::jsonb
);
alter table public.box_cycle_log enable row level security;
drop policy if exists "public read box_cycle_log" on public.box_cycle_log;
create policy "public read box_cycle_log" on public.box_cycle_log for select using (true);

-- 3. the close itself
create or replace function public.box_admin_close_cycle(p_key text, p_cycle int, p_moves jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n_teams      int;
  n_moves      int;
  n_void       int := 0;
  n_autoconf   int := 0;
  n_disputed   int := 0;
  n_fixtures   int := 0;
  mv           record;
begin
  if p_key is null or p_key = '' or not exists (select 1 from public.site_admin_keys where key = p_key) then
    return jsonb_build_object('status', 'not_authorised');
  end if;
  if exists (select 1 from public.box_cycle_log where cycle = p_cycle) then
    return jsonb_build_object('status', 'already_closed');
  end if;
  if p_moves is null or jsonb_typeof(p_moves) <> 'array' then
    return jsonb_build_object('status', 'bad_moves');
  end if;

  -- every active real team exactly once, and no two teams on the same new (box, seed)
  select count(*) into n_teams from public.box_teams where active and box < 90;
  select count(distinct (m->>'team_id')) into n_moves from jsonb_array_elements(p_moves) m;
  if n_moves <> n_teams or jsonb_array_length(p_moves) <> n_teams then
    return jsonb_build_object('status', 'moves_do_not_cover_teams', 'teams', n_teams, 'moves', n_moves);
  end if;
  if exists (
      select 1 from jsonb_array_elements(p_moves) m
      group by m->>'box_to', m->>'seed_to' having count(*) > 1) then
    return jsonb_build_object('status', 'duplicate_seed');
  end if;
  if exists (
      select 1 from jsonb_array_elements(p_moves) m
      left join public.box_teams t on t.id = (m->>'team_id')::uuid
      where t.id is null or not t.active or t.box <> (m->>'box_from')::int) then
    return jsonb_build_object('status', 'moves_stale');   -- a team moved since the script read the table
  end if;

  -- 1. settle the closing cycle's fixtures
  update public.box_matches
     set status = 'confirmed', confirmed_at = now(), updated_at = now(),
         notes = case when notes = '' then 'confirmed at the cycle deadline (entered, not disputed)' else notes end
   where cycle = p_cycle and box < 90 and status = 'submitted';
  get diagnostics n_autoconf = row_count;
  insert into public.box_score_log (match_id, action, email, sets)
    select id, 'auto_confirm_deadline', 'cycle_close', sets from public.box_matches
     where cycle = p_cycle and box < 90 and status = 'confirmed' and notes like 'confirmed at the cycle deadline%'
       and confirmed_at >= now() - interval '1 minute';

  update public.box_matches
     set status = 'void', updated_at = now(),
         notes = 'void: not played by the cycle deadline (-1 point to both teams)'
   where cycle = p_cycle and box < 90 and status = 'pending';
  get diagnostics n_void = row_count;
  select count(*) into n_disputed from public.box_matches where cycle = p_cycle and box < 90 and status = 'disputed';

  -- 2. move the teams: park every seed first so (box, seed) never collides mid-way
  update public.box_teams set seed = seed + 1000 where active and box < 90;
  for mv in select (m->>'team_id')::uuid as team_id, (m->>'box_to')::int as box_to, (m->>'seed_to')::int as seed_to
              from jsonb_array_elements(p_moves) m loop
    update public.box_teams set box = mv.box_to, seed = mv.seed_to, updated_at = now() where id = mv.team_id;
  end loop;

  -- 3. the record the emails and the site read from
  insert into public.box_cycle_moves (cycle, team_id, box_from, box_to, seed_to, place, pts, played, won, voided, outcome, winner)
  select p_cycle, (m->>'team_id')::uuid, (m->>'box_from')::int, (m->>'box_to')::int, (m->>'seed_to')::int,
         (m->>'place')::int, (m->>'pts')::int, (m->>'played')::int, (m->>'won')::int,
         coalesce((m->>'voided')::int, 0), m->>'outcome', coalesce((m->>'winner')::boolean, false)
    from jsonb_array_elements(p_moves) m;

  -- 4. next cycle's fixtures (idempotent, same rule as generate_box_matches)
  insert into public.box_matches (box, cycle, team1_id, team2_id)
  select a.box, p_cycle + 1, a.id, b.id
    from public.box_teams a
    join public.box_teams b on b.box = a.box and b.active and a.seed < b.seed
   where a.active and a.box < 90
  on conflict (cycle, team1_id, team2_id) do nothing;
  get diagnostics n_fixtures = row_count;

  -- 5. closed
  insert into public.box_cycle_log (cycle, summary) values (p_cycle, jsonb_build_object(
    'teams', n_teams, 'void', n_void, 'auto_confirmed', n_autoconf, 'disputed_left', n_disputed,
    'next_cycle_fixtures', n_fixtures));
  return jsonb_build_object('status', 'ok', 'cycle', p_cycle, 'teams', n_teams, 'void', n_void,
                            'auto_confirmed', n_autoconf, 'disputed_left', n_disputed,
                            'next_cycle', p_cycle + 1, 'next_cycle_fixtures', n_fixtures);
end;
$$;

revoke all on function public.box_admin_close_cycle(text, int, jsonb) from public, anon, authenticated;
grant execute on function public.box_admin_close_cycle(text, int, jsonb) to anon, authenticated;
