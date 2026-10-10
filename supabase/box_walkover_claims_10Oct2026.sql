-- ── Teams claim and concede walkovers themselves (Richie, 10 Oct 2026: "we also want the teams
-- themselves to be able to enter scores and walk over when it's given ... if a team can't make
-- it, they can claim a walk over") ──────────────────────────────────────────────────────────────
-- Needs box_walkover_09Oct2026.sql first (the walkover status and walkover_to column).
--
-- Two player actions, both on the registered email like a score:
--   claim_box_walkover   the team that was ready says the other side didn't turn up / conceded.
--                        It sits as 'submitted' with no sets and walkover_to = the claimant,
--                        and the other team confirms or disputes it with the same one tap as a
--                        score. Not disputed by the cycle deadline = it stands, like a score.
--   concede_box_match    the team that can't play gives the walkover away. Immediate: it only
--                        costs them. Only W7 can undo it (the guard trigger from 9 Oct).
--
-- One trigger keeps the rest of the system unchanged: a submitted walkover claim that gets
-- confirmed (by the opponent's tap, or by the cycle close) becomes 'walkover', not 'confirmed'
-- with no score; and a score entered over a claim clears the claim. Paste once.

create or replace function public._box_walkover_rules()
returns trigger language plpgsql as $$
begin
  if new.sets is not null then
    new.walkover_to := null;                 -- a real score replaces any walkover claim
  end if;
  if new.status = 'confirmed' and new.sets is null and new.walkover_to is not null then
    new.status := 'walkover';                -- a confirmed claim is a walkover, not a scoreless result
  end if;
  return new;
end;
$$;
drop trigger if exists box_matches_walkover_rules on public.box_matches;
create trigger box_matches_walkover_rules before update on public.box_matches
  for each row execute function public._box_walkover_rules();

-- submit_box_score: as 27 Aug 2026, plus refusing a fixture that is already a walkover or void.
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

--   ok_walkover_claimed | ok_disputed (the other team had already entered something)
--   not_found | not_registered | already_confirmed
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

  -- the other team has already entered a score or a claim of their own: the two accounts differ
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

--   ok_conceded | not_found | not_registered | already_confirmed
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
