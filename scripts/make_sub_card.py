# -*- coding: utf-8 -*-
"""Share card for the stand-in list: public/og-subs-v1.png (1200x630).

Richie, 20 Sep 2026: "give a link to share to our group asking for people to register as a sub,
and it can have a WhatsApp thumbnail accordingly."

Same rules as the box league card (make_box_brand.py), learned the hard way:
  - under ~300KB or WhatsApp silently drops to a small square thumbnail
  - WhatsApp caches hard, so a changed card needs a NEW FILENAME, not new bytes
  - nothing important in the outer ~8%: some clients centre-crop

The mark is the box grid with one cell empty and a lit cell outside it, waiting to come in.
That is the thing being asked for: a player from outside the league stepping into a box.

    python scripts/make_sub_card.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
FONTS = "C:/Windows/Fonts"
OUT = os.path.join(PUB, "og-subs-v1.png")

BG = (10, 10, 10)
LIME = (212, 255, 58)
WHITE = (250, 250, 250)
MUTE = (138, 138, 138)
GRID = (58, 58, 58)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def main():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # left: the grid, one cell empty, a lime cell waiting outside it
    gx, gy, cell, gap = 96, 188, 74, 12
    for r in range(3):
        for c in range(3):
            x, y = gx + c * (cell + gap), gy + r * (cell + gap)
            empty = (r, c) == (1, 1)
            d.rounded_rectangle([x, y, x + cell, y + cell], 8,
                                fill=None if empty else GRID,
                                outline=LIME if empty else None,
                                width=3 if empty else 0)
    # the stand-in, outside the grid, pointing at the gap
    sx = gx + 3 * (cell + gap) + 26
    sy = gy + cell + gap
    d.rounded_rectangle([sx, sy, sx + cell, sy + cell], 8, fill=LIME)
    d.line([sx - 16, sy + cell / 2, sx - 4, sy + cell / 2], fill=LIME, width=4)

    # right: the words
    tx = 470
    d.text((tx, 150), "W7 BOX LEAGUE", font=font("arialbd.ttf", 30), fill=LIME)
    big = font("impact.ttf", 92) if os.path.exists(os.path.join(FONTS, "impact.ttf")) else font("arialbd.ttf", 78)
    d.text((tx, 196), "PLAY AS A", font=big, fill=WHITE)
    d.text((tx, 292), "STAND-IN", font=big, fill=WHITE)
    body = font("arial.ttf", 30)
    d.text((tx, 408), "Teams lose a player every week.", font=body, fill=MUTE)
    d.text((tx, 448), "Put your name down and we'll call", font=body, fill=MUTE)
    d.text((tx, 488), "you when a team at your level is short.", font=body, fill=MUTE)

    img.save(OUT, "PNG", optimize=True)
    kb = os.path.getsize(OUT) / 1024
    print(f"wrote {OUT} ({kb:.0f} KB)")
    if kb > 300:
        print("  WARNING: over 300KB — WhatsApp will shrink it to a square thumbnail")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
