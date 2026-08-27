-- Interest registration (hub cards) + Autumn/Winter Box League.
-- Run against the Supabase project (CLI `supabase db push`, or paste into the SQL editor).
--
-- Interest: anonymous visitors can register interest in upcoming formats; only
-- admins can read the submissions (they contain emails).
--
-- Box league: teams live in boxes; players enter their own match scores,
-- validated against the email addresses registered for the two teams in that
-- match. Emails are NEVER publicly readable — they live in a contacts table
-- with no public policy, and all player writes go through SECURITY DEFINER
-- functions that check the caller-supplied email server-side.
--
-- Score flow: either team submits a result -> 'submitted' (provisional).
-- The OTHER team confirms -> 'confirmed' (counts in standings). If the other
-- team submits a DIFFERENT score, or presses dispute -> 'disputed' (admins
-- resolve). If the other team submits the SAME score, that IS confirmation.

-- ---------------------------------------------------------------------------
-- 1. Interest in upcoming formats
-- ---------------------------------------------------------------------------
create table public.interest (
  id         uuid primary key default gen_random_uuid(),
  format     text not null,
  name       text not null,
  email      text not null,
  phone      text not null default '',
  note       text not null default '',
  created_at timestamptz not null default now()
);

alter table public.interest enable row level security;

-- Anyone may register interest; sanity bounds stop junk-sized payloads.
create policy "public insert interest" on public.interest for insert
  with check (
    char_length(format) between 1 and 80
    and char_length(name)  between 1 and 120
    and char_length(email) between 5 and 200
    and position('@' in email) > 1
    and char_length(phone) <= 40
    and char_length(note)  <= 1000
  );

create policy "admin read interest"   on public.interest for select using (public.is_admin());
create policy "admin delete interest" on public.interest for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Box league tables
-- ---------------------------------------------------------------------------
create table public.box_teams (
  id         uuid primary key default gen_random_uuid(),
  box        int  not null,              -- 1 = top box
  seed       int  not null,              -- order within the box
  name       text not null,              -- display name, e.g. "Rob & Ian"
  p1         text not null default '',
  p2         text not null default '',
  r1         numeric,                    -- Playtomic ratings (nullable)
  r2         numeric,
  active     boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (box, seed)
);

-- Player emails, used only to validate score submissions. NO public policy.
create table public.box_team_contacts (
  team_id uuid not null references public.box_teams(id) on delete cascade,
  email   text not null,
  primary key (team_id, email)
);

create table public.box_matches (
  id             uuid primary key default gen_random_uuid(),
  box            int  not null,
  cycle          int  not null default 1, -- promotion/relegation period
  team1_id       uuid not null references public.box_teams(id) on delete cascade,
  team2_id       uuid not null references public.box_teams(id) on delete cascade,
  sets           jsonb,                   -- [[6,4],[6,3]] ; 3rd set = championship tiebreak
  status         text not null default 'pending'
                   check (status in ('pending','submitted','confirmed','disputed')),
  submitted_team uuid references public.box_teams(id),
  notes          text not null default '',
  submitted_at   timestamptz,
  confirmed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  check (team1_id <> team2_id),
  unique (cycle, team1_id, team2_id)
);
create index box_matches_box_cycle_idx on public.box_matches (box, cycle);

-- Audit trail of every player submit/confirm/dispute, with the email used.
-- Admin-read only (emails). Inserted by the SECURITY DEFINER functions.
create table public.box_score_log (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.box_matches(id) on delete cascade,
  action     text not null,
  email      text not null,
  sets       jsonb,
  created_at timestamptz not null default now()
);

create trigger box_teams_touch   before update on public.box_teams   for each row execute function public.touch_updated_at();
create trigger box_matches_touch before update on public.box_matches for each row execute function public.touch_updated_at();

alter table public.box_teams         enable row level security;
alter table public.box_team_contacts enable row level security;
alter table public.box_matches       enable row level security;
alter table public.box_score_log     enable row level security;

create policy "public read box_teams"   on public.box_teams   for select using (true);
create policy "public read box_matches" on public.box_matches for select using (true);
-- box_team_contacts and box_score_log deliberately have NO public read policy.

create policy "admin write box_teams"    on public.box_teams         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all box_contacts"   on public.box_team_contacts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write box_matches"  on public.box_matches       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin read box_score_log" on public.box_score_log     for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Score submission functions (SECURITY DEFINER: they may read contacts and
--    write matches on behalf of anonymous players, after validating the email)
-- ---------------------------------------------------------------------------

-- Which team of this match does the email belong to? NULL if neither.
create or replace function public._box_team_for_email(p_match uuid, p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.team_id
  from public.box_matches m
  join public.box_team_contacts c
    on c.team_id in (m.team1_id, m.team2_id)
  where m.id = p_match
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;
$$;

-- Structural validation: 2–3 sets, each [a,b] with 0–99 ints, no drawn sets,
-- and an overall winner.
create or replace function public._box_sets_valid(p_sets jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  n int;
  el jsonb;
  a numeric;
  b numeric;
  s1 int := 0;
  s2 int := 0;
begin
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' then return false; end if;
  n := jsonb_array_length(p_sets);
  if n < 2 or n > 3 then return false; end if;
  for i in 0 .. n - 1 loop
    el := p_sets -> i;
    if jsonb_typeof(el) <> 'array' or jsonb_array_length(el) <> 2 then return false; end if;
    if jsonb_typeof(el -> 0) <> 'number' or jsonb_typeof(el -> 1) <> 'number' then return false; end if;
    a := (el ->> 0)::numeric;
    b := (el ->> 1)::numeric;
    if a <> floor(a) or b <> floor(b) then return false; end if;
    if a < 0 or a > 99 or b < 0 or b > 99 then return false; end if;
    if a = b then return false; end if;
    if a > b then s1 := s1 + 1; else s2 := s2 + 1; end if;
  end loop;
  return s1 <> s2;
end;
$$;

-- Submit a result. Returns a short status code the client maps to copy:
--   ok_submitted | ok_confirmed (cross-submitted matching score)
--   ok_disputed  (cross-submitted a DIFFERENT score)
--   not_found | not_registered | bad_sets | already_confirmed
create or replace function public.submit_box_score(p_match uuid, p_sets jsonb, p_email text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
  team uuid;
begin
  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;

  team := public._box_team_for_email(p_match, p_email);
  if team is null then return 'not_registered'; end if;

  if not public._box_sets_valid(p_sets) then return 'bad_sets'; end if;

  if m.status = 'confirmed' then return 'already_confirmed'; end if;

  -- First submission, a correction by the same team, or a resubmit after a
  -- dispute: (re)stamp the provisional result.
  if m.status in ('pending','disputed') or m.submitted_team = team then
    update public.box_matches
      set sets = p_sets, status = 'submitted', submitted_team = team,
          submitted_at = now(), confirmed_at = null
      where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'submit', lower(trim(p_email)), p_sets);
    return 'ok_submitted';
  end if;

  -- The OTHER team submitting: agreement confirms, difference disputes.
  if m.sets = p_sets then
    update public.box_matches
      set status = 'confirmed', confirmed_at = now()
      where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'confirm_by_match', lower(trim(p_email)), p_sets);
    return 'ok_confirmed';
  end if;

  update public.box_matches set status = 'disputed' where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'dispute_mismatch', lower(trim(p_email)), p_sets);
  return 'ok_disputed';
end;
$$;

-- One-tap confirm / dispute by the opposing team.
--   ok_confirmed | ok_disputed | not_found | not_registered | not_opponent | bad_status
create or replace function public.confirm_box_score(p_match uuid, p_email text, p_agree boolean)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
  team uuid;
begin
  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;
  if m.status <> 'submitted' then return 'bad_status'; end if;

  team := public._box_team_for_email(p_match, p_email);
  if team is null then return 'not_registered'; end if;
  if team = m.submitted_team then return 'not_opponent'; end if;

  if p_agree then
    update public.box_matches set status = 'confirmed', confirmed_at = now() where id = p_match;
    insert into public.box_score_log (match_id, action, email)
      values (p_match, 'confirm', lower(trim(p_email)));
    return 'ok_confirmed';
  end if;

  update public.box_matches set status = 'disputed' where id = p_match;
  insert into public.box_score_log (match_id, action, email)
    values (p_match, 'dispute', lower(trim(p_email)));
  return 'ok_disputed';
end;
$$;

-- Admin helper: generate the all-play-all matches for every box for a cycle
-- (idempotent — existing pairings are left alone). Run after seeding teams.
create or replace function public.generate_box_matches(p_cycle int default 1)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  insert into public.box_matches (box, cycle, team1_id, team2_id)
  select a.box, p_cycle, a.id, b.id
  from public.box_teams a
  join public.box_teams b on b.box = a.box and b.active and a.seed < b.seed
  where a.active
  on conflict (cycle, team1_id, team2_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.box_teams;
alter publication supabase_realtime add table public.box_matches;
