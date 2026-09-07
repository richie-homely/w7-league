-- ── Site usage log (7 Sep 2026, Richie) ────────────────────────────────────────
-- Who is actually using league.w7padel.com: page views per anonymous visitor (for the
-- sponsor numbers) and, when a registered email is used, which TEAM did what and when
-- (so we can see who has got on fine and who still needs a link or an email fix).
--
-- Privacy: the visitor id is a random uuid the browser keeps in localStorage; no IP, no
-- user agent. Emails are never stored here — site_track resolves them to a team id and
-- drops them. Reads are through site_usage_report(), which returns aggregates and
-- team-level activity only (team names are already public on the site).
--
--   site_track(p_visitor, p_path, p_event, p_email)   anon insert-only, via RPC
--   site_usage_report(p_days)                           anon, aggregates + per-team activity

create table if not exists public.site_events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  visitor    uuid not null,
  path       text not null,
  event      text not null check (event in ('view','return','find_box','submit','confirm','dispute','add_contact')),
  team_id    uuid references public.box_teams(id) on delete set null
);
create index if not exists site_events_at_idx on public.site_events (at);
create index if not exists site_events_team_idx on public.site_events (team_id, at);
alter table public.site_events enable row level security;   -- no policies: RPC only

create or replace function public.site_track(p_visitor uuid, p_path text, p_event text, p_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if p_visitor is null or p_path is null or length(p_path) > 200 then return; end if;
  if p_event not in ('view','return','find_box','submit','confirm','dispute','add_contact') then return; end if;
  if p_email is not null and p_email <> '' then
    select c.team_id into tid
    from public.box_team_contacts c
    join public.box_teams t on t.id = c.team_id and t.active
    where lower(c.email) = lower(trim(p_email))
    limit 1;
  end if;
  insert into public.site_events (visitor, path, event, team_id)
  values (p_visitor, left(p_path, 200), p_event, tid);
end;
$$;
grant execute on function public.site_track(uuid, text, text, text) to anon, authenticated;

create or replace function public.site_usage_report(p_days int default 60)
returns json
language sql
security definer
set search_path = public
as $$
  with win as (select now() - make_interval(days => greatest(p_days, 1)) as since),
  ev as (select * from public.site_events, win where at >= win.since)
  select json_build_object(
    'since', (select since from win),
    'totals', (select json_build_object(
        'views', count(*) filter (where event = 'view'),
        'unique_visitors', count(distinct visitor),
        'teams_active', count(distinct team_id) filter (where team_id is not null),
        'results_submitted', count(*) filter (where event = 'submit'),
        'results_confirmed', count(*) filter (where event = 'confirm'))
      from ev),
    'by_day', coalesce((select json_agg(json_build_object('day', d, 'views', v, 'uniques', u) order by d)
      from (select (at at time zone 'Europe/Dublin')::date d,
                   count(*) filter (where event = 'view') v, count(distinct visitor) u
            from ev group by 1) x), '[]'::json),
    'by_path', coalesce((select json_agg(json_build_object('path', path, 'views', v, 'uniques', u) order by v desc)
      from (select split_part(path, '?', 1) path, count(*) v, count(distinct visitor) u
            from ev where event = 'view' group by 1) x), '[]'::json),
    'teams', coalesce((select json_agg(json_build_object(
        'team_id', t.id, 'box', t.box, 'name', t.name,
        'first_seen', a.first_seen, 'last_seen', a.last_seen,
        'events', coalesce(a.n, 0), 'submits', coalesce(a.s, 0), 'confirms', coalesce(a.c, 0),
        'visitors', coalesce(a.vis, 0))
        order by t.box, t.seed)
      from public.box_teams t
      left join (select team_id, min(at) first_seen, max(at) last_seen, count(*) n,
                        count(*) filter (where event = 'submit') s,
                        count(*) filter (where event = 'confirm') c,
                        count(distinct visitor) vis
                 from public.site_events where team_id is not null group by team_id) a on a.team_id = t.id
      where t.active and t.box <> 99), '[]'::json));
$$;
grant execute on function public.site_usage_report(int) to anon, authenticated;
notify pgrst, 'reload schema';
