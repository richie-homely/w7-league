-- ── Court slots: only count time a game can actually use (13 Sep 2026, Richie) ──────────
-- Richie: "On this view - slots need to be at least an hour long."
--
-- court_slots stored how many courts were free in each half-hour, but not WHICH courts. That
-- let the site show 30-minute scraps as bookable, and it could not tell whether "one court
-- free, then one court free" was the same court (a bookable hour) or two different ones (no
-- hour at all). The hourly job knows each court's bookings, so it now works that out and
-- stores two more counts per half-hour:
--   startable  courts on which a game of at least 60 minutes can START here
--   usable     courts that are free here AND inside a stretch of at least 60 minutes free on
--              that same court — so summing usable / 2 gives genuinely bookable court-hours
-- `free` is unchanged, so the occupancy charts that read it are unaffected.
alter table public.court_slots add column if not exists startable smallint not null default 0;
alter table public.court_slots add column if not exists usable    smallint not null default 0;

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
  insert into public.court_slots (slot_at, free, startable, usable)
  select (r->>'slot_at')::timestamptz, (r->>'free')::smallint,
         coalesce((r->>'startable')::smallint, 0), coalesce((r->>'usable')::smallint, 0)
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (slot_at) do update set free = excluded.free, startable = excluded.startable,
    usable = excluded.usable, seen_at = now();
  get diagnostics n = row_count;
  return json_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.court_slots_set(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
