-- ── Booking lead time (13 Sep 2026, Richie) ───────────────────────────────────────
-- Richie: "show a chart also on the usage tab of when the games are being booked in and how
-- many days in advance to find trends", and "spot trends on our average booking ahead time
-- and see if it improves with the league".
--
-- Playtomic's booking feed carries no created-at field, so how far ahead people book cannot
-- be read from it. Two sources fill that gap:
--   * going forward, the hourly detector records the first time it ever saw a booking id,
--     which is within an hour of it being made;
--   * for history, scripts/seed_leadtime.py reads the "New reservation" emails, which are
--     timestamped when Playtomic sent them.
--
-- Unlike league_bookings and court_slots this table ACCUMULATES — it is the history, so the
-- setter upserts rather than replacing. Public: a booking time, a play time and a court,
-- with no name attached.
create table if not exists public.booking_leadtime (
  booking_id text primary key,
  booked_at  timestamptz not null,          -- when the booking was made (or first seen)
  starts_at  timestamptz not null,          -- when the court is booked for
  court      text not null default '',
  is_league  boolean not null default false,
  source     text not null default 'detector' check (source in ('detector','email')),
  seen_at    timestamptz not null default now()
);
create index if not exists booking_leadtime_booked_at on public.booking_leadtime (booked_at);
alter table public.booking_leadtime enable row level security;
drop policy if exists "anon read booking_leadtime" on public.booking_leadtime;
create policy "anon read booking_leadtime" on public.booking_leadtime for select using (true);

-- Upsert a batch. An email-sourced row is the better truth (it carries the real send time),
-- so it may overwrite a detector guess, but never the other way round.
create or replace function public.booking_leadtime_set(p_key text, p_rows jsonb)
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
  insert into public.booking_leadtime (booking_id, booked_at, starts_at, court, is_league, source)
  select r->>'booking_id', (r->>'booked_at')::timestamptz, (r->>'starts_at')::timestamptz,
         coalesce(r->>'court',''), coalesce((r->>'is_league')::boolean, false),
         coalesce(r->>'source','detector')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (booking_id) do update set
    booked_at = case when excluded.source = 'email' and booking_leadtime.source <> 'email'
                     then excluded.booked_at else booking_leadtime.booked_at end,
    source    = case when excluded.source = 'email' then 'email' else booking_leadtime.source end,
    starts_at = excluded.starts_at,
    court     = excluded.court,
    is_league = excluded.is_league,
    seen_at   = now();
  get diagnostics n = row_count;
  -- Keep it to the last six months; the trend needs seasons, not years.
  delete from public.booking_leadtime where starts_at < now() - interval '180 days';
  return json_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.booking_leadtime_set(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
