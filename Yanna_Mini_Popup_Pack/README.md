# Yanna Mini Pop-Up Pack

A reusable TikTok pop-up character system for the Yanna Mini chibi character.
Lizzie McGuire energy: the mini version of you pops into frame, reacts, talks
her mess, and pops back out.

## What Is In This Pack

| Folder | What Lives Here |
|---|---|
| 01_Master_Character | The full character reference sheet. Your source of truth for consistency. |
| 02_Full_Body_Poses | 25 full-body poses cut from the vowel pose grid (A1 to U5), full resolution. |
| 03_Facial_Expressions | 25 face close-ups (smile, cry, side eye, heart eyes, shh, etc). |
| 04_Vowel_Mouth_Shapes | 25 mouth close-ups grouped by vowel (A, E, I, O, U) for lip sync. |
| 05_Reaction_Stickers | 25 numbered full-body reactions (peace sign, crying, zzz, talk to the hand). |
| 06_Transparent_PNGs | Background-removed PNGs of everything. These are your CapCut overlays - drag these in. |
| 07_TikTok_Overlays | See the note inside: the transparent PNGs in 06 are your CapCut overlays. |
| 08_CapCut_Templates | Keyframe recipes for pop-up, bounce, shake, and lip sync animations. |
| 09_Prompt_Bank | Locked character prompts for generating new poses that stay on-model. |
| 10_Scene_Examples | Full lifestyle scene renders of the character. |
| _tools | The grid_slicer.py script plus the name lists used to cut these grids. |
| _contact_sheets | One labeled overview image per grid so you can find any pose fast. |

## File Naming System

Every file follows: `yanna_TYPE_##_description.png`

- `yanna_pose_03_A3_cheer_run.png` = full body, cell 3, vowel A, cheering mid-run
- `yanna_react_21_heart_eyes_love.png` = reaction sticker 21, heart eyes
- `yanna_face_09_side_eye_sus.png` = facial expression 9, the side eye
- `yanna_mouth_16_O1_round_oh.png` = mouth shape 16, round O for lip sync

The number matches the grid position (left to right, top to bottom), so the
contact sheets double as a catalog. Look at the sheet, find the number, grab
the file.

## The CapCut Pop-Up Workflow

### Setup (once per video)

1. Open CapCut, create a 9:16 project (1080x1920).
2. Import your talking-head or b-roll footage as the main track.
3. Import the transparent PNGs you want from `07_TikTok_Overlays`
   (these are the upscaled versions of the transparent assets).

### The Classic Pop-Up (Lizzie McGuire entrance)

1. Drag a pose PNG onto an **overlay track** above your main footage.
2. Position her in a corner (bottom left or bottom right reads best).
3. Tap the overlay, then **Animation > In > Bounce** (or Zoom In). Set to 0.3s.
4. Trim the overlay clip to 1.5 to 3 seconds. Short is punchy.
5. **Animation > Out > Zoom Out** at 0.2s so she pops back out.

That is the whole trick. She pops in, reacts, pops out. Do not let her
linger; the pop is the joke.

### Manual Keyframe Pop (more control)

1. Place the overlay, set scale to 0 percent at the start.
2. Add a keyframe. Move 8 frames forward, set scale to 110 percent, keyframe.
3. Move 4 frames forward, set scale to 100 percent, keyframe.
   That tiny overshoot (110 then 100) is what makes it feel bouncy.
4. Reverse the process at the end to pop her out.

### Reaction Swaps (she reacts to what you say)

1. Cut the overlay clip where the emotion changes.
2. Replace the second half with a different pose or expression PNG.
3. Keep her position identical between the two clips so only the pose changes.
4. Add a small **Shake** or **Pulse** animation on the swap frame for impact.

### Basic Lip Sync With the Vowel Mouths

You do not need every frame matched. TikTok lip sync reads fine at 3 to 5
mouth swaps per second.

1. Record or import your voiceover first.
2. Place a neutral face (like `yanna_face_01_sweet_smile`) as the base.
3. On the loud vowel sounds in the audio, cut and swap:
   - "ah" sounds: any A mouth
   - "ee" sounds: any E mouth
   - "oh / oo" sounds: any O or U mouth
   - hard consonants: any I mouth (teeth showing)
4. Snap swaps to the audio waveform peaks. Close enough beats perfect.

### Pro Moves

- **Drop shadow:** add a slight shadow effect to the overlay so she sits
  "on top of" the video instead of floating.
- **Consistent corner:** pick one corner per series. Your audience learns
  where to look.
- **Speech bubble combo:** pair a pose with a CapCut text bubble sticker.
  Pose delivers the emotion, bubble delivers the punchline.
- **Save as preset:** once you build one pop-up you like, copy that overlay
  clip into new projects and just swap the PNG. That is your template.

## Slicing New Grids

When you generate a new 5x5 grid, drop it in and run:

```
python3 _tools/grid_slicer.py \
  --image your_new_grid.png \
  --names _tools/your_names.txt \
  --outdir 02_Full_Body_Poses \
  --prefix yanna_pose \
  --tiktok-size 800 --tiktok-dir 07_TikTok_Overlays/poses \
  --transparent --transparent-dir 06_Transparent_PNGs/poses \
  --contact-sheet _contact_sheets/contact_new_grid.jpg
```

Names file is plain text, one name per line, reading the grid left to right,
top to bottom. If the background does not fully remove, raise `--tolerance`
(default 28, the warmer gradient grids needed 55).

## Transparency Notes

Background removal is flood-fill based: it removes the flat studio background
connected to the edges and never touches colors inside the character. Small
contact shadows under the feet may survive on some poses. If a specific
asset needs a perfect cutout for a hero moment, run just that one through
a dedicated background remover and drop it back in the folder. For fast
pop-up overlays at TikTok speed, these are ready as-is.

## Format Note

Transparent overlay assets are PNG (alpha channel preserved, full quality).
Opaque source crops and reference sheets are JPEG q90 to keep the pack
light. If you ever need to re-cut transparency at a different tolerance,
run grid_slicer.py on the source grids in 01_Master_Character.
