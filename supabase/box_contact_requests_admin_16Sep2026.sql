-- ── Box league: see and approve "change my email" requests (16 Sep 2026, Richie) ────────────
-- Richie: "Owen [Eoin] Tiernan in the box leagues has told us that he submitted an updated
-- email ... can you see that updated email in the system? And then can you update it so that he
-- can enter his scores in?" — box_contact_requests is admin-read only (is_admin() on the JWT),
-- so nothing outside the Supabase editor can see a request a player submits on the site. That
-- is why one can sit there unnoticed.
--
-- This file does three things:
--   1. approves every pending request for Eoin Tiernan & Eamonn Madden (box 13) right away
--   2. adds a passcode-gated way to LIST pending requests, so the daily checks can flag them
--   3. adds a passcode-gated way to APPROVE one by id
-- Safe to re-run.

-- ── 1. Eoin Tiernan's request (whatever address he submitted) ───────────────────────────────
insert into public.box_team_contacts (team_id, email)
select r.team_id, r.email
  from public.box_contact_requests r
 where r.status = 'pending'
   and r.team_id = 'd4a7bfe3-1719-4147-b06a-eb704035e220'   -- Eoin Tiernan & Eamonn Madden, box 13
on conflict do nothing;

update public.box_contact_requests
   set status = 'approved'
 where status = 'pending'
   and team_id = 'd4a7bfe3-1719-4147-b06a-eb704035e220';

-- ── 2. List pending requests with the admin passcode ───────────────────────────────────────
create or replace function public.box_admin_contact_requests(p_key text)
returns table (id uuid, box smallint, team text, email text, note text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return;                     -- wrong passcode: no rows, never an error that leaks anything
  end if;
  return query
    select r.id, t.box::smallint, t.name, r.email, r.note, r.created_at
      from public.box_contact_requests r
      join public.box_teams t on t.id = r.team_id
     where r.status = 'pending'
     order by r.created_at;
end;
$$;
grant execute on function public.box_admin_contact_requests(text) to anon, authenticated;

-- ── 3. Approve one request by id ───────────────────────────────────────────────────────────
create or replace function public.box_admin_approve_contact_request(p_key text, p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare r public.box_contact_requests%rowtype;
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return json_build_object('status', 'bad_key');
  end if;
  select * into r from public.box_contact_requests where id = p_id and status = 'pending';
  if not found then return json_build_object('status', 'not_found'); end if;
  insert into public.box_team_contacts (team_id, email) values (r.team_id, lower(trim(r.email)))
    on conflict do nothing;
  update public.box_contact_requests set status = 'approved' where id = p_id;
  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.box_admin_approve_contact_request(text, uuid) to anon, authenticated;
notify pgrst, 'reload schema';

-- What is left waiting after this file runs:
select t.box, t.name, r.email, r.note, r.created_at
  from public.box_contact_requests r
  join public.box_teams t on t.id = r.team_id
 where r.status = 'pending'
 order by r.created_at;
