# -*- coding: utf-8 -*-
"""Turn the Playtomic entrant list into provisional boxes.

Playtomic exports entrants as numbered teams with each player's rating. This
checks whether that numbering is already a ranking, sorts by combined rating
either way, cuts the field into boxes and writes the SQL to seed box_teams.

box_teams is public-read but admin-write, so the output is SQL to paste into the
Supabase editor rather than a direct insert — auditable, and it does not need a
service key on this machine.

    python scripts/build_box_seed.py
"""
import os

# (playtomic_team_no, p1, r1, p2, r2) — from the Manager entrant list, 31 Aug 2026.
# 56 teams / 112 players of the 120-player cap. Two different players share
# the name Ciara Kavanagh (ratings 1.47 and 1.00); the second is suffixed so
# the box tables cannot collapse them into one entrant.
ROSTER = [
    (1, "Shane Donohoe", 4.51, "Dylan Orr", 4.13),
    (2, "Davy O'Sullivan", 4.53, "David Hennebry", 3.51),
    (3, "J.P. Comerford", 3.09, "Conor Ruttledge", 4.49),
    (4, "Tomas Morrissey", 3.51, "Brian Cornyn", 3.80),
    (5, "David Deady", 2.73, "Rob Lucy", 4.34),
    (6, "Mike Shanahan", 3.52, "Greg Shine", 3.24),
    (7, "Antonio Loboschi", 2.79, "Sahil Kaistha", 3.61),
    (8, "Matthew", 3.47, "Nathan Condell", 2.63),
    (9, "Sean Leonard", 2.48, "Dylan Frazer", 3.39),
    (10, "Ingvard Hanssen", 3.87, "Oisin Breen", 1.49),
    (11, "Ciara Kavanagh", 1.47, "Rory Fahey", 3.69),
    (12, "Ronel Pickford", 2.60, "Dawn B", 2.43),
    (13, "Mark Banim", 2.60, "Anton Burihhin", 2.17),
    (14, "Kieran Fraser", 2.80, "Ana J", 1.88),
    (15, "Shaun Humby", 2.30, "Thomas McKeon", 2.32),
    (16, "Tom Maguire", 2.12, "Brian O'Sullivan", 2.44),
    (17, "Lee Fitzpatrick", 2.33, "Mo Dunne", 2.20),
    (18, "Kayleigh Sullivan", 2.18, "Leanne S", 2.29),
    (19, "Karol Stankiewicz", 1.78, "Sath", 2.48),
    (20, "Gabriel Uribe", 2.23, "Aron Souto", 2.01),
    (21, "Callum Smale", 2.64, "Ryan Tolan", 1.57),
    (22, "Cillian Williams", 2.53, "Ava Williams", 1.66),
    (23, "Keefe Lang", 2.68, "Chris Lang", 1.51),
    (24, "John D", 2.11, "Sam Harte", 2.02),
    (25, "Oussama Kenouche", 2.36, "Jack Colaluca", 1.69),
    (26, "Fionn Lang", 2.11, "Anthea Lang", 1.88),
    (27, "Peter Dunne", 2.41, "Lillian Carthy", 1.54),
    (28, "Lorraine Gallagher", 1.59, "Tina Meehan", 2.36),
    (29, "Kieran Fitzpatrick", 2.53, "Stephen Fitzpatrick", 1.27),
    (30, "David O Neill", 1.97, "John O Neill", 1.68),
    (31, "Mark Tindale", 1.60, "Mark Williams", 1.98),
    (32, "Tom Foley", 1.50, "Fernando Souza", 1.79),
    (33, "Gary Stephenson", 1.20, "Wayne Neary", 2.04),
    (34, "Niamh Cassidy", 0.95, "Linda Dempsey", 2.00),
    (35, "Claire Austen", 2.31, "CJ Adams", 0.65),
    (36, "Fran Ford", 1.82, "D M", 1.14),
    (37, "Nicole Mello Teixeira de Almeida", 1.18, "Grainne Ring", 1.55),
    (38, "Rick Deady", 1.22, "Shirley Deady", 1.40),
    (39, "Michele McCormack", 0.98, "Sonja", 1.62),
    (40, "Zydre", 1.29, "Indre Simkute", 1.27),
    (41, "Eva Rybak", 1.27, "Kris Rybak", 1.28),
    (42, "Conor Dodd", 1.00, "Dillon Mordaunt", 1.49),
    (43, "Eoin Tiernan", 1.22, "Eamonn Madden", 1.14),
    (44, "John Lester", 1.28, "Kyle Dempsey", 1.05),
    (45, "Katie Marie", 1.10, "Aoife Williams", 1.20),
    (46, "Ian Donoghue", 1.12, "Sean Cleary", 1.00),
    (47, "Gary Brady", 0.71, "Ciaran O'Donoghue", 1.29),
    (48, "Orla Murphy Fleming", 1.30, "Doireann", 0.51),
    (49, "Sandra Dunne", 0.66, "Kerrie Beacom", 1.01),
    (50, "Ciara Kavanagh (2)", 1.00, "Ciaran Conlon", 0.56),
    (51, "Aoife Shine", 0.50, "Niall Ryan", 0.87),
    (52, "Adam Macaulay", 0.66, "Giedre Guobyte", 0.50),
    (53, "Lionel Tauro", 0.64, "Iora P", 0.50),
    (54, "John Kavanagh", 0.50, "Kellie Kavanagh", 0.50),
    (55, "Rhys Mansueto", 0.50, "Jeff O'Brien", 0.50),
    (56, "Ken", 0.50, "Maria Neilan", 0.50),
]

TARGET_BOX = 6      # teams per box; the remainder is spread, not dumped in one


def boxes_for(n, target=TARGET_BOX):
    """Sizes for n teams, as even as possible around `target`.

    A box league is only fair if the boxes are comparable, so 37 teams becomes
    6/6/6/6/6/7 rather than six sixes and a lonely single.
    """
    count = max(1, round(n / target))
    base, extra = divmod(n, count)
    return [base + (1 if i >= count - extra else 0) for i in range(count)]


def main():
    ranked = sorted(ROSTER, key=lambda t: -(t[2] + t[4]))

    # Is Playtomic's own numbering already a ranking?
    as_listed = [t[0] for t in ranked]
    already = as_listed == sorted(as_listed)
    print("Playtomic's team numbering is "
          + ("ALREADY ranked by combined rating — the order is kept as-is."
             if already else "NOT a clean ranking; sorting by combined rating."))
    if not already:
        moved = [(t[0], i + 1) for i, t in enumerate(ranked) if t[0] != i + 1]
        print(f"  {len(moved)} team(s) move: "
              + ", ".join(f"#{a}->{b}" for a, b in moved[:8])
              + (" …" if len(moved) > 8 else ""))

    sizes = boxes_for(len(ranked))
    print(f"\n{len(ranked)} teams · {sum(sizes)} placed · boxes of {'/'.join(map(str, sizes))}\n")

    rows, i = [], 0
    for b, size in enumerate(sizes, start=1):
        chunk = ranked[i:i + size]
        i += size
        lo = min(t[2] + t[4] for t in chunk)
        hi = max(t[2] + t[4] for t in chunk)
        print(f"  BOX {b}  ({size} teams, combined {lo:.2f}–{hi:.2f})")
        for seed, (no, p1, r1, p2, r2) in enumerate(chunk, start=1):
            print(f"     {seed}. {p1} & {p2:22} {r1:.2f} + {r2:.2f} = {r1 + r2:.2f}")
            rows.append((b, seed, f"{p1} & {p2}", p1, p2, r1, r2))
        print()

    sql = ["-- Provisional Autumn/Winter Padel Box League boxes.",
           "-- Generated by scripts/build_box_seed.py from the Playtomic entrant list.",
           "-- Boxes are by COMBINED Playtomic rating and are provisional until entry closes.",
           "begin;",
           "delete from public.box_teams;"]
    for b, seed, name, p1, p2, r1, r2 in rows:
        q = lambda s: s.replace("'", "''")
        sql.append(
            f"insert into public.box_teams (box, seed, name, p1, p2, r1, r2) values "
            f"({b}, {seed}, '{q(name)}', '{q(p1)}', '{q(p2)}', {r1}, {r2});")
    sql.append("commit;")

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "supabase", "seed_box_league.sql")
    open(out, "w", encoding="utf-8").write("\n".join(sql) + "\n")
    print(f"SQL for the Supabase editor -> {out}")
    print(f"  {len(rows)} teams across {len(sizes)} boxes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
