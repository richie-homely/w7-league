-- ── W7 Court Points (Richie, 9 Oct 2026: "for every minute on court you get a point - free
-- balls and court hours for top players ... free balls after x many points - free hour on court
-- after x many") ─────────────────────────────────────────────────────────────────────────────
-- scripts/court_points.py reads the Playtomic extract on the NUC and, with --push, hands the
-- board here as one JSON array of {player, display, month, points, sessions}; month is
-- "YYYY-MM" or "all". Display names only ("Barry M."), never an email - the public page reads
-- this table directly with the anon key. Gated on SITE_ADMIN_KEY like the other admin
-- functions. Run once in the Supabase SQL editor.

create table if not exists public.court_points (
  player     text not null,
  month      text not null,
  display    text not null,
  points     int  not null default 0,
  sessions   int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player, month)
);
create index if not exists court_points_month_idx on public.court_points (month, points desc);
alter table public.court_points enable row level security;
drop policy if exists court_points_public_read on public.court_points;
create policy court_points_public_read on public.court_points for select to anon, authenticated using (true);

create or replace function public.league_admin_set_points(p_key text, p_rows jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n int := 0;
begin
  if p_key is null or p_key = '' or not exists (select 1 from public.site_admin_keys where key = p_key) then
    return jsonb_build_object('status', 'not_authorised');
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('status', 'bad_rows');
  end if;
  insert into public.court_points (player, month, display, points, sessions, updated_at)
  select e->>'player', e->>'month', e->>'display', (e->>'points')::int, (e->>'sessions')::int, now()
  from jsonb_array_elements(p_rows) e
  where coalesce(e->>'player', '') <> '' and coalesce(e->>'month', '') <> ''
  on conflict (player, month) do update
    set display = excluded.display, points = excluded.points, sessions = excluded.sessions, updated_at = now();
  get diagnostics n = row_count;
  -- a player who drops out of the extract's window keeps their old rows; the month rows are
  -- replaced whole on every push so nothing stale survives for the months the extract covers
  delete from public.court_points c
  where c.month in (select distinct e->>'month' from jsonb_array_elements(p_rows) e where e->>'month' <> 'all')
    and not exists (select 1 from jsonb_array_elements(p_rows) e where e->>'player' = c.player and e->>'month' = c.month);
  return jsonb_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.league_admin_set_points(text, jsonb) to anon, authenticated;
