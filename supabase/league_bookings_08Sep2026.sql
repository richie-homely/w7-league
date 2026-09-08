-- ── League courts booked (8 Sep 2026, Richie) ─────────────────────────────────────
-- Fixtures the Playtomic bookings show as booked: box fixtures and summer knockout ties.
-- Written hourly by scripts/league_bookings.py --push (admin passcode), read by the site
-- (public — it is fixture time and court only, nothing personal).
create table if not exists public.league_bookings (
  match_key   text primary key,               -- box: box_matches.id · summer: 'summer:' + sorted team ids
  kind        text not null check (kind in ('box','summer')),
  starts_at   timestamptz not null,
  court       text not null default '',
  team1       text not null,
  team2       text not null,
  confidence  text not null default 'certain' check (confidence in ('certain','probable')),
  seen_at     timestamptz not null default now()
);
alter table public.league_bookings enable row level security;
drop policy if exists "anon read league_bookings" on public.league_bookings;
create policy "anon read league_bookings" on public.league_bookings for select using (true);

-- Replace the whole set in one call (the detector always sends the full current picture).
create or replace function public.league_bookings_set(p_key text, p_rows jsonb)
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
  delete from public.league_bookings where true;   -- Supabase's safe-delete guard wants a WHERE
  insert into public.league_bookings (match_key, kind, starts_at, court, team1, team2, confidence)
  select r->>'match_key', r->>'kind', (r->>'starts_at')::timestamptz, coalesce(r->>'court',''),
         r->>'team1', r->>'team2', coalesce(r->>'confidence','certain')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (match_key) do update set starts_at = excluded.starts_at, court = excluded.court,
    confidence = excluded.confidence, seen_at = now();
  get diagnostics n = row_count;
  return json_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.league_bookings_set(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
