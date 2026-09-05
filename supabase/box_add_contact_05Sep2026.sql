-- Self-service team emails (Richie, 4-5 Sep 2026). Two routes:
--   1. box_add_contact(existing, new): a REGISTERED player adds a teammate's email.
--      The existing email proves membership; the new one joins the same team.
--      Also the fix for Apple "Hide My Email" relay addresses, which the player
--      does not know and which cannot receive our mail.
--   2. box_request_contact(team_id, email): a team with NO usable contact asks to
--      be linked. Lands in box_contact_requests for W7 to approve in the SQL
--      editor (or a later admin screen) — never auto-approved, since an open form
--      would let anyone claim a team.
-- Run once in the Supabase SQL editor (safe to re-run).

create or replace function public.box_add_contact(p_existing_email text, p_new_email text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  team uuid;
begin
  if p_new_email is null or position('@' in p_new_email) = 0 then return 'bad_email'; end if;
  select c.team_id into team
  from public.box_team_contacts c join public.box_teams t on t.id = c.team_id
  where lower(trim(c.email)) = lower(trim(p_existing_email)) and t.active
  limit 1;
  if team is null then return 'not_registered'; end if;
  insert into public.box_team_contacts (team_id, email)
    values (team, lower(trim(p_new_email)))
    on conflict do nothing;
  return 'ok_added';
end;
$$;
grant execute on function public.box_add_contact(text, text) to anon, authenticated;

create table if not exists public.box_contact_requests (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.box_teams(id) on delete cascade,
  email      text not null,
  note       text not null default '',
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.box_contact_requests enable row level security;
drop policy if exists "admin all box_contact_requests" on public.box_contact_requests;
create policy "admin all box_contact_requests" on public.box_contact_requests
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.box_request_contact(p_team uuid, p_email text, p_note text default '')
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_email is null or position('@' in p_email) = 0 then return 'bad_email'; end if;
  if not exists (select 1 from public.box_teams where id = p_team and active) then return 'not_found'; end if;
  -- a team that already has a working contact should use box_add_contact instead
  if exists (select 1 from public.box_team_contacts where team_id = p_team
             and email not like '%@privaterelay.appleid.com') then return 'has_contact'; end if;
  insert into public.box_contact_requests (team_id, email, note)
    values (p_team, lower(trim(p_email)), coalesce(p_note, ''));
  return 'ok_requested';
end;
$$;
grant execute on function public.box_request_contact(uuid, text, text) to anon, authenticated;

-- Approving a request (W7, SQL editor):
--   insert into public.box_team_contacts (team_id, email) select team_id, email from public.box_contact_requests where id = '<id>';
--   update public.box_contact_requests set status = 'approved' where id = '<id>';
