-- ── Ratings refresh without the SQL editor (Richie, 5 Oct 2026: "set this up to make it update
-- automatically every week") ────────────────────────────────────────────────────────────────────
-- scripts/refresh_league_ratings.py reads every league player's live Playtomic level from W7's
-- venue player list and, with --push, hands the changes here as one JSON array:
--   [{"table":"box_teams","id":"<uuid>","r1":2.59,"r2":2.59}, {"table":"teams","id":"<uuid>","r2":1.23}, ...]
-- Only r1/r2 (and updated_at) ever change; a missing key leaves that column alone. Gated on
-- SITE_ADMIN_KEY like the other admin functions, so it runs from the NUC with the anon key and
-- never from a browser. Run once in the Supabase SQL editor.

create or replace function public.league_admin_set_ratings(p_key text, p_rows jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r        record;
  n_box    int := 0;
  n_teams  int := 0;
  n_bad    int := 0;
begin
  if p_key is null or p_key = '' or not exists (select 1 from public.site_admin_keys where key = p_key) then
    return jsonb_build_object('status', 'not_authorised');
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('status', 'bad_rows');
  end if;
  for r in select (e->>'table') as tbl, (e->>'id')::uuid as id,
                  (e->>'r1')::numeric as r1, (e->>'r2')::numeric as r2
             from jsonb_array_elements(p_rows) e loop
    if r.r1 is not null and (r.r1 < 0 or r.r1 > 7) or r.r2 is not null and (r.r2 < 0 or r.r2 > 7) then
      n_bad := n_bad + 1; continue;            -- Playtomic levels run 0-7
    end if;
    if r.tbl = 'box_teams' then
      update public.box_teams set r1 = coalesce(r.r1, r1), r2 = coalesce(r.r2, r2), updated_at = now() where id = r.id;
      if found then n_box := n_box + 1; end if;
    elsif r.tbl = 'teams' then
      update public.teams set r1 = coalesce(r.r1, r1), r2 = coalesce(r.r2, r2), updated_at = now() where id = r.id;
      if found then n_teams := n_teams + 1; end if;
    else
      n_bad := n_bad + 1;
    end if;
  end loop;
  return jsonb_build_object('status', 'ok', 'box_teams', n_box, 'teams', n_teams, 'rejected', n_bad);
end;
$$;

revoke all on function public.league_admin_set_ratings(text, jsonb) from public, anon, authenticated;
grant execute on function public.league_admin_set_ratings(text, jsonb) to anon, authenticated;
