# -*- coding: utf-8 -*-
"""The W7 Padel sponsorship deck: docs/sponsorship/W7_Padel_Sponsorship_v1.0_28Sep2026.pdf

Richie, 28 Sep 2026, with Kingfisher Padel Club's court sponsorship deck as the model: "a W7 padel
version of this. Highlight all our traffic and usage in the box leagues, number of eyeballs on the
website, the growth and number of players. Put in some drafts for sponsorship opportunities: court
sponsor, logo, tournament sponsor."

Ten landscape pages, the same arc as theirs: opportunity, club, why padel, audience, reach,
courts, naming rights, packages, what you get, next steps. Every number is the club's own,
read on the day it was built, with the source named in the code beside it so it can be refreshed.
Prices are DRAFTS for Richie to set; they are marked as such in the script, not on the page.

    python scripts/make_sponsorship_deck.py
"""
import asyncio
import base64
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "docs", "sponsorship")
OUT = os.path.join(OUT_DIR, "W7_Padel_Sponsorship_v1.0_28Sep2026.pdf")
HTML = os.path.join(OUT_DIR, "W7_Padel_Sponsorship_v1.0_28Sep2026.html")
LOGO = os.path.join(ROOT, "public", "box-league-logo.png")

# ── the numbers, as read 28 Sep 2026 ──────────────────────────────────────────────────────
N = {
    "players_registered": "2,100+",      # Playtomic venue players, 2,108
    "players_rated": "1,180",            # with a padel level
    "new_players_month": "100–170",      # registrations per month, Feb–Sep 2026
    "bookings_month": "800",             # Jul 782, Aug 800
    "court_hours_month": "1,000+",       # Jul 1,066, Aug 1,014
    "occupancy": "73–76%",               # Jul 76, Aug 73
    "peak_occupancy": "92%",             # 17:00–21:00, August
    "player_visits_month": "2,050",      # Jul 2,053, Aug 2,068
    "box_boxes": "20", "box_teams": "100", "box_players": "200",
    "summer_teams": "60", "summer_players": "120", "summer_divisions": "5", "summer_fixtures": "330",
    "league_players": "250+",            # 253 unique across both
    "site_views": "5,900",               # 7–28 Sep 2026
    "site_visitors": "740",
    "box_page_views": "3,200",
    "teams_online": "87 of 100",
    "results_by_players": "80",
    "knockout_teams": "24",
}

# ── DRAFT prices, ex VAT, per year unless stated. Richie to set. ──────────────────────────
P = {
    "court": "€4,000", "league": "€2,500", "finals": "€750", "partner": "€600",
}

BLACK, CARD, BORDER, LIME, TEXT, MUTE = "#0a0a0a", "#161616", "#2a2a2a", "#D4FF3A", "#fafafa", "#9a9a9a"


def logo_data():
    if os.path.exists(LOGO):
        return "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()
    return ""


def page(inner, cls=""):
    return f'<section class="pg {cls}"><div class="in">{inner}</div><div class="foot">W7 PADEL &nbsp;|&nbsp; WICKLOW TOWN &nbsp;|&nbsp; league.w7padel.com</div></section>'


def stat(v, label, sub=""):
    return (f'<div class="stat"><div class="v">{v}</div><div class="l">{label}</div>'
            + (f'<div class="s">{sub}</div>' if sub else "") + "</div>")


def card(title, body):
    return f'<div class="card"><div class="ct">{title}</div><div class="cb">{body}</div></div>'


def build_html():
    L = logo_data()
    pages = []

    # 1 cover
    pages.append(page(f'''
      <div class="cover">
        <img src="{L}" class="logo" alt="">
        <div class="eyebrow">SPONSORSHIP OPPORTUNITIES</div>
        <h1>Put your name on the<br>busiest courts in Wicklow.</h1>
        <p class="lead">W7 Padel, Glebe, Wicklow Town. Three courts, {N["players_registered"]} registered players, and a league that {N["league_players"]} of them play in.</p>
      </div>''', "cover"))

    # 2 the opportunity
    pages.append(page(f'''
      <div class="eyebrow">THE OPPORTUNITY</div>
      <h2>A year old, and already the place Wicklow plays.</h2>
      <p class="lead">W7 opened in October 2025 with three courts on the Glebe. Twelve months on it has {N["players_registered"]} players registered, {N["bookings_month"]} bookings a month, and a box league of {N["box_teams"]} teams whose standings {N["site_visitors"]} people checked online in the last three weeks. Your brand goes where those people look: on the court, on the league site, and in every result email.</p>
      <div class="three">
        {card("THE CLUB", "Three floodlit courts on the edge of Wicklow Town, open 07:00 to 22:00, seven days. Bookable on Playtomic, the app every padel player in Ireland already has.")}
        {card("THE LEAGUES", f"A {N['box_boxes']}-box league with {N['box_teams']} teams, and a summer league of {N['summer_teams']} teams in {N['summer_divisions']} divisions with knockouts and a finals day. Run on the club's own site, not a spreadsheet.")}
        {card("THE AUDIENCE", "Working-age adults from Wicklow Town, Rathnew, Ashford, Greystones and the surrounding villages, who come back every week because their league game is on the calendar.")}
      </div>'''))

    # 3 why padel
    pages.append(page(f'''
      <div class="eyebrow">WHY PADEL, WHY NOW</div>
      <h2>The fastest-growing sport in Ireland, in a town that took to it.</h2>
      <div class="two">
        {card("IT KEEPS GROWING", f"W7 adds {N['new_players_month']} newly registered players every month, and has done for all of 2026. That is a new audience for your brand every few weeks, not the same faces.")}
        {card("IT IS SOCIAL", "Four to a court, mixed ability, easy to pick up. Players book with friends, arrive early, stay for a coffee. A sponsor is seen in a good mood.")}
        {card("IT IS HABITUAL", f"A league game is a fixed date. {N['league_players']} players have one in the diary every week of the season, and check the table between games.")}
        {card("IT IS EARLY", "Padel in Wicklow is a year old. The brands on the courts now are the ones players will associate with the sport as it grows.")}
      </div>'''))

    # 4 the audience, in numbers
    pages.append(page(f'''
      <div class="eyebrow">THE AUDIENCE</div>
      <h2>Who is on the courts.</h2>
      <div class="stats">
        {stat(N["players_registered"], "registered players", "on Playtomic at W7")}
        {stat(N["new_players_month"], "new players a month", "every month of 2026")}
        {stat(N["player_visits_month"], "player visits a month", "July and August")}
        {stat(N["bookings_month"], "bookings a month", f"{N['court_hours_month']} court-hours")}
        {stat(N["occupancy"], "court occupancy", f"peak evenings {N['peak_occupancy']}")}
        {stat(N["players_rated"], "rated players", "with a Playtomic level")}
      </div>
      <p class="note">Figures from the club's booking system for July and August 2026, the two busiest months on record. Occupancy is court-hours sold against 45 a day across three courts.</p>'''))

    # 5 the leagues
    pages.append(page(f'''
      <div class="eyebrow">THE LEAGUES</div>
      <h2>{N["league_players"]} players with a game in the diary every week.</h2>
      <div class="two">
        {card(f"AUTUMN/WINTER BOX LEAGUE", f"<b>{N['box_boxes']} boxes · {N['box_teams']} teams · {N['box_players']} players.</b> Five teams a box, everyone plays everyone, promotion and relegation each cycle. Players enter their own scores online and confirm their opponents' with a tap: {N['results_by_players']} results entered by players in the first three weeks, and {N['teams_online']} teams have used the site.")}
        {card("SUMMER LEAGUE 2026", f"<b>{N['summer_teams']} teams · {N['summer_divisions']} divisions · {N['summer_fixtures']} fixtures.</b> A round-robin season from June, then {N['knockout_teams']} teams into two tiered knockouts and a finals day at the club on 27 September, the club's first birthday.")}
      </div>
      <div class="three" style="margin-top:14px">
        {card("EVERY RESULT, AN EMAIL", "When a score goes in, both teams get an email with the result and the box table. A title sponsor's name is on every one of them.")}
        {card("A STAND-IN LIST", "Players outside the league put their name down to fill in when a team is short. More people on the courts, more people on the site.")}
        {card("A FINALS DAY", "Both tiers play their finals on one Sunday at the club, with the whole membership invited. The natural home for a tournament sponsor.")}
      </div>'''))

    # 6 reach
    pages.append(page(f'''
      <div class="eyebrow">THE REACH</div>
      <h2>Eyeballs, counted.</h2>
      <div class="stats">
        {stat(N["site_views"], "page views", "league.w7padel.com, 7–28 Sep")}
        {stat(N["site_visitors"], "unique visitors", "in the same three weeks")}
        {stat(N["box_page_views"], "views of the box tables", "the page a sponsor's name sits on")}
        {stat(N["teams_online"], "box teams on the site", "identified by their own email")}
      </div>
      <p class="lead" style="margin-top:18px">That is the league site alone, three weeks into the season. Add the WhatsApp groups every box runs itself, the club's Instagram and Facebook, the result and fixture emails to every league player, and the {N["player_visits_month"]} people a month who walk past the court signage.</p>
      <p class="note">Site figures from the club's own analytics, not estimates. We will report them to sponsors quarterly.</p>'''))

    # 7 the courts / naming rights
    pages.append(page(f'''
      <div class="eyebrow">COURT NAMING RIGHTS</div>
      <h2>Your name on the court, every session, every day.</h2>
      <div class="two">
        <div class="mock">
          <div class="mock-brand">[ YOUR BRAND ]</div>
          <div class="mock-court">COURT 1</div>
          <div class="mock-sub">AT W7 PADEL, WICKLOW</div>
        </div>
        <div>
          {card("WHERE IT APPEARS", "On the court glass, facing the players and the seating. On the court's name in Playtomic, so it reads <b>[Your Brand] Court 1</b> every time anyone books it. On the league site wherever that court is named: fixtures, knockouts, finals day.")}
          {card("WHO SEES IT", f"Every one of {N['player_visits_month']} player visits a month. The four people on the court for every hour of the {N['court_hours_month']} sold. Every finals-day crowd.")}
        </div>
      </div>
      <p class="note">Illustrative signage. Three courts, three naming partners, one brand per court.</p>'''))

    # 8 packages
    pages.append(page(f'''
      <div class="eyebrow">THE PACKAGES</div>
      <h2>Four ways in. One price each, everything included.</h2>
      <div class="pk">
        <div class="tier hi"><div class="tn">COURT PARTNER</div><div class="tp">{P["court"]}</div><div class="tu">ex VAT, per year, per court</div>
          <ul><li>Exclusive naming rights: [Your Brand] Court 1, 2 or 3</li><li>Branded signage on the court</li><li>The court named for you on Playtomic and the league site</li><li>Logo on the club's site and socials</li><li>Presence at finals day</li><li>10 complimentary court hours a year</li></ul></div>
        <div class="tier"><div class="tn">LEAGUE TITLE SPONSOR</div><div class="tp">{P["league"]}</div><div class="tu">ex VAT, per season</div>
          <ul><li>"The [Your Brand] Box League", one sponsor only</li><li>Name and logo on every league page and every box table</li><li>On every result and fixture email to {N['league_players']} players</li><li>Presents the trophies on finals day</li><li>Logo on the club's socials for the season</li></ul></div>
        <div class="tier"><div class="tn">FINALS DAY SPONSOR</div><div class="tp">{P["finals"]}</div><div class="tu">ex VAT, per event</div>
          <ul><li>Finals day named for you</li><li>Signage and a stand on the day</li><li>On the finals-day page, the bracket and the invite to every player</li><li>Photos and results posted with your name</li></ul></div>
        <div class="tier"><div class="tn">CLUB PARTNER</div><div class="tp">{P["partner"]}</div><div class="tu">ex VAT, per year</div>
          <ul><li>Logo on the league site and the club's socials</li><li>Mention in the monthly member email</li><li>A member offer, promoted by the club</li><li>4 complimentary court hours a year</li></ul></div>
      </div>
      <p class="note">Packages can be combined: a court partner who also takes the league title gets both at a reduced rate. Ask.</p>'''))

    # 9 what you get
    pages.append(page(f'''
      <div class="eyebrow">WHAT YOU GET</div>
      <h2>Visibility you can count, to people you can reach.</h2>
      <div class="two">
        {card("PRIME VISIBILITY", f"Signage seen by {N['player_visits_month']} player visits a month, and a name that appears every time the court or the league is mentioned: bookings, fixtures, results, finals.")}
        {card("AN ENGAGED, LOCAL AUDIENCE", "Working-age adults in and around Wicklow Town who come to the same place every week. Not a passing crowd: a membership.")}
        {card("CONTENT AND SOCIAL REACH", "Featured in the club's launch and finals content, the result emails, and the league pages. We hand you the photos and the numbers.")}
        {card("REPORTING", "A quarterly note with the site traffic, league numbers and player counts. You see what your sponsorship reached, in figures, not adjectives.")}
      </div>'''))

    # 10 next steps
    pages.append(page(f'''
      <div class="eyebrow">LET'S BUILD A PARTNERSHIP</div>
      <h2>Three steps, and you are on the court within days.</h2>
      <div class="three">
        {card("01 · CHOOSE", "Pick a package, or tell us what you want it to do for you and we will shape one.")}
        {card("02 · WE DO THE REST", "Signage, the Playtomic naming, the site and the socials. You send a logo; we handle everything else.")}
        {card("03 · GO LIVE", "Your name is on the court and the site within days, and in the next result email to every league player.")}
      </div>
      <div class="contact">
        <div class="ct">GET IN TOUCH</div>
        <div><b>Richie Carroll</b> · Co-owner · richiecarroll65@gmail.com</div>
        <div><b>David Hennebry</b> · Co-owner · welcome@w7padel.com</div>
        <div><b>Mike Shanahan</b> · Operations Manager · mike@w7padel.com · 085 135 4570</div>
      </div>'''))

    css = f"""
    @page {{ size: A4 landscape; margin: 0; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; background:{BLACK}; color:{TEXT}; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }}
    .pg {{ width:297mm; height:210mm; page-break-after: always; position:relative; padding:16mm 18mm 14mm; background:{BLACK}; overflow:hidden; }}
    .pg:last-child {{ page-break-after: auto; }}
    .foot {{ position:absolute; left:18mm; right:18mm; bottom:8mm; font-size:9pt; letter-spacing:.18em; color:{MUTE}; }}
    .eyebrow {{ font-size:10pt; letter-spacing:.22em; color:{LIME}; font-weight:700; margin-bottom:8px; }}
    h1 {{ font-family: Impact, 'Arial Black', sans-serif; font-weight:400; font-size:44pt; line-height:1.02; letter-spacing:.01em; margin:6px 0 14px; text-transform:uppercase; }}
    h2 {{ font-family: Impact, 'Arial Black', sans-serif; font-weight:400; font-size:28pt; line-height:1.06; margin:0 0 12px; text-transform:uppercase; letter-spacing:.01em; }}
    .lead {{ font-size:12.5pt; line-height:1.5; color:#d8d8d8; max-width:180mm; margin:0 0 14px; }}
    .note {{ font-size:9.5pt; color:{MUTE}; margin-top:12px; line-height:1.45; }}
    .cover {{ padding-top:22mm; }}
    .cover .logo {{ width:64mm; display:block; margin-bottom:14mm; }}
    .cover h1 {{ font-size:52pt; }}
    .cover .lead {{ font-size:14pt; max-width:200mm; }}
    .three {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }}
    .two {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
    .card {{ background:{CARD}; border:1px solid {BORDER}; border-radius:8px; padding:12px 14px; }}
    .ct {{ font-size:9.5pt; letter-spacing:.16em; color:{LIME}; font-weight:700; margin-bottom:6px; }}
    .cb {{ font-size:11pt; line-height:1.45; color:#e4e4e4; }}
    .two .card + .card {{ margin-top:12px; }}
    .stats {{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }}
    .stat {{ background:{CARD}; border:1px solid {BORDER}; border-radius:8px; padding:14px 16px 12px; }}
    .stat .v {{ font-family: Impact, 'Arial Black', sans-serif; font-size:34pt; color:{LIME}; line-height:1; }}
    .stat .l {{ font-size:11.5pt; font-weight:700; margin-top:6px; }}
    .stat .s {{ font-size:9.5pt; color:{MUTE}; margin-top:2px; }}
    .mock {{ background:#0f2b3d; border:2px solid {LIME}; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height:95mm; padding:20px; }}
    .mock-brand {{ font-family: Impact, sans-serif; font-size:30pt; color:{LIME}; letter-spacing:.04em; }}
    .mock-court {{ font-family: Impact, sans-serif; font-size:40pt; color:#fff; margin-top:6px; }}
    .mock-sub {{ font-size:10pt; letter-spacing:.2em; color:#b9c6cf; margin-top:8px; }}
    .pk {{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }}
    .tier {{ background:{CARD}; border:1px solid {BORDER}; border-radius:8px; padding:12px 13px; }}
    .tier.hi {{ border-color:{LIME}; }}
    .tn {{ font-size:9.5pt; letter-spacing:.16em; color:{LIME}; font-weight:700; }}
    .tp {{ font-family: Impact, sans-serif; font-size:30pt; margin-top:6px; line-height:1; }}
    .tu {{ font-size:9pt; color:{MUTE}; margin:2px 0 8px; }}
    .tier ul {{ margin:0; padding-left:15px; font-size:10pt; line-height:1.4; color:#e4e4e4; }}
    .tier li {{ margin:3px 0; }}
    .contact {{ margin-top:16px; background:{CARD}; border:1px solid {BORDER}; border-radius:8px; padding:14px 16px; font-size:11.5pt; line-height:1.7; }}
    """
    return f"<!doctype html><html><head><meta charset='utf-8'><title>W7 Padel · Sponsorship</title><style>{css}</style></head><body>{''.join(pages)}</body></html>"


async def render(html_path, pdf_path):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto("file:///" + html_path.replace("\\", "/"))
        await pg.pdf(path=pdf_path, format="A4", landscape=True, print_background=True,
                     margin={"top": "0", "bottom": "0", "left": "0", "right": "0"}, prefer_css_page_size=True)
        await b.close()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    open(HTML, "w", encoding="utf-8").write(build_html())
    asyncio.run(render(HTML, OUT))
    print("wrote", OUT, f"({os.path.getsize(OUT) // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
