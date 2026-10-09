-- Raw view events for one path prefix, so readership can be plotted in five-minute windows
-- (Richie, 9 Oct 2026: "show me the views by time in 5 min windows"). Key-gated exactly like
-- site_usage_report: the passcode in site_admin_keys (SITE_ADMIN_KEY in w7-league/.env.local).
-- Visitor ids are truncated to eight characters; they are random browser ids, not people.
-- Paste into the Supabase SQL editor once. Used by scripts/p100_views_timeline.py.

create or replace function public.site_usage_events(p_key text, p_prefix text default 'p100:', p_days int default 7)
returns json
language sql
security definer
set search_path = public
as $$
  select case when not exists (select 1 from public.site_admin_keys where key = p_key)
    then json_build_object('status', 'bad_key')
    else coalesce((
      select json_agg(json_build_object(
               'at', at, 'path', split_part(path, '?', 1), 'event', event, 'visitor', left(visitor::text, 8))
             order by at)
      from public.site_events
      where path like p_prefix || '%'
        and at >= now() - make_interval(days => greatest(p_days, 1))
    ), '[]'::json)
  end;
$$;
grant execute on function public.site_usage_events(text, text, int) to anon, authenticated;
