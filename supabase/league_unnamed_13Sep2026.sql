-- ── Likely league games hiding in bookings with no opponents named (13 Sep 2026, Richie) ──
-- Richie: "players book a court in their name and don't add opponents straight away", then
-- "what's the estimate for those 1 person bookings which could become box league games?" and
-- "we can mention these in the usage stats and emails".
--
-- One row per future booking that involves a box team but does not yet name both teams, with
-- the chance it turns out to be that team's league fixture. Written hourly by
-- scripts/league_bookings.py --push; read by the usage page and the daily usage email.
-- Public read, like league_bookings: a court, a time and a box team name, nothing else.
create table if not exists public.league_unnamed (
  starts_at  timestamptz not null,
  court      text not null,
  box        smallint not null,
  team       text not null,
  shape      text not null check (shape in ('pair', 'single')),   -- whole pair booked, or just the booker
  p          real not null default 0,                              -- chance it is a league fixture, 0-1
  week       date not null,                                        -- Monday of its week, Dublin
  reason     text not null default '',                             -- why it was marked down, if it was
  seen_at    timestamptz not null default now(),
  primary key (starts_at, court)
);
alter table public.league_unnamed enable row level security;
drop policy if exists "anon read league_unnamed" on public.league_unnamed;
create policy "anon read league_unnamed" on public.league_unnamed for select using (true);

-- Replace the whole forward picture each run, like league_bookings_set.
create or replace function public.league_unnamed_set(p_key text, p_rows jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return json_build_object('status', 'bad_key');
  end if;
  delete from public.league_unnamed where true;   -- Supabase's safe-delete guard wants a WHERE
  insert into public.league_unnamed (starts_at, court, box, team, shape, p, week, reason)
  select (r->>'starts_at')::timestamptz, r->>'court', (r->>'box')::smallint, r->>'team',
         r->>'shape', coalesce((r->>'p')::real, 0), (r->>'week')::date, coalesce(r->>'reason', '')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (starts_at, court) do update set box = excluded.box, team = excluded.team,
    shape = excluded.shape, p = excluded.p, week = excluded.week, reason = excluded.reason, seen_at = now();
  get diagnostics n = row_count;
  return json_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.league_unnamed_set(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
