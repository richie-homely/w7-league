# -*- coding: utf-8 -*-
"""Watch the Padel 100 note's readership and email Richie when it spikes.

Richie, 9 Oct 2026: "email me if there is a spike in viewing activity with a summary".

Runs hourly (Task Scheduler "W7 P100 Note Watch"). Each run reads the all-time view totals for
the note, the timeline and the promise ledger from site_usage_report (the market site posts
anonymous views with a "p100:" path) and appends them to data/p100_views_state.json. The hourly
delta against the previous run is the signal. A spike is:
  * at least SPIKE_MIN views in the last hour and at least SPIKE_X times the typical hour, or
  * at least SPIKE_MIN_6H views over the last six hours and three times the typical six hours,
where "typical" is the median over the last seven days of readings. One alert per COOLDOWN_H
hours, so a busy day is one email, not six. A spike email carries the last 24 hours by hour,
the split by page, unique people, and the all-time total.

    python scripts/p100_views_watch.py            # read, record, alert if warranted
    python scripts/p100_views_watch.py --status   # print the series, send nothing
    python scripts/p100_views_watch.py --test     # send the summary email now, as if spiking
"""
import json, os, statistics, sys, urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
STATE = os.path.join(ROOT, "data", "p100_views_state.json")
RICHIE = "richiecarroll65@gmail.com"
PAGES = {"p100:/padel100-risk-note": "Risk note", "p100:/p100-timeline": "Timeline exhibit", "p100:/p100-promises": "Promise ledger"}
SPIKE_MIN, SPIKE_X = 8, 4          # last hour
SPIKE_MIN_6H, SPIKE_X_6H = 20, 3   # last six hours
COOLDOWN_H = 6
NL = "\n"


def report(days):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/site_usage_report", data=json.dumps({"p_key": os.environ["SITE_ADMIN_KEY"], "p_days": days}).encode(),
                                 method="POST", headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def totals(rep):
    """{page path: {views, uniques}} for the p100 pages (hash fragments folded in)."""
    out = {}
    for p in rep.get("by_path", []):
        if p["path"].startswith("p100:"):
            base = p["path"].split("#")[0]
            r = out.setdefault(base, {"views": 0, "uniques": 0})
            r["views"] += p["views"]; r["uniques"] = max(r["uniques"], p["uniques"])
    return out


def main():
    load_env()
    args = sys.argv[1:]
    now = datetime.now(DUB)
    state = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {"readings": [], "last_alert": None}
    all_time = totals(report(400))
    day = totals(report(1))
    total_views = sum(r["views"] for r in all_time.values())
    reading = {"at": now.isoformat(timespec="minutes"), "views": total_views,
               "by_page": {k: v["views"] for k, v in all_time.items()}, "day_people": max([r["uniques"] for r in day.values()] or [0])}
    readings = [r for r in state["readings"] if datetime.fromisoformat(r["at"]) > now - timedelta(days=8)]
    deltas = []
    for a, b in zip(readings, readings[1:]):
        deltas.append((datetime.fromisoformat(b["at"]), b["views"] - a["views"]))
    last_hour = reading["views"] - readings[-1]["views"] if readings else 0
    last_6h = reading["views"] - next((r["views"] for r in reversed(readings) if datetime.fromisoformat(r["at"]) <= now - timedelta(hours=6)), readings[0]["views"] if readings else reading["views"])
    hourly = [d for _, d in deltas] or [0]
    typical_h = statistics.median(hourly)
    typical_6h = max(1, typical_h * 6)
    spike = (last_hour >= SPIKE_MIN and last_hour >= SPIKE_X * max(1, typical_h)) or (last_6h >= SPIKE_MIN_6H and last_6h >= SPIKE_X_6H * typical_6h)
    cooled = not state.get("last_alert") or datetime.fromisoformat(state["last_alert"]) <= now - timedelta(hours=COOLDOWN_H)

    lines = [f"PADEL 100 NOTE - readers, {now:%a %d %b %H:%M}",
             f"  last hour {last_hour} views - last 6h {last_6h} - typical hour {typical_h:.1f} - all time {total_views} views",
             f"  people in the last 24h: {reading['day_people']}", "  by page, all time:"]
    for k, v in sorted(all_time.items(), key=lambda x: -x[1]["views"]):
        lines.append(f"    {PAGES.get(k, k):<18} {v['views']:5} views  {v['uniques']:4} people")
    recent = [(t, d) for t, d in deltas if t > now - timedelta(hours=24)] + [(now, last_hour)]
    if recent:
        lines.append("  last 24 hours, by reading:")
        lines += [f"    {t:%a %H:%M}  {'#' * min(50, d):50} {d}" for t, d in recent]
    text = NL.join(lines)
    print(text)

    if "--status" in args:
        return 0
    readings.append(reading); state["readings"] = readings
    if (spike and cooled) or "--test" in args:
        sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
        import w7_email_html as wh
        subj = f"Padel 100 note: {'TEST - ' if '--test' in args else ''}{last_hour} views in the last hour, {last_6h} in six - {total_views} all time"
        wh.send(subj, [RICHIE], "Readership of the Padel 100 note has spiked. Summary below; anonymous browser ids only." + NL + NL + text
                + NL + NL + "Note: https://padel-market-intel-vert.vercel.app/padel100-risk-note")
        if "--test" not in args:
            state["last_alert"] = now.isoformat(timespec="minutes")
        print("alert emailed")
    elif spike:
        print("spike, but an alert went out in the last 6 hours - not repeating")
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    json.dump(state, open(STATE, "w", encoding="utf-8"), indent=1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
