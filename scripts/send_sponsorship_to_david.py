# -*- coding: utf-8 -*-
"""Send David the sponsorship deck and the Wicklow Town prospect list.

Richie, 28 Sep 2026: "let's send this in email to david hennebry with the list of companies".

    python scripts/send_sponsorship_to_david.py [--dry-run]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from box_league_mailout import load_env  # noqa: E402

TO = ["davidmhennebry7@gmail.com", "richiecarroll65@gmail.com"]
DECK = os.path.join(ROOT, "docs", "sponsorship", "W7_Padel_Sponsorship_v1.1_28Sep2026.pdf")
LIST = os.path.join(ROOT, "docs", "sponsorship", "Wicklow_Town_Businesses_v1.0_28Sep2026.csv")

TEXT = """W7 Padel sponsorship - the deck and the list of local businesses to approach

David, two things attached.

THE DECK
  Thirteen pages, modelled on the court sponsorship deck Kingfisher Padel Club (Padel Society) is
  sending out in the North. Every number in it is ours, read from our own systems this morning:
  2,100+ registered players, 100-170 new every month this year, about 800 bookings and 2,050
  player visits a month, 73-76% occupancy, a 100-team box league, and 5,900 page views and 740
  visitors on the league site in the three weeks since the box league opened. Photos of the
  courts and yesterday's crowd, the website, and the new astro pitch next door.

THE PACKAGES
  - Court partner: EUR 6,000 a year per court. Naming rights ([Brand] Court 1), signage, the court
    named for them on Playtomic and the league site, 10 free court hours.
  - League title sponsor: EUR 3,750 a season. "The [Brand] Box League" on every page, every table
    and every result email to 250+ players; presents the trophies.
  - Finals day sponsor: EUR 1,100 an event. The day named for them, a stand, the bracket and invite.
  - Club partner: EUR 900 a year. Logo, a member offer, a mention in the member email.
  All ex VAT. For context Kingfisher asks GBP 6,500 a year per court. These are Richie's numbers and
  they commit the club, so a second pair of eyes on that page before anything goes out.

THE LIST
  173 Wicklow Town businesses, from the Chamber of Commerce directory and the town's own site,
  ranked A, B or C by how likely the category is to buy (the A list is motor dealers, estate
  agents, solicitors, banks, energy and hotels - the ones already on GAA and rugby jerseys), each
  with a suggested first pitch. First calls: Trinity Volkswagen and Skoda, John Linnane Motors,
  DNG, Sherry Fitzgerald, Haughton Legal, Wicklow Brewery, Tinakilly and Glenview.
  Only 40 have a phone or email from the source pages; the email column is blank for the rest and
  filling it from each business's own website is the first job of the outreach.

A VIEW ON TIMING
  It might be smart to hold the launch until the astro pitch opens and go out with one big bang:
  the pitch brings its own teams and supporters to the ground, the deck can say "open" rather
  than "opening soon", and a sponsor buying the court glass is buying the pitch-side view on the
  day it starts to matter. The list can be built and the emails found in the meantime, so we are
  ready to send the week it opens. Worth a view from you - it depends on how far off the opening is.

TWO THINGS TO CHECK IN THE DECK
  1. The finals-day page says both finals were played yesterday and the 24 knockout teams came. It
     was written from the plan, not the day - if yesterday went differently, that line changes.
  2. The contact page lists the three of us with Richie's personal Gmail. Say which address should
     be on it.

- W7 league site"""


def main():
    dry = "--dry-run" in sys.argv
    load_env()
    sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "w7-padel", "scripts"))
    import w7_email_html as wh
    for f in (DECK, LIST):
        if not os.path.exists(f):
            raise SystemExit("missing " + f)
    subject = "W7 Padel sponsorship - the deck and the Wicklow Town list"
    if dry:
        print(TEXT)
        print("\n[dry-run] would send to", ", ".join(TO), "| attachments:", os.path.basename(DECK), os.path.basename(LIST))
        return 0
    wh.send(subject, TO, TEXT, wh.shell("Sponsorship", "The deck and the list", wh.prose_body(TEXT)),
            attachments=[DECK, LIST])
    print("sent to", ", ".join(TO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
