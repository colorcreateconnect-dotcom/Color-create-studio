# Naming convention 🏷️

The real pack uses one consistent scheme. The scripts rely on it, so keep it if
you add or regenerate stickers.

## Pattern

```
yanna_<TYPE>_<##>_<description>.png
```

- lowercase, underscores between words, `.png` with a transparent (RGBA) background
- `<##>` is the two-digit grid position (matches the contact sheets, so the sheet
  doubles as a catalog)

## The six categories (in `source/` and `../Yanna_Mini_Popup_Pack/06_Transparent_PNGs/`)

| Category folder | TYPE token | Example | What it is |
|---|---|---|---|
| `signature/` | `sig` | `yanna_sig_01_side_eye.png` | **The 25 named popup reactions** — the core inner-voice set (matches the manifest) |
| `signature_alt/` | `sigalt` | `yanna_sigalt_01_side_eye.png` | Alternate takes of the same 25 named reactions |
| `reactions/` | `react` | `yanna_react_21_heart_eyes_love.png` | 25 numbered emotion reactions (heart eyes, crying, zzz…) |
| `poses/` | `pose` | `yanna_pose_03_A3_cheer_run.png` | 25 full-body poses (vowel grid A1–U5) |
| `mouths/` | `mouth` | `yanna_mouth_16_O1_round_oh.png` | 25 viseme mouth shapes for lip-sync |
| `expressions/` | `face` | `yanna_face_09_side_eye_sus.png` | 25 facial-expression close-ups |

> The popup animation system centers on **`signature/`** — those 25 names map 1:1 to
> `manifest/yanna_manifest.csv`. The other categories are animated with sensible
> per-category defaults and are also great as CapCut stills.

## The 25 signature reaction names (must match the manifest)

```
01 side_eye         02 tiny_clap          03 girl_face          04 caption_pointer
05 panic_spin       06 money_eyes         07 mom_glitch         08 idea_explosion
09 soft_life_sigh   10 be_for_real_stare  11 notebook_dive      12 canva_crawl
13 celebration_bounce 14 receipt_pull     15 dramatic_faint     16 product_hug
17 post_it_alarm    18 scroll_stopper     19 inner_child_wave   20 chill_mode
21 boss_mode        22 kitchen_table_ceo  23 we_dont_judge_nod  24 sale_whisper
25 exit_slide
```

## Generated output names (written by `animate.py`, don't create by hand)

```
exports/gif/<category>/<sourcestem>_<preset>.gif      e.g. signature/yanna_sig_01_side_eye_wiggle.gif
exports/webm/<category>/<sourcestem>_<preset>.webm    e.g. signature/yanna_sig_01_side_eye_wiggle.webm
exports/capcut-ready-png/<category>/<sourcestem>.png  (still copy of the source)
exports/png-sequence/<category>/<sourcestem>_<preset>/frame_###.png  (opt-in)
```

## Adding or renaming a signature reaction

1. Edit the `REACTIONS` list in `scripts/build_manifest.py`.
2. Re-run `python3 scripts/build_manifest.py`.
3. Name the matching source PNG `yanna_sig_<##>_<new_name>.png` in `source/signature/`.
4. Re-run `python3 scripts/animate.py`.
