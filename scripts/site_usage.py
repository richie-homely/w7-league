# -*- coding: utf-8 -*-
"""Who is using league.w7padel.com — the sponsor numbers and the who-needs-help list.

Reads site_usage_report(p_key, p_days) with SITE_ADMIN_KEY from .env.local (aggregates + per-team activity, no emails) and prints:
  * views / unique visitors by day and by page (for sponsors)
  * every box-league team with first/last seen and what they did
  * the teams that have NEVER identified themselves on the site — the ones to chase
    with a link or an email fix

    python scripts/site_usage.py [--days 60] [--md out.md]
"""
import argparse, io, json, os, urllib.request
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def env():
    e = {}
    for ln in io.open(os.path.join(ROOT, ".env.local"), encoding="utf-8-sig"):
        ln = ln.strip()
        if ln and "=" in ln and not ln.startswith("#"):
            k, _, v = ln.partition("="); e[k.strip()] = v.strip().strip('"')
    return e

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=60)
    ap.add_argument("--md", help="also write the report as markdown here")
    a = ap.parse_args()
    e = env()
    url, key = e["NEXT_PUBLIC_SUPABASE_URL"], e["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/site_usage_report", data=json.dumps({"p_key": e.get("SITE_ADMIN_KEY", ""), "p_days": a.days}).encode(),
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
    r = json.load(urllib.request.urlopen(req))
    if isinstance(r, dict) and r.get("status") == "bad_key":
        raise SystemExit("SITE_ADMIN_KEY in .env.local does not match the passcode in site_admin_keys")
    t = r["totals"]
    L = [f"# league.w7padel.com usage — last {a.days} days (read {datetime.now():%a %d %b %Y %H:%M})", "",
         f"**{t['views']} page views · {t['unique_visitors']} unique visitors · {t['teams_active']} of the box-league teams identified themselves · "
         f"{t['results_submitted']} results submitted · {t['results_confirmed']} confirmed**", "",
         "## By day", "", "| Day | Views | Unique visitors |", "|---|---|---|"]
    L += [f"| {d['day']} | {d['views']} | {d['uniques']} |" for d in r["by_day"]]
    L += ["", "## By page", "", "| Page | Views | Unique visitors |", "|---|---|---|"]
    L += [f"| {p['path']} | {p['views']} | {p['uniques']} |" for p in r["by_path"][:25]]
    teams = r["teams"]
    seen = [x for x in teams if x["first_seen"]]
    never = [x for x in teams if not x["first_seen"]]
    L += ["", f"## Box-league teams on the site ({len(seen)} of {len(teams)})", "",
          "| Box | Team | First seen | Last seen | Visits | Submits | Confirms |", "|---|---|---|---|---|---|---|"]
    for x in sorted(seen, key=lambda x: (x["box"], x["name"])):
        L.append(f"| {x['box']} | {x['name']} | {x['first_seen'][:16].replace('T',' ')} | {x['last_seen'][:16].replace('T',' ')} | {x['events']} | {x['submits']} | {x['confirms']} |")
    L += ["", f"## Never identified themselves — chase with a link or check their email ({len(never)})", ""]
    L += [f"- Box {x['box']}: {x['name']}" for x in never]
    out = "\n".join(L)
    print(out)
    if a.md:
        open(a.md, "w", encoding="utf-8").write(out + "\n"); print("->", a.md)

if __name__ == "__main__":
    main()
