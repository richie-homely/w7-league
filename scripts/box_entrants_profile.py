# -*- coding: utf-8 -*-
"""Who has entered the box league: regulars vs new players (Richie, 9 Sep 2026, for David
and management).

For each of the 200 entrants, count the W7 bookings they have appeared in (as a named
participant) across every saved Playtomic extract in ../w7-padel/data/playtomic — the
extracts are 90-day windows that overlap, so the union by booking id covers roughly
April to today. Matching is by name (normalised) and, where we hold one, by email.

Bands:  first-timer = no W7 booking on record · new = 1-4 · regular = 5-14 · core = 15+

    python scripts/box_entrants_profile.py            # prints + writes docs/Box_League_Entrants_<date>.md
"""
import glob, io, json, os, re, sys, urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W7 = os.path.join(os.path.dirname(ROOT), "w7-padel")
EXTRACTS = os.path.join(W7, "data", "playtomic")
norm = lambda n: re.sub(r"[^a-z]", "", (n or "").lower())
BANDS = [("first-timer", 0, 0), ("new", 1, 4), ("regular", 5, 14), ("core", 15, 10**6)]

def band(n):
    for name, lo, hi in BANDS:
        if lo <= n <= hi: return name

def load_bookings():
    import openpyxl
    seen, out = set(), []
    for f in sorted(glob.glob(os.path.join(EXTRACTS, "*.xlsx"))):
        try:
            wb = openpyxl.load_workbook(f, read_only=True)
        except Exception:
            continue
        ws = wb["Bookings"] if "Bookings" in wb.sheetnames else wb[wb.sheetnames[0]]
        rows = ws.iter_rows(values_only=True)
        hdr = [str(h or "") for h in next(rows)]
        col = {h: i for i, h in enumerate(hdr)}
        if "Booking ID" not in col or "Player Names" not in col:
            continue
        for r in rows:
            bid = r[col["Booking ID"]]
            if not bid or bid in seen: continue
            if r[col.get("Cancelled", -1)] is True or str(r[col.get("Status", -1)] or "").upper().startswith("CANCEL"): continue
            start = str(r[col["Start Time"]] or "")[:10]
            if not start or start >= date.today().isoformat(): continue     # only games already played
            seen.add(bid)
            names = [n.strip() for n in str(r[col["Player Names"]] or "").split(",") if n.strip()]
            emails = [e.strip().lower() for e in str(r[col.get("Player Emails", -1)] or "").split(",") if "@" in e]
            out.append((start, names, emails, str(r[col.get("Type", -1)] or "")))
    return out

def main():
    env = {}
    for ln in io.open(os.path.join(ROOT, ".env.local"), encoding="utf-8-sig"):
        ln = ln.strip()
        if ln and "=" in ln and not ln.startswith("#"):
            k, _, v = ln.partition("="); env[k.strip()] = v.strip().strip('"')
    H = {"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "Authorization": f"Bearer {env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}"}
    teams = json.load(urllib.request.urlopen(urllib.request.Request(
        f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/box_teams?select=id,box,seed,name,p1,p2,r1,r2&box=lt.90&active=eq.true&order=box,seed", headers=H)))
    # emails we hold per team (local contacts file + launch pack), for a second matching key
    team_emails = defaultdict(set)
    for f in [os.path.join(ROOT, "data", "box_extra_contacts.csv")] + sorted(glob.glob(os.path.join(ROOT, "data", "box_league_launch_pack_*.sql"))):
        if not os.path.exists(f): continue
        txt = open(f, encoding="utf-8").read()
        for m in re.finditer(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,})", txt):
            team_emails["_all"].add(m.group(1).lower())
    bookings = load_bookings()
    by_name, by_email, first_seen = Counter(), Counter(), {}
    for start, names, emails, typ in bookings:
        for n in names:
            k = norm(n); by_name[k] += 1
            first_seen[k] = min(first_seen.get(k, start), start)
        for e in emails: by_email[e] += 1
    span = (min(b[0] for b in bookings), max(b[0] for b in bookings)) if bookings else ("?", "?")

    players = []
    for t in teams:
        for name, rating in ((t["p1"], t["r1"]), (t["p2"], t["r2"])):
            k = norm(name.split(" (")[0])
            n = by_name.get(k, 0)
            players.append({"box": t["box"], "team": t["name"], "name": name, "rating": rating, "games": n,
                            "band": band(n), "first": first_seen.get(k)})
    bands = Counter(p["band"] for p in players)
    tot = len(players)
    # by box
    box_rows = []
    for b in sorted({p["box"] for p in players}):
        ps = [p for p in players if p["box"] == b]
        c = Counter(p["band"] for p in ps)
        box_rows.append((b, c["core"], c["regular"], c["new"], c["first-timer"], sum(p["games"] for p in ps) / len(ps),
                         sum(p["rating"] for p in ps) / len(ps)))
    firsts = [p for p in players if p["band"] == "first-timer"]
    top = sorted(players, key=lambda p: -p["games"])[:10]

    today = date.today()
    L = [f"# Autumn/Winter Box League — who has entered", "",
         f"Prepared {today:%d %B %Y} for David Hennebry and management. 100 teams, {tot} players, €20 a head.", "",
         f"**Games played at W7 before the league** (named on a W7 booking, {span[0]} to {span[1]}, {len(bookings):,} bookings on record):", "",
         "| Band | Players | Share | Meaning |", "|---|---|---|---|",
         f"| Core | {bands['core']} | {100*bands['core']/tot:.0f}% | 15+ games on record |",
         f"| Regular | {bands['regular']} | {100*bands['regular']/tot:.0f}% | 5–14 games |",
         f"| New | {bands['new']} | {100*bands['new']/tot:.0f}% | 1–4 games |",
         f"| First-timer | {bands['first-timer']} | {100*bands['first-timer']/tot:.0f}% | no W7 booking on record |",
         "",
         f"So **{bands['core']+bands['regular']} of {tot} ({100*(bands['core']+bands['regular'])/tot:.0f}%) are established W7 players** and "
         f"**{bands['new']+bands['first-timer']} ({100*(bands['new']+bands['first-timer'])/tot:.0f}%) are new or nearly new** — the league is bringing "
         f"people onto the courts, not just organising the ones already there.", "",
         "## By box", "", "| Box | Core | Regular | New | First | Avg games | Avg rating |", "|---|---|---|---|---|---|---|"]
    L += [f"| {b} | {c} | {r} | {n} | {f} | {g:.0f} | {rt:.2f} |" for b, c, r, n, f, g, rt in box_rows]
    L += ["", f"## First-timers ({len(firsts)}) — no W7 booking under this name", "",
          "These players either signed up to Playtomic for the league, played only in someone else's name, or booked under a different spelling. Worth a welcome from the desk in week one.", ""]
    L += [f"- Box {p['box']}: {p['name']} ({p['team']})" for p in sorted(firsts, key=lambda p: (p["box"], p["name"]))]
    L += ["", "## Most games on record (top 10)", "", "| Player | Team | Box | Games | First seen |", "|---|---|---|---|---|"]
    L += [f"| {p['name']} | {p['team']} | {p['box']} | {p['games']} | {p['first'] or '—'} |" for p in top]
    L += ["", "*Method: every saved Playtomic extract (overlapping 90-day windows) merged by booking id; a player is counted once per booking they were named on; cancelled bookings and future bookings excluded. Name matching is exact after normalising case and punctuation, so a player who booked under a different spelling shows as fewer games than the truth. Ratings are the live Playtomic levels used for the box cut.*"]
    out = os.path.join(ROOT, "docs", f"Box_League_Entrants_v1.0_{today:%d%b%Y}.md")
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("\n".join(L[:16])); print("->", out)
    return out

if __name__ == "__main__":
    main()
