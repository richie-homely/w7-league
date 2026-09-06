# -*- coding: utf-8 -*-
"""Parse a Playtomic Manager entrant list (pasted as text) into a roster JSON.

The paste is one field per line: team number, then per player 6 lines —
display name/initials, rating (or N/A), full name, gender, price, enrolment
date. Ratings are the LATEST Playtomic ratings at paste time, which is the
point: the boxes are cut on these, not on the numbers from the earlier paste.

    python scripts/parse_box_entries.py data/box_entries_2026-09-06.txt
"""
import json, re, sys

UNRATED_DEFAULT = 0.50   # Playtomic's floor; an N/A player gets the floor for seeding

def parse(text):
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l != ""]
    # drop header row if present
    if lines and lines[0].lower().startswith("team"):
        lines = lines[1:]
    teams, i = [], 0
    while i < len(lines):
        if not re.fullmatch(r"\d+", lines[i]):
            raise SystemExit(f"expected a team number at line: {lines[i]!r}")
        no = int(lines[i]); i += 1
        players = []
        for _ in range(2):
            disp, rating, name, gender, price, date = lines[i:i + 6]; i += 6
            r = None if rating.upper() == "N/A" else float(rating)
            players.append({"name": re.sub(r"\s+", " ", name).strip(), "rating": r, "gender": gender,
                            "price": price, "enrolled": date})
        teams.append({"team": no, "players": players})
    return teams

def main():
    src = sys.argv[1]
    teams = parse(open(src, encoding="utf-8").read())
    for t in teams:
        rs = [p["rating"] if p["rating"] is not None else UNRATED_DEFAULT for p in t["players"]]
        t["combined"] = round(sum(rs), 2)
        t["unrated"] = sum(1 for p in t["players"] if p["rating"] is None)
    out = src.rsplit(".", 1)[0] + ".json"
    json.dump(teams, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"{len(teams)} teams -> {out}")
    print(f"unrated players: {sum(t['unrated'] for t in teams)}; free entries: "
          f"{sum(1 for t in teams for p in t['players'] if p['price'] == '€0.00')}")

if __name__ == "__main__":
    main()
