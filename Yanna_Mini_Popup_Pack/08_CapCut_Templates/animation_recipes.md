# CapCut Animation Recipes

Exact keyframe settings for the five core Yanna Mini moves. Build each
one once, then copy-paste the overlay clip between projects and swap
the PNG. That is your template system.

## Recipe 1: The Pop-In (signature move)

Overlay length: 2.0s total

| Time | Scale | Notes |
|---|---|---|
| 0.00s | 0% | keyframe |
| 0.25s | 112% | keyframe (the overshoot = the bounce) |
| 0.40s | 100% | keyframe (settle) |
| 1.70s | 100% | keyframe (hold) |
| 2.00s | 0% | keyframe (pop out) |

Shortcut version: Animation > In > Bounce (0.3s), Animation > Out >
Zoom Out (0.2s). Same vibe, zero keyframes.

## Recipe 2: The Slide-In From Edge

| Time | Position X | Notes |
|---|---|---|
| 0.00s | off-screen (x = -600 or +600) | keyframe |
| 0.35s | final position, +30px past it | keyframe (overshoot) |
| 0.50s | final position | keyframe |

Pair with pose `yanna_pose_01_A1_tada_arms_out` for a grand entrance.

## Recipe 3: The Reaction Shake (disbelief, hype, chaos)

On the overlay clip: Effects > Body Effects or basic keyframes:

| Time | Rotation | Notes |
|---|---|---|
| 0.00s | 0 deg | |
| 0.06s | -4 deg | |
| 0.12s | +4 deg | |
| 0.18s | -2 deg | |
| 0.24s | 0 deg | |

Use with `yanna_react_06_shocked_hands_face` or `yanna_face_06_shocked_hands_cheeks`.

## Recipe 4: The Idle Breathe (she stays on screen while you talk)

Loop this the entire time she is visible so she never feels like a sticker:

| Time | Scale | Notes |
|---|---|---|
| 0.0s | 100% | |
| 1.0s | 102% | |
| 2.0s | 100% | |

Subtle. If viewers notice it, it is too much.

## Recipe 5: Fast Lip Sync (3-swap method)

For a 1-second phrase, three mouth swaps carry it:

1. Base layer: `yanna_face_01_sweet_smile` (or any closed-ish mouth)
2. Swap 1 on the first loud vowel: matching vowel mouth
3. Swap 2 on the second stressed syllable
4. Return to base on the last word

Snap every cut to a waveform peak. Do not chase perfection; TikTok
lip sync is about rhythm, not accuracy.

## Layout Standards (so every video matches)

- Canvas: 1080 x 1920
- Yanna Mini default size: about 25 to 35 percent of screen height
- Home corner: bottom right, 40px from edges
- Face close-ups: use for reactions only, sized bigger (45 to 50
  percent height), centered low
- Always above captions layer, below any CTA end card
