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

# Playtomic's own floor rating - an unrated player is not a weak player, but
# the boxes need a number and this is the lowest the platform issues.
UNRATED_DEFAULT = 0.50

# (playtomic_team_no, p1, r1, p2, r2) — from the Manager entrant list, 4 Sep 2026 20:50.
# 87 teams / 174 players against the raised 100-team cap (was 67 on 1 Sep). Two different players share
# the name Ciara Kavanagh (ratings 1.47 and 1.00); the second is suffixed so
# the box tables cannot collapse them into one entrant.
ROSTER = [
    (1, "Shane Donohoe", 4.51, "Dylan Orr", 4.13),
    (2, "Davy O'Sullivan", 4.53, "David Hennebry", 3.51),
    (3, "J.P. Comerford", 3.09, "Conor Ruttledge", 4.49),
    (4, "Tomas Morrissey", 3.51, "Brian Cornyn", 3.80),
    (5, "David Deady", 2.73, "Rob Lucy", 4.34),
    (6, "James Connolly", 2.81, "Michael Connolly", 4.04),
    (7, "Mike Shanahan", 3.52, "Greg Shine", 3.24),
    (8, "Dean Noble", 3.72, "Chris Ffrench", 2.85),
    (9, "Dylan Furlong", 3.32, "Jack Furlong", 3.20),
    (10, "Antonio Loboschi", 2.79, "Sahil Kaistha", 3.61),
    (11, "Matthew", 3.47, "Nathan Condell", 2.63),
    (12, "Sean Leonard", 2.48, "Dylan Frazer", 3.39),
    (13, "Ingvard Hanssen", 3.87, "Oisin Breen", 1.49),
    (14, "Ciara Kavanagh", 1.47, "Rory Fahey", 3.69),
    (15, "Ronel Pickford", 2.60, "Dawn B", 2.43),
    (16, "Desmond Martin", 2.70, "Dave Smyth", 2.16),
    (17, "Shane Devlin", 2.80, "Karl Earls", 2.04),
    (18, "Mark Banim", 2.60, "Anton Burihhin", 2.17),
    (19, "Kieran Fraser", 2.80, "Ana J", 1.88),
    (20, "Shaun Humby", 2.30, "Thomas McKeon", 2.32),
    (21, "Tom Maguire", 2.12, "Brian O'Sullivan", 2.44),
    (22, "Lee Fitzpatrick", 2.33, "Mo Dunne", 2.20),
    (23, "Kayleigh Sullivan", 2.18, "Leanne S", 2.29),
    (24, "Aisling O'Brien", 1.90, "Patrick Kennelly", 2.56),
    (25, "Charles Lee", 3.06, "Cami Ammirevole", 1.37),
    (26, "Karol Stankiewicz", 1.78, "Sath", 2.48),
    (27, "Gabriel Uribe", 2.23, "Aron Souto", 2.01),
    (28, "Callum Smale", 2.64, "Ryan Tolan", 1.57),
    (29, "Cillian Williams", 2.53, "Ava Williams", 1.66),
    (30, "Keefe Lang", 2.68, "Chris Lang", 1.51),
    (31, "John D", 2.11, "Sam Harte", 2.02),
    (32, "Toby Wuyts", 2.39, "Jack Dunn", 1.73),
    (33, "Oussama Kenouche", 2.36, "Jack Colaluca", 1.69),
    (34, "Fionn Lang", 2.11, "Anthea Lang", 1.88),
    (35, "Peter Dunne", 2.41, "Lillian Carthy", 1.54),
    (36, "Lorraine Gallagher", 1.59, "Tina Meehan", 2.36),
    (37, "Kieran Fitzpatrick", 2.53, "Stephen Fitzpatrick", 1.27),
    (38, "David O Neill", 1.97, "John O Neill", 1.68),
    (39, "Mark Tindale", 1.60, "Mark Williams", 1.98),
    (40, "Kylie Maher", 2.28, "Seoin Talbot", 1.08),
    (41, "Tom Foley", 1.50, "Fernando Souza", 1.79),
    (42, "Thomas Meade", 2.60, "Maurice Ramsay", 0.67),
    (43, "Gary Stephenson", 1.20, "Wayne Neary", 2.04),
    (44, "Alan Cleary", 1.23, "Alex Hassett", 1.83),
    (45, "Niamh Cassidy", 0.95, "Linda Dempsey", 2.00),
    (46, "Claire Austen", 2.31, "CJ Adams", 0.65),
    (47, "Fran Ford", 1.82, "D M", 1.14),
    (48, "Damien Dunne", 1.41, "Joanne Dunne", 1.56),
    (49, "Clinton Verhoog", 1.60, "Patrick Ffrench", 1.31),
    (50, "Felix Rothschild", 1.81, "Cillian Dunne", 0.96),
    (51, "Boodhan Rampersaud", 1.54, "Anto Doran", 1.22),
    (52, "Nicole Mello Teixeira de Almeida", 1.18, "Grainne Ring", 1.55),
    (53, "Rick Deady", 1.22, "Shirley Deady", 1.40),
    (54, "Michele McCormack", 0.98, "Sonja", 1.62),
    (55, "Zydre", 1.29, "Indre Simkute", 1.27),
    (56, "Eva Rybak", 1.27, "Kris Rybak", 1.28),
    (57, "Conor Dodd", 1.00, "Dillon Mordaunt", 1.49),
    (58, "Eoin Tiernan", 1.22, "Eamonn Madden", 1.14),
    (59, "John Lester", 1.28, "Kyle Dempsey", 1.05),
    (60, "Katie Marie", 1.10, "Aoife Williams", 1.20),
    (61, "Ian Donoghue", 1.12, "Sean Cleary", 1.00),
    (62, "Zach Mac", 1.23, "John McAnulty", 0.84),
    (63, "Gary Brady", 0.71, "Ciaran O'Donoghue", 1.29),
    (64, "John Martin", 1.20, "Alice Martin", 0.80),
    (65, "Paddy Driver", 0.97, "Paddy Logue", 1.04),
    (66, "Lorna O'Rourke", 0.89, "Brona", 1.00),
    (67, "Caragh Daly", 1.05, "Kerry Callery", 0.83),
    (68, "Orla Murphy Fleming", 1.30, "Doireann", 0.51),
    (69, "Emily Tebbitt", 0.83, "Noeleen Cunningham", 0.94),
    (70, "Barry MacCourt", 0.88, "Michael Gombart", UNRATED_DEFAULT),
    (71, "Sandra Dunne", 0.66, "Kerrie Beacom", 1.01),
    (72, "Helena Plower", 0.54, "Olive Ramsay", 1.11),
    (73, "Jack Evans", 0.83, "Gavin Fogarty", 0.80),
    (74, "Niamh Gavin", 1.10, "Anita Redmond", 0.50),
    (75, "Ciara Kavanagh (2)", 1.00, "Ciaran Conlon", 0.56),
    (76, "Elaine Kirwan", 1.00, "Christina Reilly", 0.50),
    (77, "Peter O'Gara", 0.79, "Ross McHugh", 0.68),
    (78, "Aoife Shine", 0.50, "Niall Ryan", 0.87),
    (79, "Adam Macaulay", 0.66, "Giedre Guobyte", 0.50),
    (80, "Marie Galligan", 0.67, "Juliette Kidd", 0.50),
    (81, "Bairbre Heron", 0.50, "James Heron", 0.59),
    (82, "John Kavanagh", 0.50, "Kellie Kavanagh", 0.50),
    (83, "Rhys Mansueto", 0.50, "Jeff O'Brien", 0.50),
    (84, "Ken", 0.50, "Maria Neilan", 0.50),
    (85, "Alice Gibson", 0.50, "Ailis T", 0.50),
    (86, "Keith Taurai", UNRATED_DEFAULT, "Conor McMahon", 0.50),
    (87, "Pravin Kaware", 0.50, "Yashvardhan Singh Rathore", UNRATED_DEFAULT),
    # Unrated players (Michael Gombart, Keith Taurai, Yashvardhan Singh Rathore) carry
    # UNRATED_DEFAULT; re-cut their boxes once Playtomic rates them.
]

BOX_SIZE = 5        # 5 teams = 4 games, one a week for four weeks
SPILL_SIZE = 4      # the remainder box: 3 games and a bye, never 5 games


def boxes_for(n, target=BOX_SIZE):
    """Sizes for n teams: as many boxes of 5 as possible, remainder in 4s.

    The format is four games in four weeks, so a box MUST hold five teams -
    each plays the other four, one a week. Spreading a remainder into boxes of
    six would quietly hand those players a fifth fixture with no week to play
    it in. Boxes of four instead give three games and a bye, which is a
    scheduling inconvenience rather than a broken promise.
    """
    for spill in range(target):                  # 0..4 boxes of SPILL_SIZE
        rest = n - spill * SPILL_SIZE
        if rest >= 0 and rest % target == 0:
            return [target] * (rest // target) + [SPILL_SIZE] * spill
    return [n]                                   # tiny entry: one box, play it out


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
