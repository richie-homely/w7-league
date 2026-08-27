-- Socials calendar, fed by the w7-morning-brief pipeline (socials-sync
-- workflow): a snapshot of upcoming socials from Playtomic plus the venue's
-- usual weekly rhythm. Written with the service_role key (bypasses RLS);
-- the public may only read.

create table public.socials (
  id           uuid primary key default gen_random_uuid(),
  starts_at    timestamptz not null unique,
  time_label   text not null,            -- Dublin kick-off, e.g. '19:00'
  courts       int  not null default 0,
  capacity     int  not null default 0,  -- courts x 4
  players      int  not null default 0,  -- sign-ups so far
  price        text not null default '',
  duration_min int  not null default 0,
  updated_at   timestamptz not null default now()
);

create table public.social_cadence (
  weekday    int  not null,              -- ISO: 1 = Monday .. 7 = Sunday
  time_label text not null,
  weeks_of_4 int  not null default 0,    -- how many of the last 4 same-weekdays it ran
  primary key (weekday, time_label)
);

alter table public.socials        enable row level security;
alter table public.social_cadence enable row level security;

create policy "public read socials"  on public.socials        for select using (true);
create policy "public read cadence"  on public.social_cadence for select using (true);
-- No public write policies: the sync job writes with the service role.

alter publication supabase_realtime add table public.socials;
