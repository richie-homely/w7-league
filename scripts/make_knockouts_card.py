# -*- coding: utf-8 -*-
"""Share card for the Summer Leagues 2026 knockout stages.

    python scripts/make_knockouts_card.py   -> public/og-knockouts-v1.png (1200x630)

Same WhatsApp rules as the box-league card: under ~300KB, nothing important in
the outer ~8%, and a NEW filename whenever the content changes.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
FONTS = "C:/Windows/Fonts"
BG, LIME, WHITE, MUTE, INFO = (10, 10, 10), (212, 255, 58), (250, 250, 250), (138, 138, 138), (125, 216, 255)
VERSION = "v1"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def main():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 12, H], fill=LIME)
    d.rectangle([56, 40, W - 40, H - 40], outline=(26, 26, 26), width=2)

    logo = Image.open(os.path.join(PUB, "w7-logo.png")).convert("RGBA")
    logo.thumbnail((300, 300), Image.LANCZOS)
    img.paste(logo, (108 + (300 - logo.width) // 2, 165 + (300 - logo.height) // 2), logo)

    x = 470
    d.text((x, 150), "SUMMER LEAGUES 2026", font=font("arialbd.ttf", 26), fill=LIME)
    d.text((x - 6, 188), "KNOCKOUT", font=font("impact.ttf", 104), fill=WHITE)
    d.text((x - 6, 290), "STAGES", font=font("impact.ttf", 104), fill=LIME)
    d.line([(x, 414), (x + 520, 414)], fill=(44, 44, 44), width=3)
    d.text((x, 434), "UPPER & LOWER TIER  ·  LIVE SCORES", font=font("arialbd.ttf", 27), fill=WHITE)
    d.text((x, 476), "FINALS 26 / 27 SEPTEMBER  ·  €500 TO THE CHAMPIONS",
           font=font("arialbd.ttf", 21), fill=MUTE)
    d.text((x, 512), "league.w7padel.com/summer-2026/knockouts", font=font("arialbd.ttf", 21), fill=INFO)

    out = os.path.join(PUB, f"og-knockouts-{VERSION}.png")
    img.save(out, "PNG", optimize=True)
    kb = os.path.getsize(out) / 1024
    print(f"wrote {out}  {W}x{H}  {kb:.0f}KB" + ("  WARNING >300KB" if kb > 300 else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
