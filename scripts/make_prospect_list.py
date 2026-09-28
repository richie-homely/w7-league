# -*- coding: utf-8 -*-
"""Wicklow Town businesses to approach about sponsorship: docs/sponsorship/Wicklow_Town_Businesses_*.csv

Richie, 28 Sep 2026: "get together a list of all local businesses in Wicklow Town to go out and
email". Sources: the Wicklow Town & District Chamber member directory (119 members), the town's
own eat-drink-stay and shop pages, its local-services page, and a web search for gyms and
pharmacies. Ranked A/B/C by how likely the category is to buy sponsorship (motor dealers, estate
agents, solicitors, banks and hotels sponsor GAA and rugby already), with a suggested first pitch.

Contacts are only what the source pages showed. The email column is blank on purpose: most of
these publish an address on their own site, and filling it is the first job of the outreach.

    python scripts/make_prospect_list.py
"""
import csv
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "sponsorship", "Wicklow_Town_Businesses_v1.0_28Sep2026.csv")

CH = "Wicklow Chamber member directory"
ED = "wicklowtown.ie eat-drink-stay"
SH = "wicklowtown.ie shop index"
LS = "wicklowtown.ie local services"
WB = "web search"

ROWS = [
    ("Trinity Volkswagen", "Motor dealer", "", CH), ("Trinity Skoda", "Motor dealer", "", CH),
    ("John Linnane Motors", "Motor dealer", "", CH), ("Vartry Garage", "Motor", "", CH),
    ("Wicklow Tyre Services", "Motor", "", CH), ("D&W Crash Repairs", "Motor", "", CH), ("WTS Motor Repairs", "Motor", "", WB),
    ("DNG Thornton Properties", "Estate agent", "Unit 4, SuperValu Complex", CH),
    ("Sherry Fitzgerald Catherine O'Reilly", "Estate agent", "", CH), ("Forkin Property", "Estate agent", "", CH),
    ("O'Neill and Flanagan Auctioneers", "Auctioneer", "", CH), ("Clarke Auctioneers", "Auctioneer", "", CH),
    ("Glenveagh Homes", "Property developer", "", CH), ("Lusra Teoranta", "Property developer", "087 255 5817 / info@lusra.ie", CH),
    ("Esmonde Developments", "Property developer", "", CH),
    ("Haughton Legal", "Solicitor", "0404 54600 / info@haughtonlegal.ie", CH),
    ("Patrick O'Toole Solicitors", "Solicitor", "0404 68320 / reception@patrickotoolesolicitors.ie", CH),
    ("Augustus Cullen Law", "Solicitor", "", CH), ("Oak Legal", "Solicitor", "", CH), ("Wendy Doyle Solicitors", "Solicitor", "", CH),
    ("Burke Legal", "Solicitor", "The Abbey Centre", WB), ("O'Byrne Solicitors", "Solicitor", "Wicklow Enterprise Centre", WB),
    ("Campion Insurance", "Insurance", "", CH), ("Senna Brokers", "Financial services", "", CH),
    ("Neiland Financial Services", "Financial services", "", CH), ("Momentum Financial Services", "Financial services", "", CH),
    ("Inverdea Financial Services", "Financial services", "", CH), ("East Coast Credit Union", "Credit union", "www.eastcoastcu.ie", CH),
    ("Bank of Ireland Wicklow", "Bank", "", CH), ("AIB Wicklow", "Bank", "", CH),
    ("DMQ Accountants", "Accountant", "", CH), ("Conlon O'Sullivan", "Accountant", "", CH),
    ("B Kavanagh Accountancy Services", "Accountant", "086 262 6855", CH), ("Cooney Parle Accountants", "Accountant", "", CH),
    ("Noel P. Geraghty & Co", "Accountant", "", CH), ("IFAC Accountants", "Accountant", "", CH),
    ("Burke Oil", "Energy", "www.burkeoil.ie", CH), ("Clarke Energy Ireland", "Energy", "", CH),
    ("Quantum Energy (Stephen Leeson)", "Energy", "087 417 3880 / 0404 53229", CH), ("SSE Renewables", "Energy", "", CH),
    ("Inis Offshore Wind", "Energy", "085 114 9281 / info@inisoffshorewind.ie", CH), ("Irish Biofuel Production", "Manufacturing", "", CH),
    ("Ardale Construction", "Construction", "087 714 7988 / ltoner@ardale.ie", CH),
    ("Carlin Kehoe Construction Advisory", "Construction", "", CH), ("Trevor Wood Consulting Engineers", "Engineering", "", CH),
    ("Herbst Group", "Technology / manufacturing", "", CH), ("Wire Ropes Limited", "Manufacturing", "", CH),
    ("R.F. Conway & Company", "Shipping & logistics", "", CH), ("Multimetals Recycling", "Recycling", "0404 64934 / www.multimetals.ie", CH),
    ("Smiths of Wicklow", "Electrical", "", CH), ("Wicklow Hire & Sales", "Equipment hire", "", CH),
    ("Tinakilly Country House Hotel", "Hotel", "", CH), ("Parkview Hotel", "Hotel", "", CH),
    ("Glenview Hotel & Leisure Club", "Hotel", "01 274 0000 / sales@glenviewhotel.com", CH),
    ("The Bridge Tavern", "Hotel / bar", "", ED), ("Chester Beatty's", "Hotel / bar", "", ED),
    ("The Brass Fox", "Bar / restaurant", "", ED), ("O'Shea's Corner", "Bar / restaurant", "", ED), ("Phil Healy's Pub", "Bar / restaurant", "", ED),
    ("Fitzpatrick's Bar", "Bar", "", ED), ("Whistlers Bar", "Bar", "", ED), ("The High Court Bar", "Bar", "", ED),
    ("Growler Man", "Bar", "", ED), ("Ta Se's", "Bar", "", ED),
    ("Wicklow Brewery", "Brewery", "0404 41661 / www.wicklowbrewery.ie", CH), ("Great Eastern Brewing Co", "Brewery", "", ED),
    ("The Wicklow Wine Company", "Off-licence", "", CH), ("Next Door Off-Licence", "Off-licence", "", SH),
    ("La Locandina", "Restaurant", "", ED), ("Sparrow's Nest", "Restaurant", "", ED), ("Opera", "Restaurant / cafe", "", ED),
    ("Blue Seafood and Bistro", "Restaurant", "", ED), ("Le Marche", "Restaurant", "", ED), ("Capri Pizza & Trento Pasta", "Restaurant", "", ED),
    ("Tikka Asian Street Food", "Restaurant", "", ED), ("Dhaka House", "Restaurant", "", ED), ("Jausna", "Restaurant", "", ED),
    ("Pat's Pizza Kitchen", "Restaurant", "", CH), ("Chicks Out", "Takeaway", "", ED),
    ("Wicklow Inspired", "Cafe", "", ED), ("The Good Life Cafe & Wine Bar", "Cafe / wine bar", "", ED), ("Vital Health Cafe", "Cafe", "", ED),
    ("Firehouse Bakery", "Cafe", "", ED), ("Earls Shop and Cafe", "Cafe", "", ED), ("The Coffee Shop", "Cafe", "", ED),
    ("Hannah's Coffee Shop", "Cafe", "", ED), ("Nick's Coffee", "Cafe", "", ED), ("Glamorous Cakes", "Food", "", CH),
    ("Clan Fitness", "Gym", "", CH), ("AM Fitness", "Gym", "", WB), ("Nikafit Studios", "Gym / studio", "", WB),
    ("Go Gym Wicklow", "Gym", "", WB), ("Alpha Fitness", "Gym", "", WB),
    ("Wicklow Golf Club", "Golf club", "", CH), ("Blainroe Golf Club", "Golf club", "", CH), ("Old Farm Equestrian Centre", "Equestrian", "", CH),
    ("The Chiropractor Wicklow", "Health", "", CH), ("Wicklow Primary Healthcare Centre", "Health", "0404 67518 / wphc.ie", LS),
    ("Westmount Clinic", "GP", "0404 67381 / westmountclinic.ie", LS), ("Salem Medical Centre", "GP", "0404 67319", LS),
    ("The Village Practice", "GP", "0404 67367", LS),
    ("Wicklow Dental", "Dentist", "0404 69977 / www.wicklowdental.com", LS), ("Westmount Dental", "Dentist", "0404 61606 / www.dentist-wicklow.ie", LS),
    ("Delahunt & Foley", "Dentist", "0404 67666 / www.delahuntandfoley.com", LS),
    ("Wicklow Pharmacy", "Pharmacy", "", CH), ("CarePlus Pharmacy Wicklow", "Pharmacy", "SuperValu centre, Church St", WB),
    ("Refresh Health", "Health / wellness", "", SH), ("Healthy Habits", "Health food", "", SH), ("Future Nutrition", "Nutrition", "", CH),
    ("Pretty & Pampered", "Hair & beauty", "086 227 1429 / sarahmarieh@live.com", CH), ("King Hair & Beauty", "Hair & beauty", "", CH),
    ("Gallagher's SuperValu Wicklow Town", "Supermarket", "", CH), ("Powers Centra Rathnew", "Convenience", "", CH),
    ("Flannery's Newsagents", "Newsagent", "", SH), ("The Sports Room", "Sports retail", "", CH),
    ("Sean Connolly Menswear", "Clothing", "", CH), ("John Flood Menswear", "Clothing", "", SH), ("Wardrobe Boutique", "Clothing", "", CH),
    ("Ebony Boutique", "Clothing", "", SH), ("The Shoe Box", "Footwear", "", CH), ("T.J. Gelletlie Jewellers", "Jeweller", "", CH),
    ("Hopkins Homevalue Hardware", "Hardware", "", SH), ("Martsworth Ashford", "Home & DIY", "", CH),
    ("All Shades Blinds & Furnishings", "Home", "", CH), ("Remo Kitchens", "Kitchens", "", CH),
    ("Byrne's Gifts and Furniture", "Home", "", SH), ("Canopy", "Home", "", SH), ("Lighthouse Interiors", "Interiors", "", CH),
    ("Kelly's Fruit & Veg", "Grocer", "", CH), ("Derek Dunne Butchers", "Butcher", "", SH), ("Cullen's Quality Butchers", "Butcher", "", SH),
    ("The Fishman", "Fishmonger", "", CH), ("John P. Hopkins Toymaster", "Toys", "", CH), ("Bridge Street Books", "Bookshop", "", CH),
    ("Malone's Bookshop", "Bookshop", "", SH), ("Kilmantin Arts", "Arts", "", SH), ("Fields Florist", "Florist", "", SH),
    ("Bloomin Plants", "Garden", "", SH), ("Pet Depot", "Pet shop", "", SH), ("Sean Dunne Opticians", "Optician", "", SH), ("King's Gala", "Convenience", "", CH),
    ("Wicklow People", "Newspaper", "www.independent.ie", CH), ("East Coast FM", "Radio", "", CH), ("WicklowNews.net", "News site", "www.wicklownews.net", CH),
    ("A63 Digital / Creative Digital", "Web design", "01 592 4936 / info@a63digital.com", CH), ("In Good Company", "Web design", "www.goodco.ie", CH),
    ("Showoff", "Software / design", "", CH), ("Wicklow Press, Print & Design", "Printing", "", CH),
    ("Devitt and Devitt Print & Promotions", "Printing", "", CH), ("Wicklow Print Solutions", "Printing", "", CH),
    ("PTA IT Solutions", "IT", "", CH), ("Acuity IT Consulting", "IT", "", CH), ("MindaClient", "Business services", "", CH),
    ("Noltek Office Supplies", "Office supplies", "www.noltek.ie", CH), ("Storm Recruitment", "Recruitment", "", CH),
    ("RMDK Consultancy", "Consultancy", "", CH), ("Marketing and Management Services", "Consultancy", "", CH), ("Coaching Harmony", "Coaching", "", CH),
    ("GR8 Events Ticketing", "Events", "www.gr8events.ie", CH), ("ELH Electric Events", "Events", "", CH), ("KBR Foodservice Equipment", "Catering equipment", "", CH),
    ("M&M CleanEx", "Cleaning", "087 236 1251 / info@mmcleanex.ie", CH), ("Conal's Tree Services", "Tree services", "", CH),
    ("Ashfield Communications", "Telecoms retail", "", CH), ("Wicklow Kabs", "Taxi", "0404 66888", LS),
    ("Sixty Six One Hundred Cabs", "Taxi", "0404 66100", LS), ("ND Training Services", "Driving school", "086 380 0842", LS),
    ("Safeserve", "Education", "087 131 0075 / www.safeserveapp.ie", CH), ("Exam Focus Ireland", "Tutoring", "01 287 1274", LS),
    ("McCrea's Funeral Home", "Funeral", "0404 61288 / www.mccrea.ie", CH), ("Flannery's Funeral Home", "Funeral", "0404 61777", CH),
    ("Wicklow Enterprise Centre", "Business support", "0404 66433 / info@wicklowenterprise.ie", CH),
    ("Wicklow Chamber of Commerce", "Chamber", "0404 66433 / info@wicklowchamber.ie", CH),
]

# A: categories that already sponsor local sport and have the budget. B: local trade that wants the
# same customers. C: everyone else - a club-partner offer at most.
HI = {"Motor dealer", "Estate agent", "Auctioneer", "Property developer", "Solicitor", "Insurance", "Financial services",
      "Credit union", "Bank", "Accountant", "Energy", "Construction", "Engineering", "Hotel", "Hotel / bar", "Brewery", "Gym",
      "Golf club", "Supermarket", "Newspaper", "Radio", "News site", "Technology / manufacturing", "Manufacturing",
      "Shipping & logistics", "Recycling"}
MID = {"Motor", "Bar / restaurant", "Bar", "Restaurant", "Restaurant / cafe", "Cafe", "Cafe / wine bar", "Off-licence", "Health",
       "GP", "Dentist", "Pharmacy", "Sports retail", "Clothing", "Hardware", "Home & DIY", "Kitchens", "Web design", "Printing",
       "IT", "Recruitment", "Events", "Equipment hire", "Electrical", "Chamber", "Business support"}
PITCH = {
    "Motor dealer": "Court naming - [Brand] Court 1", "Estate agent": "Court naming or league title",
    "Solicitor": "League title sponsor", "Accountant": "League title or club partner",
    "Hotel": "Finals day sponsor", "Hotel / bar": "Finals day sponsor", "Brewery": "Finals day sponsor",
    "Gym": "Club partner + member offer", "Bar / restaurant": "Club partner + member offer",
    "Restaurant": "Club partner + member offer", "Cafe": "Club partner + member offer",
    "Energy": "Court naming", "Construction": "Court naming", "Property developer": "Court naming",
    "Insurance": "League title sponsor", "Financial services": "League title sponsor",
    "Credit union": "League title sponsor", "Bank": "League title sponsor", "Supermarket": "Finals day sponsor",
    "Newspaper": "Media partner (contra)", "Radio": "Media partner (contra)", "News site": "Media partner (contra)",
    "Golf club": "Reciprocal partnership", "Sports retail": "Club partner + kit offer",
    "Pharmacy": "Club partner", "Dentist": "Club partner", "GP": "Club partner", "Health": "Club partner",
}


def main():
    seen, out = set(), []
    for name, cat, contact, source in ROWS:
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        pri = "A" if cat in HI else ("B" if cat in MID else "C")
        out.append({"priority": pri, "business": name, "category": cat, "suggested pitch": PITCH.get(cat, "Club partner"),
                    "contact (from source)": contact, "email": "", "status": "", "source": source})
    out.sort(key=lambda r: (r["priority"], r["category"], r["business"]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    print(len(out), "businesses ->", OUT)
    print("by priority:", dict(Counter(r["priority"] for r in out)),
          "| with a contact already:", sum(1 for r in out if r["contact (from source)"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
