#!/usr/bin/env python3
"""
remove_flat_background.py — turn an opaque sticker with a flat background into a
clean transparent cut-out, WITHOUT touching the character.

How it works (safe by design):
  1. Estimate the background color from the border pixels that look like the flat
     backdrop (the most common border color).
  2. Flood-fill the CONNECTED background starting only from border pixels that
     match that color within a tolerance. Interior pixels of a similar color that
     are NOT connected to the border (e.g. a cream highlight on the character) are
     left alone, and dark braids that reach a corner are never seeded from.
  3. Set alpha=0 on the filled region and feather the edge 1px so there's no halo.

This completes the cut-out; it does not alter the character design.

Usage:
    python3 scripts/remove_flat_background.py --check FILE...     # report only, no writes
    python3 scripts/remove_flat_background.py FILE...             # fix in place
    python3 scripts/remove_flat_background.py --tolerance 32 FILE...
"""

import argparse
import collections
from pathlib import Path

from PIL import Image, ImageFilter


def estimate_bg_color(img):
    """Most common color around the 1px border ring = the flat backdrop."""
    w, h = img.size
    px = img.load()
    ring = ([px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] +
            [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)])
    return collections.Counter(c[:3] for c in ring).most_common(1)[0][0]


def close(a, b, tol):
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


def remove_background(img, tolerance=32):
    """Return (new RGBA image, stats dict). Non-destructive."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    bg = estimate_bg_color(img)

    # Seeds: only border pixels that match the background color.
    seeds = []
    for x in range(w):
        for y in (0, h - 1):
            if close(px[x, y][:3], bg, tolerance):
                seeds.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if close(px[x, y][:3], bg, tolerance):
                seeds.append((x, y))

    # BFS flood fill over background-colored, border-connected pixels.
    is_bg = bytearray(w * h)          # 1 = background
    from collections import deque
    dq = deque(seeds)
    for (x, y) in seeds:
        is_bg[y * w + x] = 1
    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny * w + nx]:
                if close(px[nx, ny][:3], bg, tolerance):
                    is_bg[ny * w + nx] = 1
                    dq.append((nx, ny))

    # Build alpha: 0 where background, keep original alpha elsewhere.
    alpha = img.getchannel("A")
    ap = alpha.load()
    out = img.copy()
    oa = out.getchannel("A")
    oap = oa.load()
    filled = 0
    for i in range(w * h):
        if is_bg[i]:
            oap[i % w, i // w] = 0
            filled += 1
    # Feather 1px: soften the new alpha edge to kill jaggies / cream fringe.
    oa = oa.filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(oa)

    total = w * h
    stats = {
        "bg_color": bg,
        "filled_pct": round(100.0 * filled / total, 1),
        "transparent_pct_after": round(100.0 * out.getchannel("A").histogram()[0] / total, 1),
        "bbox_after": out.getchannel("A").getbbox(),
    }
    return out, stats


def main():
    ap = argparse.ArgumentParser(description="Remove a flat background from a sticker.")
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--tolerance", type=int, default=32,
                    help="color match tolerance per channel (default 32)")
    ap.add_argument("--check", action="store_true",
                    help="report before/after, do not write")
    args = ap.parse_args()

    for f in args.files:
        img = Image.open(f).convert("RGBA")
        before = round(100.0 * img.getchannel("A").histogram()[0] / (img.width * img.height), 1)
        out, st = remove_background(img, args.tolerance)
        action = "CHECK" if args.check else "FIXED"
        print(f"[{action}] {f.name}")
        print(f"   bg≈{st['bg_color']}  transparent: {before}% -> {st['transparent_pct_after']}%  "
              f"(filled {st['filled_pct']}%)  bbox_after={st['bbox_after']}")
        if not args.check:
            out.save(f)


if __name__ == "__main__":
    main()
