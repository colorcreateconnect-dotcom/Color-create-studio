# Character Asset Specification (for 3D artists)

This document is the **handoff contract** for replacing Color Create Studio's
generated character assets with studio-quality sculpted ones — the path to
"Sims-4-realistic-mod" level detail. The runtime depends **only** on the names
and conventions below; a correctly exported GLB drops into
`assets/characters/` with **zero code changes**.

## What we're buying/commissioning

Per body type (`base_female.glb`, `base_male.glb`), one glTF 2.0 binary
containing:

1. A **skinned body mesh** named `Body` (sculpted, smooth-shaded; target
   15–40k triangles) with PBR textures (albedo, normal, roughness; 2K–4K).
   Skin material must be named **`MAT_skin`** (the runtime re-tints its base
   color for the player's chosen skin tone — author the albedo neutral/light
   so tinting works, or provide per-tone texture variants).
2. The **humanoid skeleton** below, with the exact bone names.
3. A **modular wardrobe**: each garment its own SkinnedMesh, skinned to the
   same skeleton, named by slot (see table).
4. Optional but desired: **facial morph targets** (see list) — once present,
   the runtime's expression system will drive them instead of the procedural
   face module.

## Skeleton (19 bones, exact names)

```
Hips
├─ Spine ─ Chest ─ Neck ─ Head
│          ├─ L_Shoulder ─ L_UpperArm ─ L_LowerArm ─ L_Hand
│          └─ R_Shoulder ─ R_UpperArm ─ R_LowerArm ─ R_Hand
├─ L_UpperLeg ─ L_LowerLeg ─ L_Foot
└─ R_UpperLeg ─ R_LowerLeg ─ R_Foot
```

- Rest pose: symmetric **A-pose** (arms ~20° from the body), facing **+Z**,
  **Y-up**, feet at y=0. Scale: **1 unit = 1 meter**; adult height ≈ 1.72–1.85.
- Extra bones (fingers, toes, twist bones) are allowed — the runtime ignores
  unknown bones — but the 19 above must exist with these names.
- The **Head bone origin** sits at the neck top; the runtime attaches hair /
  accessories to it (offset ≈ +0.085 to head center).

## Wardrobe slot names

| Slot mesh name    | Worn as            | Notes |
|-------------------|--------------------|-------|
| `top_cropHoodie`  | crop hoodie        | material `MAT_top_cropHoodie` |
| `top_cropZip`     | zip crop jacket    | |
| `top_strap`       | strappy top        | |
| `top_fur`         | fur coat           | |
| `bottom_joggers`  | joggers            | |
| `bottom_cargo`    | cargo pants        | |
| `bottom_flare`    | flared pants       | |
| `bottom_skirt`    | mini skirt         | |
| `dress_slip`      | slip dress         | |
| `shoe_sneaker`    | sneakers (pair)    | |
| `shoe_heel`       | heels (pair)       | |

- Every wardrobe mesh: skinned to the shared skeleton, exported **visible**;
  the runtime shows/hides per outfit. New slots are welcome — add the mesh
  and reference it from an outfit preset's `slots` in
  `src/sim/data-avatar.js` (one line of data).
- Each garment gets its **own material** (named `MAT_<meshName>`); the
  runtime re-tints base color per outfit preset. Author albedo near-white
  where tinting should apply; use textured albedo where it shouldn't.

## Animation clips (baked into the GLB)

| Clip name | Loop | Purpose |
|-----------|------|---------|
| `idle`    | yes  | breathing / weight shift (played **additively** over poses) |
| `walk`    | yes  | in-place walk cycle |
| `dance`   | yes  | in-place dance loop |
| `wave`    | yes  | greeting wave |

More clips (e.g. `sit`, `run`, `hug`) are welcome; the runtime exposes any
clip by name through `CharacterRig.setMotion(name)`.

## Facial morph targets (optional, future-proof)

If the head is part of `Body` (or a separate `Head` mesh), include morphs:
`blink_L`, `blink_R`, `smile`, `frown`, `browUp_L`, `browUp_R`,
`browDown_L`, `browDown_R`, `mouthOpen`, `pout`.
Naming per ARKit-style conventions is also acceptable — map in
`src/render/face-hair.js`.

## Hair (modular)

Hair as separate **static meshes** (not skinned) named `hair_<styleId>`
(`hair_ponytail`, `hair_curls`, `hair_braids`, `hair_bob`, `hair_buns`,
`hair_short`, `hair_fade`), origin at the **head center**, exported in a
`hair_<bodyType>.glb` or inside the base file. Until provided, the runtime
uses its procedural hair modules.

## Export checklist (Blender)

1. Apply all modifiers/transforms; +Z forward, Y-up (glTF exporter default).
2. Include: Selected objects → armature + meshes; Skinning: ON; Animations:
   ON (NLA tracks named as the clip table above); Materials: glTF PBR.
3. No draco compression (runtime loader is vanilla GLTFLoader).
4. Validate: `node tools/validate-character.mjs <file.glb>` *(or load in
   the game — `CCS.characterKit.CharacterRig.create()` logs missing pieces)*.

## Where to source assets

- Commission: character artists on Fiverr/Upwork/ArtStation (search "stylized
  game character glTF/GLB, rigged, modular clothing"). Budget guidance:
  $150–800 per base body + wardrobe at indie rates.
- Marketplaces: CGTrader / Sketchfab / TurboSquid — filter *rigged*,
  *glTF/GLB*, check the license allows game embedding (royalty-free,
  no-redistribution-as-asset is fine; the GLB ships inside the game).
- Requirements to send the artist: this file, plus `assets/characters/
  base_female.glb` as the scale/skeleton reference.

## Acceptance

Drop the file into `assets/characters/`, run `npm start`, open the Sim tab:
- body loads, outfits switch in Style Studio, motions play, no console errors.
Then run the automated suites (see `README.md` → testing) — they must pass
unchanged, because the contract is only names + conventions.
