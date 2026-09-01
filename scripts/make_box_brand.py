# -*- coding: utf-8 -*-
"""Build the Box League mark and its share card.

Two outputs:
  public/box-league-logo.png   1024 square, transparent — Playtomic, Instagram,
                               anywhere a square avatar is wanted
  public/og-box.png            1200x630 — the WhatsApp / link preview card

The mark is a three-by-three grid with the top-left cell lit. That is the format
drawn literally: a box league is a ladder of boxes and the whole point is
climbing to box one. It also reads at 48px, which a ball-and-racket illustration
would not.

WhatsApp specifics that matter more than the usual OG advice:
  - under ~300KB or it silently drops to a small square thumbnail
  - it caches hard, so a changed card needs a changed FILENAME, not new bytes
  - nothing important in the outer ~8%: some clients centre-crop

    python scripts/make_box_brand.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
FONTS = "C:/Windows/Fonts"

BG = (10, 10, 10)
LIME = (212, 255, 58)
WHITE = (250, 250, 250)
MUTE = (138, 138, 138)
GRID = (58, 58, 58)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def text_w(d, s, f, spacing=0):
    widths = [d.textbbox((0, 0), c, font=f)[2] for c in s]
    return sum(widths) + spacing * (len(s) - 1), widths


def centre(d, cx, y, s, f, fill, spacing=0):
    total, widths = text_w(d, s, f, spacing)
    x = cx - total / 2
    for c, cw in zip(s, widths):
        d.text((x, y), c, font=f, fill=fill)
        x += cw + spacing


def ink(d, s, f, spacing=0):
    """(width, height, y_offset) of the drawn pixels, not the font's ascent box.

    Impact carries a lot of empty space above its caps, so stacking lines by
    their nominal y jams them together at one size and leaves a gulf at another.
    Measuring the ink and offsetting by it makes the gaps mean what they say.
    """
    box = d.textbbox((0, 0), s, font=f)
    w, _ = text_w(d, s, f, spacing)
    return w, box[3] - box[1], box[1]


def centre_ink(d, cx, top, s, f, fill, spacing=0):
    """Centre horizontally, and put the TOP OF THE INK at `top`. Returns bottom."""
    w, h, off = ink(d, s, f, spacing)
    centre(d, cx, top - off, s, f, fill, spacing)
    return top + h


def grid(d, x, y, cell, gap, lit=LIME, dim=GRID, width=0):
    """Three-by-three ladder of boxes, top-left lit. `width` 0 fills the cells."""
    for r in range(3):
        for c in range(3):
            box = [x + c * (cell + gap), y + r * (cell + gap),
                   x + c * (cell + gap) + cell, y + r * (cell + gap) + cell]
            on = (r == 0 and c == 0)
            if on:
                d.rounded_rectangle(box, radius=max(2, cell // 6), fill=lit)
            else:
                d.rounded_rectangle(box, radius=max(2, cell // 6),
                                    outline=dim, width=width or max(2, cell // 9))


def make_logo():
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Badge. Rounded square rather than a circle: it echoes the boxes, and a
    # circle would fight the ball already in the W7 mark.
    d.rounded_rectangle([24, 24, S - 24, S - 24], radius=150, fill=BG)
    d.rounded_rectangle([24, 24, S - 24, S - 24], radius=150, outline=LIME, width=14)

    # Stack the whole lockup as one block and centre it, rather than pinning
    # each element to a guessed y — that is what left the grid floating high
    # with the wordmark crushed against the bottom edge.
    cell, gap = 112, 20
    span = 3 * cell + 2 * gap
    f_box, f_lg, f_w7 = (font("impact.ttf", 150), font("impact.ttf", 88),
                         font("arialbd.ttf", 36))
    h_box, h_lg, h_w7 = (ink(d, "BOX", f_box)[1], ink(d, "LEAGUE", f_lg)[1],
                         ink(d, "W7 PADEL", f_w7, 8)[1])
    GAP_GRID, GAP_LINE, GAP_W7 = 76, 18, 34
    total = span + GAP_GRID + h_box + GAP_LINE + h_lg + GAP_W7 + h_w7
    y = (S - total) / 2

    grid(d, (S - span) // 2, y, cell, gap)
    y += span + GAP_GRID
    y = centre_ink(d, S / 2, y, "BOX", f_box, WHITE) + GAP_LINE
    y = centre_ink(d, S / 2, y, "LEAGUE", f_lg, LIME) + GAP_W7
    centre_ink(d, S / 2, y, "W7 PADEL", f_w7, MUTE, spacing=8)

    out = os.path.join(PUB, "box-league-logo.png")
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out}  {S}x{S}  {os.path.getsize(out)/1024:.0f}KB")
    return img


def make_card(logo):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 12, H], fill=LIME)          # lime spine
    d.rectangle([56, 40, W - 40, H - 40], outline=(26, 26, 26), width=2)

    # Mark on the left, type on the right. Centring everything made the court
    # rule cut straight through the wordmark; a two-column split gives the type
    # a clean baseline and stops the eye bouncing.
    mark = logo.resize((300, 300), Image.LANCZOS)
    img.paste(mark, (108, 165), mark)

    x = 470
    d.text((x, 178), "AUTUMN / WINTER", font=font("arialbd.ttf", 26), fill=LIME)
    d.text((x - 6, 216), "PADEL BOX", font=font("impact.ttf", 104), fill=WHITE)
    d.text((x - 6, 318), "LEAGUE", font=font("impact.ttf", 104), fill=LIME)
    d.line([(x, 442), (x + 470, 442)], fill=(44, 44, 44), width=3)
    d.text((x, 462), "BOXES OF 5  ·  4 GAMES IN 4 WEEKS", font=font("arialbd.ttf", 27), fill=WHITE)
    d.text((x, 505), "TOP 2 UP, BOTTOM 2 DOWN  ·  STARTS 14 SEP",
           font=font("arialbd.ttf", 21), fill=MUTE)

    # NEW filename each time the card content changes: chat apps cache these
    # hard, and rewriting the bytes behind a known URL leaves the stale tile in
    # circulation for days.
    out = os.path.join(PUB, "og-box-v2.png")
    img.save(out, "PNG", optimize=True)
    kb = os.path.getsize(out) / 1024
    print(f"wrote {out}  {W}x{H}  {kb:.0f}KB")
    if kb > 300:
        print("  WARNING: over 300KB — WhatsApp may fall back to a thumbnail")


def main():
    make_card(make_logo())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
