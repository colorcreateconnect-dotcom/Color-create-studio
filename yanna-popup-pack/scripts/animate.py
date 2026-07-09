#!/usr/bin/env python3
"""
animate.py — turn Yanna's transparent PNG stickers into animated overlays.

Seven presets (all preserve transparency):
    pop_in      pop-in bounce (overshoot scale + settle)
    wiggle      side-to-side wiggle / sway
    clap_shake  quick tiny-clap shake (horizontal jitter)
    slide_in    dramatic slide-in from an edge
    exit_slide  slide out and fade away
    float       gentle float/hover (bob up and down)
    pulse       attention pulse (scale + subtle glow)

Outputs per sticker (into ../exports/):
    gif/<name>_<preset>.gif             transparent animated GIF
    webm/<name>_<preset>.webm           VP9 + alpha transparent video (CapCut-friendly)
    png-sequence/<name>_<preset>/*.png  numbered frames

Usage:
    python3 scripts/animate.py                 # animate every sticker in source/reactions
                                               #   using each one's preset from the manifest
    python3 scripts/animate.py --preset float  # force one preset for all
    python3 scripts/animate.py --only side_eye tiny_clap
    python3 scripts/animate.py --formats gif webm
    python3 scripts/animate.py --self-test     # prove the pipeline on a labeled test blob

Requires: Pillow, imageio-ffmpeg  (see requirements.txt)
"""

import argparse
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PACK_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PACK_ROOT / "source" / "reactions"
EXPORT = PACK_ROOT / "exports"
MANIFEST = PACK_ROOT / "manifest" / "yanna_manifest.json"

FPS = 30
CANVAS_PAD = 0.35  # extra transparent margin (fraction of size) so motion never clips


# --------------------------------------------------------------------------- #
# easing helpers
# --------------------------------------------------------------------------- #
def ease_out_back(t: float, s: float = 1.70158) -> float:
    t -= 1.0
    return t * t * ((s + 1) * t + s) + 1.0


def ease_in_out(t: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


# --------------------------------------------------------------------------- #
# canvas / compositing
# --------------------------------------------------------------------------- #
def make_canvas(base: Image.Image):
    """Return (canvas_w, canvas_h) with padding around the sticker."""
    w, h = base.size
    cw = int(w * (1 + CANVAS_PAD))
    ch = int(h * (1 + CANVAS_PAD))
    return cw, ch


def place(canvas_size, sprite: Image.Image, cx: float, cy: float,
          scale: float = 1.0, opacity: float = 1.0, rot: float = 0.0):
    """Composite `sprite` centered at (cx, cy) on a fresh transparent canvas."""
    cw, ch = canvas_size
    frame = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    s = sprite
    if scale != 1.0:
        nw = max(1, int(s.width * scale))
        nh = max(1, int(s.height * scale))
        s = s.resize((nw, nh), Image.LANCZOS)
    if rot:
        s = s.rotate(rot, resample=Image.BICUBIC, expand=True)
    if opacity < 1.0:
        alpha = s.getchannel("A").point(lambda a: int(a * opacity))
        s = s.copy()
        s.putalpha(alpha)
    frame.alpha_composite(s, (int(cx - s.width / 2), int(cy - s.height / 2)))
    return frame


# --------------------------------------------------------------------------- #
# presets -> list of RGBA frames
# --------------------------------------------------------------------------- #
def preset_pop_in(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    for i in range(n):
        t = i / (n - 1)
        if t < 0.55:                       # pop in with overshoot
            k = ease_out_back(t / 0.55)
            scale, op = lerp(0.2, 1.0, k), min(1.0, t / 0.2)
        else:                              # gentle settle bob
            k = (t - 0.55) / 0.45
            scale = 1.0 + 0.03 * math.sin(k * math.pi * 2)
            op = 1.0
        frames.append(place((cw, ch), base, cx, cy, scale, op))
    return frames


def preset_wiggle(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    for i in range(n):
        t = i / n
        rot = 7.0 * math.sin(t * math.pi * 4)          # two full sways
        dx = 0.02 * cw * math.sin(t * math.pi * 4)
        frames.append(place((cw, ch), base, cx + dx, cy, 1.0, 1.0, rot))
    return frames


def preset_clap_shake(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    for i in range(n):
        t = i / n
        dx = 0.018 * cw * math.sin(t * math.pi * 10)   # fast tiny jitter
        scale = 1.0 + 0.02 * abs(math.sin(t * math.pi * 10))
        frames.append(place((cw, ch), base, cx + dx, cy, scale))
    return frames


def preset_slide_in(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    start_x = -base.width / 2
    for i in range(n):
        t = i / (n - 1)
        if t < 0.7:
            k = ease_out_back(t / 0.7)
            x, op = lerp(start_x, cx, k), min(1.0, t / 0.2)
        else:
            x, op = cx, 1.0
        frames.append(place((cw, ch), base, x, cy, 1.0, op))
    return frames


def preset_exit_slide(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    end_x = cw + base.width / 2
    frames = []
    for i in range(n):
        t = i / (n - 1)
        if t < 0.25:                       # small anticipation dip back
            x = lerp(cx, cx - 0.05 * cw, ease_in_out(t / 0.25))
            op = 1.0
        else:
            k = ease_in_out((t - 0.25) / 0.75)
            x = lerp(cx - 0.05 * cw, end_x, k)
            op = 1.0 - k
        frames.append(place((cw, ch), base, x, cy, 1.0, op))
    return frames


def preset_float(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    for i in range(n):
        t = i / n
        dy = 0.03 * ch * math.sin(t * math.pi * 2)     # one gentle bob
        rot = 1.5 * math.sin(t * math.pi * 2)
        frames.append(place((cw, ch), base, cx, cy + dy, 1.0, 1.0, rot))
    return frames


def preset_pulse(base, cw, ch, n):
    cx, cy = cw / 2, ch / 2
    frames = []
    for i in range(n):
        t = i / n
        scale = 1.0 + 0.06 * math.sin(t * math.pi * 4)  # two heartbeats
        frames.append(place((cw, ch), base, cx, cy, scale))
    return frames


PRESET_FUNCS = {
    "pop_in": (preset_pop_in, 1.0),
    "wiggle": (preset_wiggle, 1.4),
    "clap_shake": (preset_clap_shake, 1.0),
    "slide_in": (preset_slide_in, 1.2),
    "exit_slide": (preset_exit_slide, 1.2),
    "float": (preset_float, 2.0),
    "pulse": (preset_pulse, 1.4),
}


# --------------------------------------------------------------------------- #
# exporters
# --------------------------------------------------------------------------- #
def export_gif(frames, out_path, fps=FPS):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dur_ms = int(1000 / fps)
    # quantize while keeping a transparent index
    conv = []
    for f in frames:
        alpha = f.getchannel("A")
        p = f.convert("RGB").quantize(colors=255, method=Image.FASTOCTREE)
        mask = alpha.point(lambda a: 255 if a <= 128 else 0)
        p.paste(255, mask)                 # index 255 = transparent
        conv.append(p)
    conv[0].save(
        out_path, save_all=True, append_images=conv[1:], loop=0,
        duration=dur_ms, disposal=2, transparency=255, optimize=False,
    )


def export_png_sequence(frames, out_dir):
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(frames):
        f.save(out_dir / f"frame_{i:03d}.png")


def export_webm(frames, out_path, ffmpeg, fps=FPS):
    """VP9 + yuva420p (real alpha) so CapCut overlays with no background box."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.parent / (out_path.stem + "_frames_tmp")
    export_png_sequence(frames, tmp)
    cmd = [
        ffmpeg, "-y", "-framerate", str(fps),
        "-i", str(tmp / "frame_%03d.png"),
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
        "-b:v", "0", "-crf", "28",
        # These two are essential for CapCut/players to actually read the alpha:
        # without alpha_mode the WebM muxes as opaque yuv420p and the cut-out is lost.
        "-auto-alt-ref", "0", "-metadata:s:v:0", "alpha_mode=1",
        "-an", str(out_path),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL)
    shutil.rmtree(tmp)


# --------------------------------------------------------------------------- #
# driver
# --------------------------------------------------------------------------- #
def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"reactions": []}


def preset_for(name, manifest):
    for r in manifest.get("reactions", []):
        if r["reaction_name"] == name:
            return r["animation_preset"]
    return "pop_in"


def render_one(base, name, preset, formats, ffmpeg):
    func, secs = PRESET_FUNCS[preset]
    n = max(2, int(secs * FPS))
    cw, ch = make_canvas(base)
    frames = func(base, cw, ch, n)
    stem = f"{name}_{preset}"
    made = []
    if "gif" in formats:
        p = EXPORT / "gif" / f"{stem}.gif"
        export_gif(frames, p)
        made.append(p)
    if "webm" in formats and ffmpeg:
        p = EXPORT / "webm" / f"{stem}.webm"
        export_webm(frames, p, ffmpeg)
        made.append(p)
    if "png-sequence" in formats:
        d = EXPORT / "png-sequence" / stem
        export_png_sequence(frames, d)
        made.append(d)
    return made


def get_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def make_test_blob(size=512):
    """A labeled, non-character RGBA fixture used only to prove the pipeline."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([size * 0.12, size * 0.12, size * 0.88, size * 0.88],
              fill=(165, 106, 67, 255))
    d.ellipse([size * 0.20, size * 0.20, size * 0.80, size * 0.80],
              outline=(247, 229, 208, 255), width=10)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.13))
    except Exception:
        font = ImageFont.load_default()
    for i, line in enumerate(("PIPELINE", "TEST")):
        bb = d.textbbox((0, 0), line, font=font)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        d.text(((size - tw) / 2, size * 0.36 + i * th * 1.2), line,
               fill=(47, 31, 22, 255), font=font)
    return img


def main():
    ap = argparse.ArgumentParser(description="Animate Yanna popup stickers.")
    ap.add_argument("--preset", choices=list(PRESET_FUNCS),
                    help="force one preset for all stickers")
    ap.add_argument("--only", nargs="*", default=None,
                    help="reaction names to render (default: all found)")
    ap.add_argument("--formats", nargs="*",
                    default=["gif", "webm", "png-sequence"],
                    choices=["gif", "webm", "png-sequence"])
    ap.add_argument("--self-test", action="store_true",
                    help="render every preset on a labeled test blob")
    args = ap.parse_args()

    ffmpeg = get_ffmpeg()
    if "webm" in args.formats and not ffmpeg:
        print("! imageio-ffmpeg not installed — skipping WebM. `pip install imageio-ffmpeg`")

    if args.self_test:
        blob = make_test_blob()
        print("Self-test: rendering all 7 presets on a labeled test blob…")
        for preset in PRESET_FUNCS:
            made = render_one(blob, "_selftest", preset, args.formats, ffmpeg)
            print(f"  {preset:11s} -> " + ", ".join(str(m.relative_to(PACK_ROOT)) for m in made))
        return

    manifest = load_manifest()
    pngs = sorted(SRC_DIR.glob("yanna_reaction_*.png"))
    if not pngs:
        print(f"No stickers found in {SRC_DIR.relative_to(PACK_ROOT)}/")
        print("Drop your transparent PNGs there named yanna_reaction_<name>.png,")
        print("then re-run.  (Try `python3 scripts/animate.py --self-test` to verify the pipeline.)")
        return

    for png in pngs:
        name = png.stem.replace("yanna_reaction_", "")
        if args.only and name not in args.only:
            continue
        preset = args.preset or preset_for(name, manifest)
        base = Image.open(png).convert("RGBA")
        made = render_one(base, name, preset, args.formats, ffmpeg)
        print(f"{name:20s} [{preset}] -> {len(made)} output(s)")


if __name__ == "__main__":
    main()
