# -*- coding: utf-8 -*-
"""Cut the parsed entrant roster into boxes on the LATEST Playtomic ratings and
produce a review pack — nothing is written to Supabase.

Outputs (data/, gitignored):
  box_cut_<date>.md         the proposed boxes, with moves vs the live table
  box_cut_<date>.sql        seed SQL for the Supabase editor (run only when finalised)

    python scripts/cut_boxes.py data/box_entries_2026-09-06.json [data/box_teams_db_2026-09-06.json]
"""
import json, os, re, sys
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_box_seed import boxes_for, UNRATED_DEFAULT   # same box-size rule as the first cut

# Display-name fixes so the box tables read well; applied to Playtomic's name field only.
NAME_FIX = {"nathan condell": "Nathan Condell", "dave smyth": "Dave Smyth", "thomas mckeon": "Thomas McKeon",
            "ryan tolan": "Ryan Tolan", "ava williams": "Ava Williams", "LorraineGallagher": "Lorraine Gallagher",
            "conor dodd": "Conor Dodd", "dillon mordaunt": "Dillon Mordaunt", "Kyle dempsey": "Kyle Dempsey",
            "elaine kirwan": "Elaine Kirwan", "Patrick ffrench": "Patrick Ffrench", "Peter O' Gara": "Peter O'Gara",
            "yashvardhan singh Rathore": "Yashvardhan Singh Rathore", "salvadorj77@gmail.com": "Salvador J"}

def key(n):  # loose match: case/space/apostrophe-insensitive
    return re.sub(r"[^a-z]", "", n.lower())

def main():
    src = sys.argv[1]
    dbp = sys.argv[2] if len(sys.argv) > 2 else None
    teams = json.load(open(src, encoding="utf-8"))
    # tidy names; disambiguate duplicates across teams (two Ciara Kavanaghs, two Grainne Rings)
    seen = Counter()
    for t in sorted(teams, key=lambda t: t["team"]):
        for p in t["players"]:
            p["name"] = NAME_FIX.get(p["name"], p["name"])
        for p in t["players"]:
            seen[p["name"]] += 1
            if seen[p["name"]] > 1:
                p["name"] = f"{p['name']} ({seen[p['name']]})"
    for t in teams:
        t["r"] = [p["rating"] if p["rating"] is not None else UNRATED_DEFAULT for p in t["players"]]
        t["combined"] = round(sum(t["r"]), 2)
        t["label"] = f"{t['players'][0]['name']} & {t['players'][1]['name']}"

    ranked = sorted(teams, key=lambda t: (-t["combined"], t["team"]))
    sizes = boxes_for(len(ranked))
    boxes, i = [], 0
    for b, size in enumerate(sizes, start=1):
        chunk = ranked[i:i + size]; i += size
        for seed, t in enumerate(chunk, start=1):
            t["box"], t["seed"] = b, seed
        boxes.append(chunk)

    # compare with the live table
    live = {}
    if dbp and os.path.exists(dbp):
        for r in json.load(open(dbp, encoding="utf-8")):
            if r["box"] == 99 or not r.get("active", True):
                continue
            live[(key(r["p1"]), key(r["p2"]))] = r
    def find_live(t):
        a, b = key(t["players"][0]["name"].split(" (")[0]), key(t["players"][1]["name"].split(" (")[0])
        return live.get((a, b)) or live.get((b, a))
    matched_ids = set()
    new, moved, rating_moves = [], [], []
    for t in ranked:
        r = find_live(t)
        if not r:
            new.append(t); continue
        matched_ids.add(r["id"]); t["live"] = r
        if r["box"] != t["box"]:
            moved.append((t, r["box"]))
        d = (t["r"][0] + t["r"][1]) - (r["r1"] + r["r2"])
        if abs(d) >= 0.05:
            rating_moves.append((t, r, d))
    dropped = [r for (k, r) in live.items() if r["id"] not in matched_ids]

    stamp = re.search(r"(\d{4}-\d{2}-\d{2})", src).group(1)
    md = [f"# Box cut on latest Playtomic ratings — {stamp}", "",
          f"{len(teams)} teams · boxes of {'/'.join(map(str, sizes))} · {len(sizes)} boxes · sorted by combined rating (unrated = {UNRATED_DEFAULT})",
          f"Live table: {len(live)} teams · **new {len(new)}** · **dropped {len(dropped)}** · moved box {len(moved)} · rating changed ≥0.05: {len(rating_moves)}", ""]
    if new:
        md += ["## New since the live table", ""] + [f"- #{t['team']} {t['label']} — {t['combined']:.2f} → box {t['box']}" for t in new] + [""]
    if dropped:
        md += ["## In the live table but not in this list", ""] + [f"- box {r['box']} {r['name']}" for r in dropped] + [""]
    if moved:
        md += ["## Teams that change box", ""] + [f"- {t['label']}: box {ob} → **{t['box']}** ({t['combined']:.2f})" for t, ob in moved] + [""]
    if rating_moves:
        md += ["## Rating changes since the live table (combined, ≥0.05)", ""] + [
            f"- {t['label']}: {r['r1'] + r['r2']:.2f} → {t['combined']:.2f} ({d:+.2f})" for t, r, d in rating_moves] + [""]
    md += ["## Proposed boxes", ""]
    for chunk in boxes:
        b = chunk[0]["box"]
        md.append(f"### Box {b} — {len(chunk)} teams, combined {chunk[-1]['combined']:.2f}–{chunk[0]['combined']:.2f}")
        md.append("")
        md.append("| Seed | Team | Ratings | Combined | Was |")
        md.append("|---|---|---|---|---|")
        for t in chunk:
            was = f"box {t['live']['box']}" if t.get("live") else "**new**"
            flags = " ⚑ unrated" if t["unrated"] else ""
            md.append(f"| {t['seed']} | {t['label']} (#{t['team']}) | {t['r'][0]:.2f} + {t['r'][1]:.2f}{flags} | {t['combined']:.2f} | {was} |")
        md.append("")
    out_md = os.path.join(os.path.dirname(src), f"box_cut_{stamp}.md")
    open(out_md, "w", encoding="utf-8").write("\n".join(md))

    q = lambda s: s.replace("'", "''")
    sql = [f"-- Box League boxes re-cut on the LATEST Playtomic ratings ({stamp}). NOT applied yet.",
           "-- Replaces every team row; run only once the boxes are finalised and BEFORE any results exist.",
           "begin;", "delete from public.box_teams where box <> 99;"]
    for chunk in boxes:
        for t in chunk:
            p1, p2 = t["players"][0]["name"], t["players"][1]["name"]
            sql.append(f"insert into public.box_teams (box, seed, name, p1, p2, r1, r2) values "
                       f"({t['box']}, {t['seed']}, '{q(t['label'])}', '{q(p1)}', '{q(p2)}', {t['r'][0]}, {t['r'][1]});")
    sql.append("commit;")
    out_sql = os.path.join(os.path.dirname(src), f"box_cut_{stamp}.sql")
    open(out_sql, "w", encoding="utf-8").write("\n".join(sql) + "\n")
    print("\n".join(md[:12]))
    print(f"\n-> {out_md}\n-> {out_sql}")

if __name__ == "__main__":
    main()
