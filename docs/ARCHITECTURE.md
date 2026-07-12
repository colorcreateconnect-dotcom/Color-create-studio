# Color Create Studio — World & Renderer Architecture

This document explains the abstractions added to prepare the game for a
Sims-style world renderer (eventually Three.js), movable furniture, wallpaper,
larger homes, second lots, and autonomous NPCs — **without changing gameplay**.

```
┌────────────────────────  SIMULATION  ────────────────────────┐
│  state.js       one serializable CCS.state (the whole save)  │
│  engine.js      performAction pipeline (requirements,        │
│                 effects, slots, time, events)                │
│  lots.js        lots, placed instances, room styles          │
│  placement.js   placement rules + validation                 │
│  slots.js       interaction slots + reservations             │
│  autonomy.js    NPC autonomy state (interfaces, no AI yet)   │
│  coords.js      world coordinates + legacy migration         │
└──────────────┬───────────────────────────────────────────────┘
               │  sceneDescription()  (pure data, world coords)
┌──────────────▼───────────────────────────────────────────────┐
│                        RENDERERS                              │
│  renderer.js            the contract + registry               │
│  renderer-dom.js        top-down DOM view (default today)     │
│  renderer-three-stub.js placeholder for the Three.js renderer │
└───────────────────────────────────────────────────────────────┘
```

## Simulation vs. renderer

The simulation never touches pixels. It produces a **scene description**
(`CCS.sim.lots.sceneDescription()`): rooms with bounds and styles, placed
instances with transforms, entities with positions — all in **world
coordinates** (X horizontal, Y height, Z depth; 1 unit ≈ 1 meter).

A renderer implements the contract in `src/render/renderer.js`:

`mount / dispose / renderScene / updateEntity / updateObject / removeEntity /
setCameraTarget / raycast / worldToScreen / screenToWorld`

Renderers own ALL coordinate conversion (`renderer-dom.js` converts world →
CSS percentages internally). Swapping visuals is one line:
`CCS.renderer.use('three')`. Input flows the other way: the renderer raycasts
taps/clicks and emits `renderer-select` events; the simulation decides what
selection means.

Legacy coordinate migration lives in `coords.js`
(`fromClassicPixels`, `fromClassicTile`, `fromPercent`).

## Worlds vs. lots

- A **world** (`data-worlds.js`) is a district you travel to — Home, Pet Park,
  Nightlife… It gates content (NPCs, actions, quests) behind progression.
- A **lot** (`data-lots.js`) is a concrete parcel *inside* a world:
  dimensions, floors, a room graph, spawn points, entrances, buildable bounds,
  a price/ownership, a lighting profile, and camera bounds.

One world can hold many lots. The starter home (`home_lot`) is owned by
default; the `garden_villa` proves multi-lot support: `lots.buyLot(id)`,
`lots.setActiveLot(id)`. Live lot state (ownership, placed furniture, room
styles) is in `state.lots[lotId]`; the static definition stays in data.

## Room graph

Each lot defines rooms: `roomId`, `floorIndex`, rect `bounds` (+ derived
`polygon`), `connected` room ids, `doors` with positions, indoor/outdoor,
default `wallpaper` / `flooring` / `theme`, and a base `ambiance`. The
connectivity graph is the future basis for pathfinding — an autonomous NPC
walks room-to-room through doors. Live per-room styles are stored in
`state.lots[..].roomStyles` and editable via
`lots.setRoomStyle / cycleRoomStyle` (exposed in Build & Buy today).

## Catalog items vs. placed instances

- A **catalog item** (`data-catalog.js`) or **base object**
  (`data-objects.js`) describes what a thing *is*: actions, effects, price,
  placement rules.
- A **placed instance** (`state.lots[..].placed[]`) is one concrete copy *in
  the world*:

```js
{ instanceId, catalogId, lotId, roomId,
  pos: {x,y,z}, rot: {x,y,z}, scale: {x,y,z},
  state: {},              // per-instance runtime state
  owner: 'player'|'builtin', builtin: bool }
```

Base furniture is instantiated once per owned lot as `builtin` fixtures —
they carry spatial data for renderers/placement, while their gameplay
(actions, availability) still comes from `data-objects.js`. Bought items are
non-builtin instances; **ownership queries** (`home.isOwned`) scan placed
instances, so buying/selling and the `requires.owns` engine gate all run
through the same records a renderer draws. Footprints and interaction slots
are *derived* from meta at read time — they never go stale inside saves.

## Placement validation

`placement.js` assigns every placeable id a meta record (attached to the defs
as `def.placement`): mount type (floor/wall/ceiling), footprint, snap +
rotation increments, clearance, room restrictions, collision blocking,
interaction clearance, indoor/outdoor rules.

`placement.validate(lot, roomId, id, pos, rotY, ignoreId?)` is the single
authority: room restriction → indoor/outdoor → room bounds → buildable bounds
→ collision (same-mount solids, with clearance margins). `autoPlace` scans a
room at snap increments for the first valid spot (used by Buy and by save
migration). A future drag-and-drop build UI — or a multiplayer server — calls
these same functions.

## Interaction slots and reservations

`slots.js` gives every placed object usable **slots** (offset positions,
rotation-aware; beds have two sides, a fire pit seats four). Before an entity
uses an object it must **reserve** a slot; reservations are serialized in
`state.reservations` keyed `instanceId:slotId`, so two entities can never
hold the same one. The engine reserves for the player on every object action
and releases when the action resolves; `autonomy.tick()` expires stale
non-player holds. When NPCs become autonomous, they reserve through the same
API before walking over — which is also the multiplayer story.

## NPC autonomy (state only, by design)

Every NPC record carries `autonomy`: `autonomyEnabled` (off), `currentGoal`,
`currentAction`, `targetEntityId`, `actionQueue`, `reservedInteractionSlot`.
`autonomy.js` exposes `setGoal / enqueue / reserveSlot / clear / tick`. There
is intentionally **no decision-making** yet — a future behavior system fills
these in without another schema change.

## The rigged character pipeline (CharacterKit)

The player is a **fully rigged humanoid**, not a procedural model. The chain:

```
GLB base body (skinned mesh, humanoid skeleton)
  → body customization   (bone-scale hooks; slider-ready)
  → face customization   (face module on the Head bone + expression rig)
  → hair                 (modular styles on the Head bone)
  → skin                 (tinted physical material)
  → clothing / shoes     (named SkinnedMesh slots — show/hide + tint)
  → accessories          (attach to any bone: jewelry→Chest, phone→Hand)
  → animation            (AnimationMixer: baked pose clip + additive layers)
```

- **Assets** (`assets/characters/base_female.glb`, `base_male.glb`) are
  authored by `tools/build-character-assets.mjs`: a 19-bone humanoid skeleton
  (`Hips Spine Chest Neck Head`, `L/R_Shoulder|UpperArm|LowerArm|Hand`,
  `L/R_UpperLeg|LowerLeg|Foot`), one skinned `Body` mesh with per-vertex
  weights, a modular wardrobe (every `top_*`, `bottom_*`, `dress_*`, `shoe_*`
  as its own named SkinnedMesh on the shared skeleton), and baked animation
  clips (`idle`, `groove`). These are first-generation assets — the runtime
  depends only on bone names and slot names, so Blender-authored GLBs can
  replace them with zero code changes.
- **Runtime** (`src/render/character-rig.js`): `CharacterRig` loads + caches
  the GLB, clones per instance (SkeletonUtils — one asset, many characters),
  equips wardrobe slots, tints materials, attaches accessories to bones,
  bakes the stance into a base pose clip and blends additive animation layers
  over it (`blendTo('groove')` crossfades).
- **Customization = mesh/material swapping.** Outfit presets in
  `data-avatar.js` carry a `slots` manifest (`{top, bottom|dress, shoe}`)
  naming the wardrobe meshes; changing outfits toggles mesh visibility and
  re-tints — the skeleton, body, and animations are untouched.
- The **face + hair modules** and the living expression system ride on the
  `Head` bone, so they follow every animation for free.

## Save versioning

Saves carry `version`. `save.js` runs `MIGRATIONS[n]` steps (v2→v3→…) so old
saves upgrade in place. v2→v3 converts the flat `home.owned[]` list into
placed instances with real positions (preserving old ids), and adds
`lots`, `currentLotId`, `reservations`, and `player.pos`. Saves from *newer*
versions are refused rather than corrupted.
