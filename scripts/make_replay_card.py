# -*- coding: utf-8 -*-
"""Share card for the replay page: public/og-replay-v1.png (1200x630).

Richie, 26 Sep 2026: "Do we have WhatsApp thumbnail" — the page had a title and no image, so a
shared link showed as bare text. Same rules as the other cards (make_sub_card.py): under ~300KB,
a NEW FILENAME for any change because WhatsApp caches by URL, nothing important in the outer 8%.

The mark is a phone-shaped screen with a rewind arrow and "30s" on it: press the button, the
last thirty seconds are yours.

    python scripts/make_replay_card.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
FONTS = "C:/Windows/Fonts"
OUT = os.path.join(PUB, "og-replay-v1.png")

BG = (10, 10, 10)
LIME = (212, 255, 58)
WHITE = (250, 250, 250)
MUTE = (138, 138, 138)
CARD = (26, 26, 26)
BORDER = (42, 42, 42)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def main():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # left: a phone screen, landscape, with the clip on it
    px, py, pw, ph = 96, 150, 330, 330
    d.rounded_rectangle([px, py, px + pw, py + ph], 26, fill=CARD, outline=BORDER, width=3)
    # the "video": a darker letterboxed frame inside
    fx, fy, fw, fh = px + 22, py + 60, pw - 44, 170
    d.rounded_rectangle([fx, fy, fx + fw, fy + fh], 10, fill=(0, 0, 0))
    # rewind arrow: an arc with an arrowhead, and 30s in the middle
    cx, cy, r = fx + fw / 2, fy + fh / 2, 58
    d.arc([cx - r, cy - r, cx + r, cy + r], start=300, end=240, fill=LIME, width=9)
    # arrowhead at the arc's start (300 degrees), pointing anticlockwise
    a = math.radians(300)
    tip = (cx + r * math.cos(a), cy + r * math.sin(a))
    d.polygon([tip, (tip[0] - 26, tip[1] - 4), (tip[0] - 4, tip[1] - 26)], fill=LIME)
    small = font("arialbd.ttf", 34)
    tw = d.textlength("30s", font=small)
    d.text((cx - tw / 2, cy - 20), "30s", font=small, fill=WHITE)
    # a caption strip like the real clip page
    cap = font("arialbd.ttf", 22)
    d.text((px + 24, py + ph - 76), "COURT 2 · SAT 18:33", font=cap, fill=LIME)
    d.text((px + 24, py + ph - 46), "Share on WhatsApp", font=font("arial.ttf", 22), fill=MUTE)

    # right: the words
    tx = 470
    d.text((tx, 150), "W7 REPLAY", font=font("arialbd.ttf", 30), fill=LIME)
    big = font("impact.ttf", 92) if os.path.exists(os.path.join(FONTS, "impact.ttf")) else font("arialbd.ttf", 78)
    d.text((tx, 196), "FIND THE CLIPS", font=big, fill=WHITE)
    d.text((tx, 292), "FROM YOUR GAME", font=big, fill=WHITE)
    body = font("arial.ttf", 30)
    d.text((tx, 408), "Pressed the button on court?", font=body, fill=MUTE)
    d.text((tx, 448), "Your email finds every clip from", font=body, fill=MUTE)
    d.text((tx, 488), "your booking. Watch, share, save.", font=body, fill=MUTE)

    img.save(OUT, "PNG", optimize=True)
    kb = os.path.getsize(OUT) / 1024
    print(f"wrote {OUT} ({kb:.0f} KB)")
    if kb > 300:
        print("  WARNING: over 300KB — WhatsApp will shrink it to a square thumbnail")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
