-- ── Court slots: what is actually free to book (13 Sep 2026, Richie) ──────────────
-- Richie: "can that be clickable to show the available hours? So you go right, we need
-- fifty games next week, we have twenty booked in already, there's thirty left to go,
-- this is what'll be available — and show the windows then that you're looking at to book."
--
-- The site can only see bookings that matched a league fixture, so it cannot tell a player
-- which hours are free. This table carries one row per court-hour for the next three weeks:
-- how many of the three courts have nothing on them. Written hourly by
-- scripts/league_bookings.py --push from the same Playtomic pull that finds the fixtures,
-- so it costs no extra API call.
--
-- Public by design: it is court availability and nothing else. No names, no bookings, no
-- member data — the same thing anyone sees on the Playtomic booking page.
create table if not exists public.court_slots (
  slot_at  timestamptz primary key,          -- start of the hour
  free     smallint not null,                -- courts with nothing booked in that hour (0-3)
  seen_at  timestamptz not null default now()
);
alter table public.court_slots enable row level security;
drop policy if exists "anon read court_slots" on public.court_slots;
create policy "anon read court_slots" on public.court_slots for select using (true);

-- Replace the whole forward picture in one call, like league_bookings_set. Rows older than
-- yesterday are dropped: a past hour is not something anyone can book.
create or replace function public.court_slots_set(p_key text, p_rows jsonb)
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
  delete from public.court_slots where true;   -- Supabase's safe-delete guard wants a WHERE
  insert into public.court_slots (slot_at, free)
  select (r->>'slot_at')::timestamptz, (r->>'free')::smallint
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (slot_at) do update set free = excluded.free, seen_at = now();
  get diagnostics n = row_count;
  return json_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.court_slots_set(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
