#!/usr/bin/env python3
"""
build_manifest.py — single source of truth for the Yanna Mini Popup Pack.

Writes:
  manifest/yanna_manifest.json   (structured, read by animate.py)
  manifest/yanna_manifest.csv    (spreadsheet-friendly)

The 25 named reactions below were transcribed directly from the pack's
labeled reference sheet. Edit the REACTIONS list to add/rename stickers,
then re-run:  python3 scripts/build_manifest.py
"""

import csv
import json
from pathlib import Path

PACK_ROOT = Path(__file__).resolve().parent.parent

# The 7 code-generated animation presets shipped in animate.py.
# Each reaction is mapped to the one that best fits its energy.
PRESETS = [
    "pop_in", "wiggle", "clap_shake", "slide_in", "exit_slide", "float", "pulse",
]

# file naming convention:  yanna_reaction_<name>.png  (see docs/NAMING_CONVENTION.md)
REACTIONS = [
    # (index, name, best_use_case, capcut_animation, preset, phrase, duration_sec)
    (1,  "side_eye",
        "Reacting to a shady comment, plot twist, or questionable take.",
        "In: Fade · Loop: Wiggle · Out: Fade", "wiggle",
        "Ma'am. We saw that.", 2.0),
    (2,  "tiny_clap",
        "Sarcastic praise or celebrating a tiny win.",
        "In: Bounce · Loop: Shake · Out: Fade", "clap_shake",
        "Okay, do it again \U0001F44F", 2.0),
    (3,  "girl_face",
        "Deadpan disapproval / calling out a bad idea.",
        "In: Zoom In · Loop: Pulse · Out: Fade", "pulse",
        "Girl… no.", 2.0),
    (4,  "caption_pointer",
        "Directing the viewer to on-screen text or a CTA.",
        "In: Rise · Out: Fade", "pop_in",
        "Read that part again ⬆️", 2.5),
    (5,  "panic_spin",
        "Overwhelm, deadlines, chaos moments.",
        "In: Spin · Loop: Wiggle · Out: Zoom Out", "wiggle",
        "It's giving overwhelmed \U0001F629", 2.0),
    (6,  "money_eyes",
        "Sales, pricing reveals, anything money.",
        "In: Zoom In · Loop: Heartbeat · Out: Fade", "pulse",
        "Cha-ching \U0001F4B0", 1.8),
    (7,  "mom_glitch",
        "Relatable tired-mom / 'brb' moments.",
        "In: Slide (left) · Out: Slide (right)", "slide_in",
        "Mom brain. Standby ☕", 2.2),
    (8,  "idea_explosion",
        "Aha moment / introducing a tip or idea.",
        "In: Bounce · Loop: Pulse · Out: Fade", "pop_in",
        "Wait — I got it \U0001F4A1", 2.0),
    (9,  "soft_life_sigh",
        "Self-care, relaxation, soft-life content.",
        "In: Fade · Loop: Float · Out: Fade", "float",
        "Soft life only ☁️", 2.5),
    (10, "be_for_real_stare",
        "Calling out nonsense / 'really?' beat.",
        "In: Zoom In · Loop: Pulse · Out: Fade", "pulse",
        "Be so for real.", 2.0),
    (11, "notebook_dive",
        "Note-taking, 'save this', planning content.",
        "In: Slide (down) · Out: Fade", "slide_in",
        "Let me write that down ✍️", 2.2),
    (12, "canva_crawl",
        "Design struggles / tech frustration.",
        "In: Slide (left) · Out: Fade", "slide_in",
        "Canva broke me again \U0001F62D", 2.2),
    (13, "celebration_bounce",
        "Wins, launches, milestones, hype.",
        "In: Bounce · Loop: Wiggle · Out: Zoom Out", "pop_in",
        "WE DID IT \U0001F389", 2.2),
    (14, "receipt_pull",
        "Proof, facts, 'told you so', testimonials.",
        "In: Slide (right) · Out: Fade", "slide_in",
        "I got the receipts \U0001F9FE", 2.5),
    (15, "dramatic_faint",
        "Overreacting for comedy / shock.",
        "In: Slide (down) · Out: Fade", "slide_in",
        "I can't \U0001F635", 2.2),
    (16, "product_hug",
        "Showing off a product or launch.",
        "In: Bounce · Loop: Heartbeat · Out: Fade", "pop_in",
        "My baby \U0001F979", 2.2),
    (17, "post_it_alarm",
        "Reminders, announcements, 'don't forget'.",
        "In: Bounce · Loop: Shake · Out: Fade", "clap_shake",
        "This your reminder \U0001F514", 2.0),
    (18, "scroll_stopper",
        "Hooks / the very first second of a video.",
        "In: Zoom In (fast) · Out: Zoom Out", "pop_in",
        "STOP scrolling ✋", 1.5),
    (19, "inner_child_wave",
        "Intros / greeting the audience.",
        "In: Rise · Loop: Wiggle · Out: Fade", "wiggle",
        "Hi bestie \U0001F44B✨", 2.0),
    (20, "chill_mode",
        "Laid-back vibes, weekend content.",
        "In: Fade · Loop: Float · Out: Fade", "float",
        "We outside. Relax \U0001F60E", 2.5),
    (21, "boss_mode",
        "Business / CEO content, getting organized.",
        "In: Rise · Loop: Pulse · Out: Fade", "pop_in",
        "Boss mode: on \U0001F4CB", 2.0),
    (22, "kitchen_table_ceo",
        "Entrepreneur story, small-business content.",
        "In: Slide (left) · Out: Fade", "slide_in",
        "Built from the kitchen table \U0001F4BB", 2.5),
    (23, "we_dont_judge_nod",
        "Reassurance / safe-space messaging.",
        "In: Fade · Loop: Pulse · Out: Fade", "pulse",
        "We don't judge here \U0001F90D", 2.2),
    (24, "sale_whisper",
        "Teasing deals / discounts subtly.",
        "In: Zoom In · Loop: Pulse · Out: Fade", "pop_in",
        "Psst… it's on sale \U0001F92B", 2.2),
    (25, "exit_slide",
        "Outro / end of a video.",
        "In: Fade · Out: Slide (right)", "exit_slide",
        "Okay bye \U0001F44B\U0001F4A8", 1.8),
]

# Locked character spec — anyone regenerating a sticker MUST match this.
CHARACTER_LOCK = {
    "name": "Yanna",
    "style": "Stylized 3D chibi mini character (Lizzie McGuire-style inner voice)",
    "must_keep": [
        "brown zip-front top",
        "pink leopard wrap skirt",
        "long braids",
        "sunglasses",
        "gold jewelry (hoop earrings + layered necklaces + ankle bracelet)",
        "smartwatch",
        "sandals",
        "cheek dimples (visible when smiling)",
        "thigh tattoo (Mongolian flowers + bow ribbon + 'Never regret anything that once made you smile' script)",
    ],
    "palette": ["#7B4B2E", "#A56A43", "#D7A27C", "#2F1F16",
                "#8E6B95", "#E7C079", "#F2E5D0"],
    "rules": ["Do not alter the character design.", "Do not create a new character."],
}


def build_rows():
    rows = []
    for idx, name, use_case, capcut, preset, phrase, dur in REACTIONS:
        # Real pack filenames: the "signature" set = the 25 named popup reactions,
        # numbered in this exact order (yanna_sig_01_side_eye … yanna_sig_25_exit_slide).
        stem = f"yanna_sig_{idx:02d}_{name}"
        rows.append({
            "file_name": f"{stem}.png",
            "category": "signature",
            "reaction_name": name,
            "best_use_case": use_case,
            "suggested_capcut_animation": capcut,
            "suggested_on_screen_phrase": phrase,
            "animation_preset": preset,
            "suggested_duration_sec": dur,
            "source_path": f"source/signature/{stem}.png",
            "capcut_ready_png": f"exports/capcut-ready-png/signature/{stem}.png",
            "gif": f"exports/gif/signature/{stem}_{preset}.gif",
            "webm": f"exports/webm/signature/{stem}_{preset}.webm",
        })
    return rows


def main():
    rows = build_rows()
    manifest_dir = PACK_ROOT / "manifest"
    manifest_dir.mkdir(exist_ok=True)

    # JSON (source of truth for animate.py)
    payload = {
        "pack": "Yanna Mini Popup Pack",
        "version": 1,
        "character_lock": CHARACTER_LOCK,
        "animation_presets": PRESETS,
        "reaction_count": len(rows),
        "reactions": rows,
    }
    json_path = manifest_dir / "yanna_manifest.json"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    # CSV (the 6 requested columns first, then helpful extras)
    fieldnames = [
        "file_name", "category", "reaction_name", "best_use_case",
        "suggested_capcut_animation", "suggested_on_screen_phrase",
        "animation_preset", "suggested_duration_sec",
        "source_path", "capcut_ready_png", "gif", "webm",
    ]
    csv_path = manifest_dir / "yanna_manifest.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {json_path.relative_to(PACK_ROOT)}  ({len(rows)} reactions)")
    print(f"Wrote {csv_path.relative_to(PACK_ROOT)}   ({len(rows)} reactions)")


if __name__ == "__main__":
    main()
