create or replace function public._box_walkover_rules()
returns trigger language plpgsql as $$
begin
  if new.sets is not null then
    new.walkover_to := null;
  end if;
  if new.status = 'confirmed' and new.sets is null and new.walkover_to is not null then
    new.status := 'walkover';
  end if;
  return new;
end;
$$;
drop trigger if exists box_matches_walkover_rules on public.box_matches;
create trigger box_matches_walkover_rules before update on public.box_matches
  for each row execute function public._box_walkover_rules();

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

  if m.status in ('confirmed', 'walkover', 'void') then return 'already_confirmed'; end if;

  if m.status in ('pending','disputed') or m.submitted_team = team then
    update public.box_matches
      set sets = p_sets, status = 'submitted', submitted_team = team,
          submitted_at = now(), confirmed_at = null
      where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'submit', lower(trim(p_email)), p_sets);
    return 'ok_submitted';
  end if;

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

create or replace function public.claim_box_walkover(p_match uuid, p_email text)
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
  if m.status in ('confirmed', 'walkover', 'void') then return 'already_confirmed'; end if;

  if m.status = 'submitted' and m.submitted_team <> team then
    update public.box_matches set status = 'disputed' where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'walkover_claim_vs_entry', lower(trim(p_email)), null);
    return 'ok_disputed';
  end if;

  update public.box_matches
     set sets = null, status = 'submitted', submitted_team = team, walkover_to = team,
         submitted_at = now(), confirmed_at = null
   where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'walkover_claim', lower(trim(p_email)), null);
  return 'ok_walkover_claimed';
end;
$$;
grant execute on function public.claim_box_walkover(uuid, text) to anon, authenticated;

create or replace function public.concede_box_match(p_match uuid, p_email text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
  team uuid;
  other uuid;
begin
  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;
  team := public._box_team_for_email(p_match, p_email);
  if team is null then return 'not_registered'; end if;
  if m.status in ('confirmed', 'walkover', 'void') then return 'already_confirmed'; end if;
  other := case when team = m.team1_id then m.team2_id else m.team1_id end;
  update public.box_matches
     set sets = null, status = 'walkover', walkover_to = other, submitted_team = team,
         submitted_at = now(), confirmed_at = now()
   where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'concede', lower(trim(p_email)), null);
  return 'ok_conceded';
end;
$$;
grant execute on function public.concede_box_match(uuid, text) to anon, authenticated;
