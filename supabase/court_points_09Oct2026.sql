-- ── W7 Court Points (Richie, 9 Oct 2026: "for every minute on court you get a point - free
-- balls and court hours for top players ... free balls after x many points - free hour on court
-- after x many ... players could opt in and we would track their usage via playtomic") ─────────
-- scripts/court_points.py reads the Playtomic extract on the NUC and, with --push, hands the
-- board here as one JSON array of {player, email, display, month, points, sessions}; month is
-- "YYYY-MM" or "all". Players OPT IN on the public page with the email they book with
-- (court_points_join); only opted-in rows are visible, through court_points_public, which carries
-- display names only ("Barry M."), never an email. Gated on SITE_ADMIN_KEY like the other admin
-- functions. Run once in the Supabase SQL editor.

create table if not exists public.court_points (
  player     text not null,
  month      text not null,
  display    text not null,
  email      text,
  points     int  not null default 0,
  sessions   int  not null default 0,
  visible    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (player, month)
);
create index if not exists court_points_month_idx on public.court_points (month, points desc);
create index if not exists court_points_email_idx on public.court_points (email);
alter table public.court_points enable row level security;   -- no policies: the view and the RPCs only

create table if not exists public.court_points_optin (
  email      text primary key,
  name       text,
  joined_at  timestamptz not null default now()
);
alter table public.court_points_optin enable row level security;   -- no policies: RPC only

-- What the page reads: opted-in players only, no email.
create or replace view public.court_points_public
with (security_invoker = false) as
  select player, month, display, points, sessions, updated_at
  from public.court_points
  where visible;
grant select on public.court_points_public to anon, authenticated;

-- A player opts in (or out) from the page with the email they book with on Playtomic.
create or replace function public.court_points_join(p_email text, p_name text default null, p_leave boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
  n int;
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('status', 'bad_email');
  end if;
  if p_leave then
    delete from public.court_points_optin where email = e;
    update public.court_points set visible = false, updated_at = now() where email = e;
    return jsonb_build_object('status', 'left');
  end if;
  insert into public.court_points_optin (email, name) values (e, left(coalesce(p_name, ''), 80))
  on conflict (email) do update set name = coalesce(nullif(excluded.name, ''), court_points_optin.name);
  update public.court_points set visible = true, updated_at = now() where email = e;
  get diagnostics n = row_count;
  -- n = 0 means the email has no points yet (never named on a booking, or the push has not run)
  return jsonb_build_object('status', 'joined', 'known', n > 0);
end;
$$;
grant execute on function public.court_points_join(text, text, boolean) to anon, authenticated;

-- A player's own rows, by the email they joined with. Only works once opted in.
create or replace function public.court_points_mine(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not exists (select 1 from public.court_points_optin where email = lower(trim(p_email)))
    then jsonb_build_object('status', 'not_joined')
    else jsonb_build_object('status', 'ok', 'rows', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'display', display, 'points', points, 'sessions', sessions) order by month)
      from public.court_points where email = lower(trim(p_email))), '[]'::jsonb))
  end;
$$;
grant execute on function public.court_points_mine(text) to anon, authenticated;

-- The daily push from the NUC.
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
  insert into public.court_points (player, month, display, email, points, sessions, visible, updated_at)
  select e->>'player', e->>'month', e->>'display', nullif(lower(e->>'email'), ''),
         (e->>'points')::int, (e->>'sessions')::int,
         exists (select 1 from public.court_points_optin o where o.email = lower(e->>'email')),
         now()
  from jsonb_array_elements(p_rows) e
  where coalesce(e->>'player', '') <> '' and coalesce(e->>'month', '') <> '';
  -- (the insert above is turned into an upsert by the conflict clause below)
  get diagnostics n = row_count;
  return jsonb_build_object('status', 'ok', 'rows', n);
exception when unique_violation then
  -- first push after a change: fall back to row-by-row upsert
  insert into public.court_points (player, month, display, email, points, sessions, visible, updated_at)
  select e->>'player', e->>'month', e->>'display', nullif(lower(e->>'email'), ''),
         (e->>'points')::int, (e->>'sessions')::int,
         exists (select 1 from public.court_points_optin o where o.email = lower(e->>'email')),
         now()
  from jsonb_array_elements(p_rows) e
  where coalesce(e->>'player', '') <> '' and coalesce(e->>'month', '') <> ''
  on conflict (player, month) do update
    set display = excluded.display, email = excluded.email, points = excluded.points,
        sessions = excluded.sessions, visible = excluded.visible, updated_at = now();
  get diagnostics n = row_count;
  return jsonb_build_object('status', 'ok', 'rows', n);
end;
$$;
grant execute on function public.league_admin_set_points(text, jsonb) to anon, authenticated;
