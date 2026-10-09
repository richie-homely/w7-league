# -*- coding: utf-8 -*-
"""How many people have read the Padel 100 note (Richie, 9 Oct 2026: "put a tracker on how many
people view the padel 100 note page").

The note, the timeline and the promise ledger on the market site post an anonymous view to the
league site's site_track RPC with the path prefixed "p100:" - one random id per browser, no
personal data - so the same site_usage_report that feeds the daily usage email can count them.

    python scripts/p100_note_views.py          # today, yesterday, last 7 and 30 days, all time
"""
import json, os, sys, urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
PAGES = {"p100:/padel100-risk-note": "Risk note", "p100:/p100-timeline": "Timeline exhibit", "p100:/p100-promises": "Promise ledger"}


def report(days):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/site_usage_report", data=json.dumps({"p_key": os.environ["SITE_ADMIN_KEY"], "p_days": days}).encode(),
                                 method="POST", headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def p100_rows(rep):
    out = {}
    for p in rep.get("by_path", []):
        path = p["path"]
        if path.startswith("p100:"):
            base = path.split("#")[0]
            r = out.setdefault(base, {"views": 0, "uniques": 0})
            r["views"] += p["views"]; r["uniques"] = max(r["uniques"], p["uniques"])
    return out


def main():
    load_env()
    lines = [f"PADEL 100 NOTE - readers (anonymous browser ids), {datetime.now(DUB):%a %d %b %Y %H:%M}"]
    for label, days in (("last 24h-ish (today+yesterday)", 2), ("last 7 days", 7), ("last 30 days", 30), ("all time", 400)):
        rows = p100_rows(report(days))
        if not rows:
            lines.append(f"  {label:<32} no views recorded yet")
            continue
        tot_v = sum(r["views"] for r in rows.values())
        lines.append(f"  {label:<32} {tot_v:5} views")
        for path, r in sorted(rows.items(), key=lambda x: -x[1]["views"]):
            lines.append(f"      {PAGES.get(path, path):<18} {r['views']:5} views  {r['uniques']:4} people")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
