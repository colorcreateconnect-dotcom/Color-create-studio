#!/usr/bin/env python3
"""
check_transparency.py — verify every source PNG is a clean transparent cut-out.

For each PNG under source/ it reports:
    mode            (RGBA expected)
    has_alpha       does it carry an alpha channel at all?
    transparent%    share of fully-transparent pixels (a real cut-out is >0)
    opaque_bbox     tight box of visible pixels -> reveals wasted padding
    edge_clean      are the 1px borders fully transparent? (catches white boxes)
    verdict         OK / WARN / FAIL with a reason

Writes a summary table to stdout and manifest/transparency_report.csv.

Usage:  python3 scripts/check_transparency.py
"""

import csv
from pathlib import Path

from PIL import Image

PACK_ROOT = Path(__file__).resolve().parent.parent
SRC = PACK_ROOT / "source"
REPORT = PACK_ROOT / "manifest" / "transparency_report.csv"


# A real cut-out has a meaningful transparent area. Below this, the background
# was effectively never removed (a handful of stray alpha-0 pixels don't count).
OPAQUE_PCT = 1.0
# Full-body stickers legitimately touch the frame edge (braids, feet). Only treat
# the border as a "box" when MOST of the border ring is opaque.
BORDER_BOX_FRAC = 0.6


def analyze(path: Path):
    img = Image.open(path)
    mode = img.mode
    row = {
        "file": str(path.relative_to(PACK_ROOT)),
        "mode": mode,
        "size": f"{img.width}x{img.height}",
        "has_alpha": False,
        "transparent_pct": 0.0,
        "border_opaque_pct": 0.0,
        "opaque_bbox": "",
        "verdict": "",
    }

    row["has_alpha"] = "A" in img.getbands()
    if mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.getchannel("A")

    hist = alpha.histogram()
    total = img.width * img.height
    row["transparent_pct"] = round(100.0 * hist[0] / total, 2)
    row["opaque_bbox"] = str(alpha.getbbox() or "EMPTY")

    # fraction of the 1px border ring that is opaque (alpha > 128)
    w, h = img.size
    step_x, step_y = max(1, w // 60), max(1, h // 60)
    border = (
        [alpha.getpixel((x, 0)) for x in range(0, w, step_x)] +
        [alpha.getpixel((x, h - 1)) for x in range(0, w, step_x)] +
        [alpha.getpixel((0, y)) for y in range(0, h, step_y)] +
        [alpha.getpixel((w - 1, y)) for y in range(0, h, step_y)]
    )
    border_opaque = sum(1 for p in border if p > 128) / len(border)
    row["border_opaque_pct"] = round(100.0 * border_opaque, 1)

    if not row["has_alpha"] or row["transparent_pct"] < OPAQUE_PCT:
        row["verdict"] = "FAIL: background not removed (image is opaque)"
    elif border_opaque > BORDER_BOX_FRAC:
        row["verdict"] = "WARN: most of the frame border is opaque (possible box/halo)"
    else:
        row["verdict"] = "OK"
    return row


def main():
    pngs = sorted(SRC.rglob("*.png"))
    if not pngs:
        print(f"No PNGs found under {SRC.relative_to(PACK_ROOT)}/.")
        print("Drop your stickers into source/reactions (etc.) and re-run.")
        return

    rows = [analyze(p) for p in pngs]
    REPORT.parent.mkdir(exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    name_w = max(len(r["file"]) for r in rows)
    print(f"{'FILE'.ljust(name_w)}  {'MODE':5} {'TRANSP%':>7}  VERDICT")
    print("-" * (name_w + 30))
    for r in rows:
        print(f"{r['file'].ljust(name_w)}  {r['mode']:5} {r['transparent_pct']:>6}%  {r['verdict']}")

    ok = sum(r["verdict"] == "OK" for r in rows)
    warn = [r for r in rows if r["verdict"].startswith("WARN")]
    fail = [r for r in rows if r["verdict"].startswith("FAIL")]
    print(f"\nSummary: {ok} OK · {len(warn)} WARN · {len(fail)} FAIL   (of {len(rows)})")
    if fail:
        print("FAIL (background not removed — not usable as a clean overlay until fixed):")
        for r in fail:
            print(f"   {r['file']}")
    print(f"Full report -> {REPORT.relative_to(PACK_ROOT)}")


if __name__ == "__main__":
    main()
