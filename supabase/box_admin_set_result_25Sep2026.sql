-- ── An admin way to correct a confirmed box result (25 Sep 2026, Richie) ─────────────────────
-- Richie, 25 Sep 2026: "Can you run it without supabase sql".
--
-- He could not, and that is the point of this file. submit_box_score refuses anything already
-- confirmed and confirm_box_score only acts on 'submitted', which is right for players: a result
-- both teams agreed should not move because one of them changes their mind. But it left the
-- league with no way to fix its own errors except opening the SQL editor, so every correction
-- became a hand-written statement.
--
-- Elaine Kirwan & Christina Reilly entered their 7-5, 6-0 win against the wrong side, and Anna
-- Higgins confirmed it on the score alone: "I just looked at the score and it was correct so I
-- confirmed not realising the names were reversed" (25 Sep 2026). The result had the win on the
-- wrong team.
--
-- Gated on SITE_ADMIN_KEY, the same key the usage and contact admin functions use, so it can be
-- called from a script with the anon key and never from a browser. Every call is written to
-- box_score_log with the reason, because a result that changes after both teams agreed should
-- always be answerable for.

create or replace function public.box_admin_set_result(
  p_match uuid,
  p_sets jsonb,
  p_reason text,
  p_key text
) returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m public.box_matches%rowtype;
begin
  if p_key is null or p_key = '' or not exists (
       select 1 from public.site_admin_keys where key = p_key) then
    return 'not_authorised';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    return 'reason_required';
  end if;

  select * into m from public.box_matches where id = p_match for update;
  if not found then return 'not_found'; end if;

  -- p_sets null clears the result and puts the fixture back to unplayed, which is what a result
  -- entered on the wrong fixture needs; otherwise the sets must pass the same validation a
  -- player's entry does, so an admin cannot write a score the rules would reject.
  if p_sets is null then
    update public.box_matches
       set sets = null, status = 'pending', submitted_team = null,
           submitted_at = null, confirmed_at = null, updated_at = now()
     where id = p_match;
    insert into public.box_score_log (match_id, action, email, sets)
      values (p_match, 'admin_clear: ' || left(trim(p_reason), 180), 'admin', null);
    return 'ok_cleared';
  end if;

  if not public._box_sets_valid(p_sets) then return 'bad_sets'; end if;

  update public.box_matches
     set sets = p_sets, status = 'confirmed', confirmed_at = now(), updated_at = now()
   where id = p_match;
  insert into public.box_score_log (match_id, action, email, sets)
    values (p_match, 'admin_set: ' || left(trim(p_reason), 180), 'admin', p_sets);
  return 'ok_set';
end;
$$;

revoke all on function public.box_admin_set_result(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.box_admin_set_result(uuid, jsonb, text, text) to anon, authenticated;
