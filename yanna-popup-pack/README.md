# Yanna Popup — Animation Workspace 🎬

This folder is the **animation layer** for the Yanna Mini Popup Pack. The original
pack lives at [`../Yanna_Mini_Popup_Pack/`](../Yanna_Mini_Popup_Pack/) and is the
**source of truth** (character art, reference sheet, its own CapCut docs). This
workspace takes the pack's transparent PNGs and produces the thing the pack doesn't
ship: **ready-to-use animated overlays** (transparent WebM + GIF), plus a manifest of
when/how to use each reaction and cleaned CapCut-ready stills.

---

## 📁 What's here

```
yanna-popup-pack/
├── README.md                     ← you are here
├── manifest/
│   ├── yanna_manifest.json        ← source of truth for the 25 signature reactions + character lock
│   ├── yanna_manifest.csv          ← same, spreadsheet-friendly (open in Sheets/Excel)
│   └── transparency_report.csv     ← per-file transparency audit (generated)
├── source/                         ← the 150 transparent PNGs, copied from the pack
│   ├── signature/     (25)         ← the named popup reactions — the core set
│   ├── signature_alt/ (25)         ← alternate takes of the same 25
│   ├── reactions/     (25)         ← emotion reactions (heart eyes, crying, zzz…)
│   ├── poses/         (25)         ← full-body vowel poses
│   ├── mouths/        (25)         ← viseme mouths for lip-sync
│   └── expressions/   (25)         ← facial-expression close-ups
├── exports/                        ← generated, organized by category
│   ├── webm/<cat>/                 ← transparent VP9 WebM (best for CapCut)
│   ├── gif/<cat>/                  ← transparent animated GIF
│   ├── capcut-ready-png/<cat>/     ← cleaned still stickers
│   ├── tiktok-overlays/            ← the 25 signature stills, ready to post
│   └── png-sequence/               ← numbered frames (opt-in, not committed)
├── scripts/
│   ├── build_manifest.py           ← regenerate the manifest
│   ├── check_transparency.py       ← audit every PNG's transparency
│   ├── animate.py                  ← the 7-preset animation engine
│   └── requirements.txt
└── docs/
    ├── CAPCUT_GUIDE.md             ← how to use the animated exports in CapCut
    └── NAMING_CONVENTION.md        ← the real pack's file-naming scheme
```

---

## 🚀 Regenerate everything

```bash
pip install -r scripts/requirements.txt

python3 scripts/build_manifest.py        # manifest JSON + CSV
python3 scripts/check_transparency.py     # transparency audit -> manifest/transparency_report.csv
python3 scripts/animate.py                # GIF + WebM for all clean stickers, by category
```

Useful flags:
- `python3 scripts/animate.py --category signature` — just the core set
- `python3 scripts/animate.py --preset float` — force one preset for all
- `python3 scripts/animate.py --only side_eye exit_slide` — a few by name
- `python3 scripts/animate.py --formats gif webm png-sequence` — also emit PNG frames

---

## 🎞️ The 7 animation presets

| Preset | Motion | Feels like |
|---|---|---|
| `pop_in` | pop-in bounce with overshoot + settle | entrance / punchline reveal |
| `wiggle` | side-to-side sway + tilt | playful, sassy, waving |
| `clap_shake` | fast tiny horizontal shake | claps, alerts, reminders |
| `slide_in` | dramatic slide-in from the edge | making an entrance |
| `exit_slide` | anticipation dip then slide + fade out | outro / leaving the scene |
| `float` | gentle up-down hover + micro-tilt | chill, soft-life, calm |
| `pulse` | scale heartbeat | attention grab, "look here" |

The 25 signature reactions each use a preset tailored to their vibe (see the manifest).
Other categories use a sensible default (poses→`slide_in`, expressions→`pulse`, etc.).

---

## ✅ Transparency status

`check_transparency.py` audited all 150 PNGs: **147 clean cut-outs, 3 opaque**. The 3
(`signature_alt/we_dont_judge_nod`, `sale_whisper`, `exit_slide`) shipped with their
background **not** removed, so they'd show a box in CapCut — the animator **skips** them.
The full **signature** set (all 25) is clean. See `manifest/transparency_report.csv`.

---

## 🔒 Character lock (do not change)

Every sticker is the same Yanna: brown zip-front top · pink leopard wrap skirt · long
braids · sunglasses · gold jewelry (hoops, layered necklaces, ankle bracelet) ·
smartwatch · sandals · cheek dimples · thigh tattoo (*"Never regret anything that once
made you smile"*). Palette `#7B4B2E #A56A43 #D7A27C #2F1F16 #8E6B95 #E7C079 #F2E5D0`.
Stored in `manifest/yanna_manifest.json → character_lock`. **Do not alter the design or
create a new character.**

For the CapCut workflow, read **`docs/CAPCUT_GUIDE.md`**.
