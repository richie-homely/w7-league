-- W7 League Tracker — initial schema
-- 3 tables (teams, fixtures, settings) + RLS + admin gate + realtime.
-- Run once against the Supabase project (Supabase CLI `db push`, or paste into the SQL editor).

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Admin gate: write access for the three W7 admins, matched on JWT email.
-- To add/remove an admin, change this list and re-run.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'richiecarroll65@gmail.com', -- Richie Carroll
    'welcome@w7padel.com',       -- David Hennebry (also public contact address)
    'mike@w7padel.com'           -- Mike Shanahan
  );
$$;

-- ---------------------------------------------------------------------------
-- updated_at touch trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  division_id text not null,          -- 'g1-low' .. 'g4-high'
  seed        int  not null,
  p1          text not null,
  p2          text not null,
  r1          numeric,                -- Playtomic rating, nullable (unrated)
  r2          numeric,
  placeholder boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (division_id, seed)
);

create table public.fixtures (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,            -- display id, e.g. 'F0001'
  division_id text not null,
  round       int  not null,
  team1_id    uuid not null references public.teams(id) on delete cascade,
  team2_id    uuid not null references public.teams(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending','completed','walkover')),
  sets        jsonb,                  -- [[6,4],[6,3]] ; 3rd set = championship tiebreak
  tbc         text check (tbc in ('both','one')),
  entered_by  uuid references auth.users(id),
  entered_at  timestamptz,
  notes       text not null default '',
  updated_at  timestamptz not null default now()
);
create index fixtures_division_round_idx on public.fixtures (division_id, round);

create table public.settings (
  id           int primary key default 1 check (id = 1), -- single-row table
  lower_status text not null default 'full'
                 check (lower_status in ('full','available')),
  upper_status text not null default 'available'
                 check (upper_status in ('full','available')),
  updated_at   timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create trigger teams_touch    before update on public.teams    for each row execute function public.touch_updated_at();
create trigger fixtures_touch before update on public.fixtures for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: public read, admin write
-- ---------------------------------------------------------------------------
alter table public.teams    enable row level security;
alter table public.fixtures enable row level security;
alter table public.settings enable row level security;

create policy "public read teams"    on public.teams    for select using (true);
create policy "public read fixtures" on public.fixtures for select using (true);
create policy "public read settings" on public.settings for select using (true);

create policy "admin write teams"    on public.teams    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write fixtures" on public.fixtures for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime: broadcast changes so all viewers (and the live screen) stay in sync
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.fixtures;
alter publication supabase_realtime add table public.settings;
