-- ── Ask for a stand-in (20 Sep 2026, Richie) ────────────────────────────────────────────────
-- Richie: "if someone needs to book a fixture but doesn't have a player, if one player's away
-- they can take a sub in from the roster ... and maybe that could send an email to the two team
-- members, the person who is away and then the main player, and then the sub, and say would you
-- like to play, when can you play."
--
-- A team asks from its own fixture, naming the player sitting out and picking a stand-in from the
-- roster (box_sub_roster_20Sep2026.sql). The request is stored; the notifier sends ONE email to
-- the team's registered addresses and the stand-in, so the three of them settle it on one thread.
-- Nobody's address is exposed on the site: the roster page never shows contacts, and the request
-- form only ever sends a name.
--
--   box_sub_request(p_match, p_email, p_replaced, p_sub_name)  -> ok | not_registered | no_match
--                                                                | no_sub | bad_input | already_open
--   sub_requests_pending(p_key)   the notifier's view: request + contacts, admin passcode only
--   sub_request_close(p_key, p_id, p_outcome)   mark it filled or dropped
create table if not exists public.sub_requests (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.box_matches(id) on delete cascade,
  team_id     uuid not null references public.box_teams(id) on delete cascade,
  replaced    text not null,                -- the player sitting out
  sub_id      uuid not null references public.sub_roster(id) on delete cascade,
  asked_by    text not null,                -- registered email that made the request
  status      text not null default 'open' check (status in ('open', 'filled', 'dropped')),
  created_at  timestamptz not null default now()
);
create index if not exists sub_requests_open_idx on public.sub_requests (status, created_at);
alter table public.sub_requests enable row level security;   -- RPC only: it carries an email

create or replace function public.box_sub_request(
  p_match uuid, p_email text, p_replaced text, p_sub_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  team uuid;
  sub  uuid;
begin
  if p_replaced is null or length(trim(p_replaced)) < 2 then return 'bad_input'; end if;
  team := public._box_team_for_email(p_match, p_email);
  if team is null then return 'not_registered'; end if;
  if not exists (select 1 from public.box_matches where id = p_match) then return 'no_match'; end if;
  -- the player sitting out has to be on the team asking
  if not exists (select 1 from public.box_teams t
                  where t.id = team and (t.p1 = trim(p_replaced) or t.p2 = trim(p_replaced))) then
    return 'bad_input';
  end if;
  select id into sub from public.sub_roster
   where active and lower(name) = lower(trim(p_sub_name)) limit 1;
  if sub is null then return 'no_sub'; end if;
  if exists (select 1 from public.sub_requests
              where match_id = p_match and team_id = team and status = 'open') then
    return 'already_open';
  end if;
  insert into public.sub_requests (match_id, team_id, replaced, sub_id, asked_by)
  values (p_match, team, trim(p_replaced), sub, lower(trim(p_email)));
  return 'ok';
end;
$$;
grant execute on function public.box_sub_request(uuid, text, text, text) to anon, authenticated;

-- Everything the notifier needs to write the email, behind the admin passcode.
create or replace function public.sub_requests_pending(p_key text)
returns table (id uuid, match_id uuid, box smallint, team_name text, replaced text,
               partner text, sub_name text, sub_email text, sub_phone text, sub_rating numeric,
               sub_plays text, opponent text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return;
  end if;
  return query
    select r.id, r.match_id, t.box::smallint, t.name, r.replaced,
           case when t.p1 = r.replaced then t.p2 else t.p1 end,
           s.name, s.email, s.phone, s.rating, s.plays,
           case when m.team1_id = t.id then o2.name else o1.name end,
           r.created_at
      from public.sub_requests r
      join public.box_teams t on t.id = r.team_id
      join public.sub_roster s on s.id = r.sub_id
      join public.box_matches m on m.id = r.match_id
      left join public.box_teams o1 on o1.id = m.team1_id
      left join public.box_teams o2 on o2.id = m.team2_id
     where r.status = 'open'
     order by r.created_at;
end;
$$;
grant execute on function public.sub_requests_pending(text) to anon, authenticated;

create or replace function public.sub_request_close(p_key text, p_id uuid, p_outcome text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return json_build_object('status', 'bad_key');
  end if;
  if p_outcome not in ('filled', 'dropped') then
    return json_build_object('status', 'bad_outcome');
  end if;
  update public.sub_requests set status = p_outcome where id = p_id and status = 'open';
  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.sub_request_close(text, uuid, text) to anon, authenticated;
notify pgrst, 'reload schema';
