# -*- coding: utf-8 -*-
"""Padel 100 note readership in five-minute windows, as a small dashboard page.

Richie, 9 Oct 2026: "show me the views by time in 5 min windows ... in a mini view or dashboard".

Pulls the raw p100 view events through site_usage_events (supabase/site_usage_events_09Oct2026.sql,
key-gated), buckets them into five-minute windows in Dublin time, prints a text histogram and
writes a self-contained page, data/p100_views_timeline.html: last 24 hours by five minutes, the
last seven days by hour, the split by page, and the most recent events. Visitor ids are the
first eight characters of a random browser id; nothing identifies a person.

    python scripts/p100_views_timeline.py             # last 24h, writes the page
    python scripts/p100_views_timeline.py --days 7    # longer window for the event list
"""
import html, json, os, sys, urllib.error, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

DUB = ZoneInfo("Europe/Dublin")
OUT = os.path.join(ROOT, "data", "p100_views_timeline.html")
PAGES = {"p100:/padel100-risk-note": "Risk note", "p100:/p100-timeline": "Timeline", "p100:/p100-promises": "Promises"}
NL = "\n"


def events(days):
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    body = json.dumps({"p_key": os.environ["SITE_ADMIN_KEY"], "p_prefix": "p100:", "p_days": days}).encode()
    req = urllib.request.Request(f"{url}/rest/v1/rpc/site_usage_events", data=body, method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=60).read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise SystemExit("site_usage_events is not in the database yet: paste supabase/site_usage_events_09Oct2026.sql into the Supabase SQL editor")
        raise
    if isinstance(data, dict) and data.get("status") == "bad_key":
        raise SystemExit("SITE_ADMIN_KEY rejected")
    out = []
    for e in data:
        at = datetime.fromisoformat(e["at"].replace("Z", "+00:00")).astimezone(DUB)
        out.append({**e, "at": at, "page": PAGES.get(e["path"].split("#")[0], e["path"])})
    return out


def bucket(t, minutes):
    return t.replace(minute=t.minute - t.minute % minutes, second=0, microsecond=0)


def main():
    load_env()
    days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 7
    now = datetime.now(DUB)
    ev = events(days)
    views = [e for e in ev if e["event"] == "view"]
    day = [e for e in views if e["at"] > now - timedelta(hours=24)]
    week = [e for e in views if e["at"] > now - timedelta(days=7)]
    five = Counter(bucket(e["at"], 5) for e in day)
    hours = Counter(bucket(e["at"], 60) for e in week)
    by_page = Counter(e["page"] for e in week)
    people_day, people_week = len({e["visitor"] for e in day}), len({e["visitor"] for e in week})
    returns = sum(1 for e in ev if e["event"] == "return" and e["at"] > now - timedelta(days=7))

    # text view: every five-minute window with a view in the last 24 hours
    lines = [f"PADEL 100 NOTE - views by five-minute window, last 24h to {now:%a %d %b %H:%M}",
             f"  {len(day)} views by {people_day} browsers in 24h; {len(week)} views by {people_week} in 7 days; {returns} return visits in 7 days"]
    for t in sorted(five):
        lines.append(f"  {t:%a %H:%M}  {'#' * five[t]:<30} {five[t]}")
    if not five:
        lines.append("  no views in the last 24 hours")
    print(NL.join(lines))

    # page: 24h in five-minute bars, 7 days in hourly bars, split by page, recent events
    def bars(counter, start, step, n, label_every, fmt):
        mx = max(counter.values(), default=1)
        w, h, gap = 1000, 160, 1
        bw = w / n
        out = [f'<svg viewBox="0 0 {w} {h + 28}" width="100%" preserveAspectRatio="none" style="height:190px">']
        for i in range(n):
            t = start + step * i
            v = counter.get(t, 0)
            bh = (v / mx) * h if v else 0
            x = i * bw
            out.append(f'<rect x="{x:.1f}" y="{h - bh:.1f}" width="{max(bw - gap, 0.5):.1f}" height="{bh:.1f}" fill="{"#D4FF3A" if v else "#1f1f1f"}"><title>{html.escape(t.strftime(fmt))}: {v} view{"s" if v != 1 else ""}</title></rect>')
            if i % label_every == 0:
                out.append(f'<text x="{x:.1f}" y="{h + 20}" fill="#8a8a8a" font-size="11" font-family="ui-monospace,monospace">{html.escape(t.strftime(fmt))}</text>')
        out.append("</svg>")
        return NL.join(out), mx

    start24 = bucket(now - timedelta(hours=24), 5) + timedelta(minutes=5)
    svg24, mx24 = bars(five, start24, timedelta(minutes=5), 288, 36, "%H:%M")
    start7 = bucket(now - timedelta(days=7), 60) + timedelta(hours=1)
    svg7, mx7 = bars(hours, start7, timedelta(hours=1), 168, 24, "%a %d")
    recent = sorted(ev, key=lambda e: e["at"], reverse=True)[:60]
    rows = NL.join(f"<tr><td class=m>{e['at']:%a %d %b %H:%M:%S}</td><td>{html.escape(e['page'])}</td><td>{e['event']}</td><td class=m>{html.escape(e['visitor'])}</td></tr>" for e in recent)
    pages = NL.join(f"<tr><td>{html.escape(p)}</td><td class=n>{v}</td><td class=n>{len({e['visitor'] for e in week if e['page'] == p})}</td></tr>" for p, v in by_page.most_common())
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Padel 100 note readers</title>
<style>
:root{{--bg:#0a0a0a;--card:#1a1a1a;--border:#2a2a2a;--acc:#D4FF3A;--text:#fafafa;--muted:#8a8a8a}}
body{{margin:0;padding:20px 16px;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}}
h1{{font-family:Impact,Oswald,'Arial Narrow',sans-serif;font-weight:400;letter-spacing:.02em;font-size:28px;margin:0 0 4px;text-transform:uppercase}}
.sub{{color:var(--muted);margin:0 0 18px}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}}
.tile{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px}}
.tile b{{display:block;font-family:ui-monospace,Menlo,monospace;font-size:26px;color:var(--acc)}}
.tile span{{color:var(--muted);font-size:12px}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px}}
.card h2{{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 10px;font-weight:600}}
table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{padding:5px 8px;border-bottom:1px solid var(--border);text-align:left}}th{{color:var(--muted);font-weight:600;font-size:12px}}
.n{{text-align:right;font-family:ui-monospace,monospace}}.m{{font-family:ui-monospace,monospace;color:var(--muted)}}
</style></head><body>
<h1>Padel 100 note &middot; readers</h1>
<p class="sub">Generated {now:%A %d %B %Y %H:%M} Dublin time &middot; anonymous browser ids, no personal data &middot; regenerate with <code>python scripts/p100_views_timeline.py</code></p>
<div class="tiles">
<div class="tile"><b>{len(day)}</b><span>views, last 24 hours</span></div>
<div class="tile"><b>{people_day}</b><span>browsers, last 24 hours</span></div>
<div class="tile"><b>{len(week)}</b><span>views, last 7 days</span></div>
<div class="tile"><b>{people_week}</b><span>browsers, last 7 days</span></div>
<div class="tile"><b>{returns}</b><span>return visits, 7 days</span></div>
</div>
<div class="card"><h2>Last 24 hours, five-minute windows &middot; tallest bar {mx24 if five else 0}</h2>{svg24}</div>
<div class="card"><h2>Last 7 days, by hour &middot; tallest bar {mx7 if hours else 0}</h2>{svg7}</div>
<div class="card"><h2>By page, last 7 days</h2><table><tr><th>Page</th><th class=n>Views</th><th class=n>Browsers</th></tr>{pages or '<tr><td colspan=3>no views yet</td></tr>'}</table></div>
<div class="card"><h2>Most recent events</h2><table><tr><th>When</th><th>Page</th><th>Event</th><th>Browser</th></tr>{rows or '<tr><td colspan=4>none</td></tr>'}</table></div>
</body></html>"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(page)
    print("page:", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
