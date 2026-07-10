#!/usr/bin/env python3
"""
YANNA MINI POP-UP PACK - GRID SLICER
=====================================
Slices a 5x5 (or any NxN) character grid into individual PNGs,
names them from a list you provide, resizes for TikTok overlays,
optionally removes the flat background for transparent pop-ups,
and builds a labeled contact sheet so you can see everything at once.

USAGE:
    python3 grid_slicer.py --image poses_grid.png --names names_poses.txt \
        --outdir ./02_Full_Body_Poses --prefix yanna_pose \
        --rows 5 --cols 5 --tiktok-size 800 --transparent

NAMES FILE:
    Plain text, one name per line, reading the grid left-to-right,
    top-to-bottom. 25 lines for a 5x5 grid. Blank lines are skipped.
    If you give fewer names than cells, leftover cells are named
    cell_R#C# automatically.
"""

import argparse
import os
import sys
from PIL import Image, ImageDraw, ImageFont


def load_names(path, total):
    names = []
    if path and os.path.exists(path):
        with open(path, "r") as f:
            names = [line.strip() for line in f if line.strip()]
    # pad with fallback names if list is short
    idx = 0
    while len(names) < total:
        row, col = divmod(idx, 5)
        fallback = f"cell_R{row+1}C{col+1}"
        if fallback not in names:
            names.append(fallback)
        idx += 1
    return names[:total]


def slice_grid(image_path, rows, cols, trim=0):
    """Cut the grid into equal cells. `trim` shaves N px off each
    cell edge to remove grid border lines."""
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    cw, ch = w / cols, h / rows
    cells = []
    for r in range(rows):
        for c in range(cols):
            box = (
                int(c * cw) + trim,
                int(r * ch) + trim,
                int((c + 1) * cw) - trim,
                int((r + 1) * ch) - trim,
            )
            cells.append(img.crop(box))
    return cells


def remove_background(img, tolerance=28):
    """Flood-fill background removal from the four corners.
    Works great on flat studio backgrounds (like these cream ones).
    Keeps interior colors safe - only removes pixels CONNECTED to
    the edges that match the corner color."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    # sample the 4 corners, use average as the background color
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def matches(p):
        return all(abs(p[i] - bg[i]) <= tolerance for i in range(3))

    # BFS flood fill from every edge pixel that matches bg
    visited = bytearray(w * h)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if matches(px[x, y]):
                stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if matches(px[x, y]):
                stack.append((x, y))

    while stack:
        x, y = stack.pop()
        i = y * w + x
        if visited[i]:
            continue
        visited[i] = 1
        p = px[x, y]
        if not matches(p):
            continue
        px[x, y] = (p[0], p[1], p[2], 0)  # make transparent
        if x > 0:
            stack.append((x - 1, y))
        if x < w - 1:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y < h - 1:
            stack.append((x, y + 1))
    return img


def resize_for_tiktok(img, target_long_side):
    """Upscale/downscale so the longest side hits the target.
    LANCZOS keeps stylized 3D art looking crisp."""
    w, h = img.size
    scale = target_long_side / max(w, h)
    return img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


def build_contact_sheet(cells, names, cols, out_path, cell_size=260, pad=14, label_h=34):
    rows = (len(cells) + cols - 1) // cols
    tile_w = cell_size + pad
    tile_h = cell_size + label_h + pad
    sheet = Image.new("RGBA", (cols * tile_w + pad, rows * tile_h + pad), (246, 240, 230, 255))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    except Exception:
        font = ImageFont.load_default()

    for i, (cell, name) in enumerate(zip(cells, names)):
        r, c = divmod(i, cols)
        thumb = cell.copy()
        thumb.thumbnail((cell_size, cell_size), Image.LANCZOS)
        x = pad + c * tile_w + (cell_size - thumb.width) // 2
        y = pad + r * tile_h
        sheet.paste(thumb, (x, y), thumb)
        label = name if len(name) <= 26 else name[:24] + ".."
        tx = pad + c * tile_w + 4
        ty = y + cell_size + 6
        draw.text((tx, ty), label, fill=(60, 40, 30, 255), font=font)

    sheet.convert("RGB").save(out_path, quality=92)
    print(f"  Contact sheet -> {out_path}")


def main():
    ap = argparse.ArgumentParser(description="Slice a character grid into named PNG assets.")
    ap.add_argument("--image", required=True, help="Path to the grid image")
    ap.add_argument("--names", help="Text file, one asset name per line (L-to-R, top-to-bottom)")
    ap.add_argument("--outdir", required=True, help="Output folder for full-size crops")
    ap.add_argument("--prefix", default="asset", help="Filename prefix, e.g. yanna_pose")
    ap.add_argument("--rows", type=int, default=5)
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--trim", type=int, default=2, help="Pixels shaved off each cell edge (kills grid lines)")
    ap.add_argument("--tiktok-size", type=int, default=0, help="If >0, save a resized copy (longest side = this) into outdir_tiktok")
    ap.add_argument("--tiktok-dir", default=None, help="Where to put TikTok-size copies")
    ap.add_argument("--transparent", action="store_true", help="Also save background-removed PNGs")
    ap.add_argument("--transparent-dir", default=None, help="Where to put transparent copies")
    ap.add_argument("--tolerance", type=int, default=28, help="Background match tolerance for --transparent")
    ap.add_argument("--contact-sheet", default=None, help="Path to save the labeled contact sheet")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    cells = slice_grid(args.image, args.rows, args.cols, trim=args.trim)
    names = load_names(args.names, len(cells))

    tiktok_dir = args.tiktok_dir or (args.outdir.rstrip("/") + "_tiktok")
    trans_dir = args.transparent_dir or (args.outdir.rstrip("/") + "_transparent")
    if args.tiktok_size > 0:
        os.makedirs(tiktok_dir, exist_ok=True)
    if args.transparent:
        os.makedirs(trans_dir, exist_ok=True)

    trans_cells = []
    for i, (cell, name) in enumerate(zip(cells, names), 1):
        fname = f"{args.prefix}_{i:02d}_{name}.png"
        cell.save(os.path.join(args.outdir, fname))

        work = cell
        if args.transparent:
            work = remove_background(cell, tolerance=args.tolerance)
            work.save(os.path.join(trans_dir, fname))
            trans_cells.append(work)

        if args.tiktok_size > 0:
            big = resize_for_tiktok(work, args.tiktok_size)
            big.save(os.path.join(tiktok_dir, fname))

        print(f"  [{i:02d}/{len(cells)}] {fname}")

    if args.contact_sheet:
        build_contact_sheet(cells, names, args.cols, args.contact_sheet)

    print(f"\nDone. {len(cells)} assets sliced from {os.path.basename(args.image)}")


if __name__ == "__main__":
    main()
