# Using Yanna in CapCut 🎬

This is the practical, click-by-click guide for dropping Yanna into your TikToks
as a Lizzie-McGuire-style pop-up inner voice.

> **This guide is about the pre-animated exports** (GIF / WebM) that this workspace
> generates — the thing the base pack doesn't ship. For the original pack's own CapCut
> instructions, hand-built keyframe recipes, and lip-sync method, see the authoritative
> docs in the pack itself:
> - `../../Yanna_Mini_Popup_Pack/README.md`
> - `../../Yanna_Mini_Popup_Pack/08_CapCut_Templates/animation_recipes.md`
>
> Use the pre-animated WebM/GIF when you want it done for you; use the pack's keyframe
> recipes when you want to build the motion by hand in CapCut.

---

## Which export format should I use?

| You want… | Use | Why |
|---|---|---|
| Cleanest overlay, no white box, smallest file | **`exports/webm/…webm`** | Real transparency (alpha). Best quality. **Recommended.** |
| Quick drag-and-drop / preview anywhere | **`exports/gif/…gif`** | Universal, but bigger and slightly rougher edges |
| Full manual keyframe control | **`exports/png-sequence/…`** | Import the frames, or use one still + CapCut animations |
| A still sticker you'll animate yourself | **`exports/capcut-ready-png/…png`** | One clean frame, then use CapCut's built-in animations |

> **Transparent WebM note:** CapCut mobile and desktop both support alpha WebM as
> an overlay. If a particular CapCut build ever shows a black/white box behind a
> WebM, fall back to the **PNG sequence** or **GIF** for that clip.

---

## Method A — Animated overlay (WebM or GIF) — fastest

1. Open your project → tap **Overlay** → **Add overlay**.
2. Import the file from `exports/webm/` (or `exports/gif/`).
3. Drag it to the corner where your inner voice should pop up (bottom-right reads
   well and doesn't cover captions).
4. Scale to roughly **35–45%** of screen width.
5. Position the overlay clip on the timeline exactly where the reaction should hit.
6. Done — the motion is already baked in. Loop it by duplicating the clip if you
   need it to hover longer.

## Method B — Still PNG + CapCut's built-in animation — most control

1. **Overlay → Add overlay →** import from `exports/capcut-ready-png/`.
2. Select the clip → **Animation**.
3. Apply the combo listed in the manifest's **suggested_capcut_animation** column,
   e.g. for `side_eye`: **In: Fade · Loop: Wiggle · Out: Fade**.
   - **In** = entrance, **Out** = exit, **Loop/Combo** = the idle motion while on screen.
4. Trim the clip to the **suggested_duration_sec** from the manifest (usually 1.5–2.5s).

---

## Recommended overlay sizing (1080 × 1920 vertical)

- **Corner pop-up (most reactions):** 35–45% width, bottom-right, ~120px inset.
- **Hero/centered moment (`celebration_bounce`, `scroll_stopper`):** 55–70% width, centered.
- **Full drama (`dramatic_faint`, `panic_spin`):** up to 80% width.
- Keep her **out of the bottom 15%** (TikTok UI) and **top 10%** (captions).

---

## Adding the on-screen phrase

Each reaction has a **suggested_on_screen_phrase** in the manifest. To add it:

1. **Text → Add text**, type the phrase (e.g. *"Girl… no."*).
2. Place it just above or beside Yanna.
3. Match her timing: same in/out point as the overlay.
4. A soft **Pop / Typewriter** text animation pairs well with `pop_in` stickers.

---

## A repeatable per-video recipe

1. Pick the reaction that matches the beat (use the manifest's **best_use_case**).
2. Drop the matching **WebM** from `exports/webm/`.
3. Add the **suggested phrase** as text, timed to match.
4. Nudge a **whoosh** or **pop** sound effect on the entrance frame.
5. Keep pop-ups to **1–2 per 8 seconds** so they stay special.

---

## Building a reusable CapCut template

Once you've styled 3–4 reactions the way you like:

1. Save the project as a **Template** (or draft you duplicate).
2. Each new video: swap the overlay source file and the text — timing and sizing
   are already set.
3. Because every export shares the same canvas and centering, swapping one WebM
   for another keeps Yanna in the exact same spot. No re-positioning.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White/black box behind her | You used a non-transparent file. Use `exports/webm/` or `exports/gif/`, or re-run `check_transparency.py` on the source. |
| Edges look "haloed" | The source PNG had a background fringe — `check_transparency.py` flags this as WARN. Re-cut the source. |
| Motion clips at the frame edge | The engine already pads the canvas 35%; if you cropped the export, re-run `animate.py`. |
| GIF looks grainy | Prefer WebM. GIF is limited to 256 colors. |
| Overlay too big/small every time | Set it once, save as a template (see above). |
