# Naming convention 🏷️

Consistent names are what let the scripts find your files and what keep the
manifest, exports, and CapCut library tidy. Follow this and everything "just works."

## Pattern

```
yanna_<category>_<name>.png
```

- lowercase only
- words separated by underscores `_` (no spaces, no dashes)
- `.png` with a real transparent background (RGBA)

## Categories & where they go

| Category | Folder | Example file |
|---|---|---|
| `reaction` | `source/reactions/` | `yanna_reaction_side_eye.png` |
| `pose` | `source/poses/` | `yanna_pose_01.png` |
| `mouth` | `source/mouths/` | `yanna_mouth_a1.png` |
| `expression` | `source/expressions/` | `yanna_expression_happy.png` |
| `reference` | `source/reference/` | `yanna_reference_sheet.png` |

> The core popup system runs on **reactions**. `animate.py` looks specifically for
> `source/reactions/yanna_reaction_*.png`.

## The 25 reaction names (must match the manifest)

```
side_eye            tiny_clap           girl_face           caption_pointer
panic_spin          money_eyes          mom_glitch          idea_explosion
soft_life_sigh      be_for_real_stare   notebook_dive       canva_crawl
celebration_bounce  receipt_pull        dramatic_faint      product_hug
post_it_alarm       scroll_stopper      inner_child_wave    chill_mode
boss_mode           kitchen_table_ceo   we_dont_judge_nod   sale_whisper
exit_slide
```

So the 25 files should be exactly:

```
yanna_reaction_side_eye.png
yanna_reaction_tiny_clap.png
yanna_reaction_girl_face.png
… (etc, one per name above) …
yanna_reaction_exit_slide.png
```

## Generated file names (don't create these by hand)

`animate.py` writes:

```
exports/gif/<name>_<preset>.gif                 e.g. side_eye_wiggle.gif
exports/webm/<name>_<preset>.webm               e.g. side_eye_wiggle.webm
exports/png-sequence/<name>_<preset>/frame_###.png
```

## Renaming or adding a reaction

1. Edit the `REACTIONS` list in `scripts/build_manifest.py`.
2. Re-run `python3 scripts/build_manifest.py`.
3. Name the matching source PNG `yanna_reaction_<new_name>.png`.
4. Re-run `python3 scripts/animate.py`.
