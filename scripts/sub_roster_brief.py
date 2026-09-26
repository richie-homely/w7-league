# -*- coding: utf-8 -*-
"""Tell David and Mike the stand-in list exists, and who is on it.

Richie, 21 Sep 2026: "send an email to dave and mike with the link and summary of who's signed up
before." Reads the roster live, so the note never quotes a stale list.

Contact details are deliberately left out: the sign-up page promises a stand-in that their email
and phone stay with W7, and the league does the introduction itself when a team asks. W7 holds
them if anyone needs to ring.

    python scripts/sub_roster_brief.py [--dry-run]
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import SITE, load_env  # noqa: E402

TO = ["davidmhennebry7@gmail.com", "mike@w7padel.com", "richiecarroll65@gmail.com"]
NL = chr(10)


def roster():
    url, key = os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/sub_roster_admin",
        data=json.dumps({"p_key": os.environ.get("SITE_ADMIN_KEY", "")}).encode(), method="POST",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def main():
    dry = "--dry-run" in sys.argv
    load_env()
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh

    rows = [r for r in roster() if r.get("active")]
    rows.sort(key=lambda r: (r.get("rating") is None, -(float(r["rating"]) if r.get("rating") is not None else 0)))
    rated = [r for r in rows if r.get("rating") is not None]
    unrated = [r for r in rows if r.get("rating") is None]

    L = [
        "Stand-in list for the box league - it is live, and people are signing up",
        "",
        "WHAT IT IS",
        "  Box teams lose a player to work, holidays and injuries every week, and a fixture nobody can",
        "  fill is an empty court and a void result for two teams. Players who are not in the league can",
        "  now put their name down to stand in, and a team short a player picks one from its own fixture.",
        "",
        "THE LINK TO SHARE",
        f"  {SITE}/box/subs",
        "  Worth posting to the members group and the socials groups. It previews with its own card on",
        "  WhatsApp, so it looks like something rather than a bare link.",
        "",
        f"WHO HAS SIGNED UP SO FAR ({len(rows)})",
    ]
    for r in rows:
        rating = f"{float(r['rating']):.2f}" if r.get("rating") is not None else "to check"
        L.append(f"  {r['name'][:26]:26} {rating:>8}   {r.get('plays') or 'no times given'}")
    L += [
        "",
        f"  {len(rated)} have a rating and can be matched to a fixture today."
        + (f" {len(unrated)} still need one checked against Playtomic." if unrated else ""),
        "",
        "HOW A TEAM USES IT",
        "  On the box page, the team enters the email it registered with, opens its own fixture and taps",
        "  Find a stand-in. The list only shows people within 0.75 of the player sitting out, which is the",
        "  league's own rule, with their level and when they usually play. They pick one and tap Ask them.",
        "  We then email the two team members and the stand-in on one thread: can you play, and when.",
        "  Nothing is booked until the stand-in says yes.",
        "",
        "WHERE TO WATCH IT",
        f"  {SITE}/admin/usage - the Stand-ins tab lists everyone on the roster with their level and",
        "  availability. Emails and phone numbers are not shown there: we promised stand-ins their",
        "  details stay with the club, and the league does the introduction itself.",
        "",
        "WHAT WOULD HELP",
        "  Post the link, and tell any regular who plays but is not in the league that we will call on",
        "  them. The list only works if there is somebody on it at every level - right now the spread is",
        "  thin at the top and the bottom.",
        "",
        "- W7 league site",
    ]
    text = NL.join(L)
    subject = f"W7 box league - stand-in list is live, {len(rows)} signed up so far"
    if dry:
        print(text)
        print("[dry-run] would send to", ", ".join(TO), "|", subject)
        return 0
    # prose_body reflows the paragraphs on a phone; the roster block stays monospace because its
    # columns are aligned with wide gaps, which is how the renderer tells a table from prose
    wh.send(subject, TO, text, wh.shell("Box League", "Stand-in list", wh.prose_body(text)))
    print("sent to", ", ".join(TO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
