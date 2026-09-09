-- ── Admin: add or replace a team's registered email (9 Sep 2026) ────────────────────
-- Players are emailing welcome@ with "my email isn't registered" (Ahmed Shorim, 9 Sep 01:03).
-- box_team_contacts is admin-write, so until now every fix needed the SQL editor. This
-- function lets the desk/Richie's Claude session add an email with the admin passcode, so
-- the fix is one command instead of a SQL run each time.
--
--   box_admin_add_contact(p_key, p_team_id, p_email)  -> {'status':'ok'} | 'bad_key' | 'no_team'
create or replace function public.box_admin_add_contact(p_key text, p_team_id uuid, p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.site_admin_keys where key = p_key) then
    return json_build_object('status', 'bad_key');
  end if;
  if not exists (select 1 from public.box_teams where id = p_team_id) then
    return json_build_object('status', 'no_team');
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    return json_build_object('status', 'bad_email');
  end if;
  insert into public.box_team_contacts (team_id, email) values (p_team_id, lower(trim(p_email)))
  on conflict do nothing;
  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.box_admin_add_contact(text, uuid, text) to anon, authenticated;

-- Ahmed Shorim (box 18, "Ahmed Shorim & Mo") — emailed welcome@ 9 Sep 2026 01:03
insert into public.box_team_contacts (team_id, email)
select id, 'ahmed.shorim@gmail.com' from public.box_teams where name = 'Ahmed Shorim & Mo' and active
on conflict do nothing;
notify pgrst, 'reload schema';
