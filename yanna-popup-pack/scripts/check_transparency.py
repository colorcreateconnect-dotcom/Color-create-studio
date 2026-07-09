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


def analyze(path: Path):
    img = Image.open(path)
    mode = img.mode
    row = {
        "file": str(path.relative_to(PACK_ROOT)),
        "mode": mode,
        "size": f"{img.width}x{img.height}",
        "has_alpha": False,
        "transparent_pct": 0.0,
        "opaque_bbox": "",
        "edge_clean": False,
        "verdict": "",
    }

    if mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.getchannel("A")
    row["has_alpha"] = "A" in Image.open(path).getbands()

    hist = alpha.histogram()
    total = img.width * img.height
    fully_transparent = hist[0]
    row["transparent_pct"] = round(100.0 * fully_transparent / total, 1)

    bbox = alpha.getbbox()  # box of non-zero alpha
    row["opaque_bbox"] = str(bbox) if bbox else "EMPTY"

    # edges fully transparent? (a stray white background usually fails this)
    w, h = img.size
    edge_px = (
        [alpha.getpixel((x, 0)) for x in range(0, w, max(1, w // 50))] +
        [alpha.getpixel((x, h - 1)) for x in range(0, w, max(1, w // 50))] +
        [alpha.getpixel((0, y)) for y in range(0, h, max(1, h // 50))] +
        [alpha.getpixel((w - 1, y)) for y in range(0, h, max(1, h // 50))]
    )
    row["edge_clean"] = all(p == 0 for p in edge_px)

    if not row["has_alpha"] or row["transparent_pct"] == 0.0:
        row["verdict"] = "FAIL: no transparency (flat/opaque background)"
    elif not row["edge_clean"]:
        row["verdict"] = "WARN: edges not fully transparent (possible halo/box)"
    elif bbox and (bbox[0] > w * 0.15 or bbox[1] > h * 0.15):
        row["verdict"] = "WARN: lots of padding — consider trimming"
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
    print(f"\n{ok}/{len(rows)} clean.  Full report -> {REPORT.relative_to(PACK_ROOT)}")


if __name__ == "__main__":
    main()
