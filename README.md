# 🎨 Color Create Studio — Life Sim

A **moddable, data-driven life-simulation game** in the browser. Build a Sim,
keep them alive and thriving, take on quests, grow friendships (that actually
*remember* you), pick careers, go to school, adopt pets, and unlock a whole map
of new worlds as you progress.

It runs with **no build step and no game engine**. Everything is plain
JavaScript over one serializable game state — which is the groundwork for
online/social play later (see *Multiplayer-readiness* below).

---

## ▶️ Play it

You need [Node.js](https://nodejs.org) (v18+). Then:

```bash
npm install
npm start
```

Open **http://localhost:3000**. Make your Sim and start living.

> It also opens straight from `index.html` if you prefer — but running the
> server lets the (preserved) classic walk-around mode load its content too.

---

## 🎮 How it plays

- It's **tap-based and mobile-first** — 8 tabs along the bottom.
- **Do things** on the **Home** tab (sleep, eat, shower, post content, work…).
  Every action costs **time** and shifts your **needs**.
- Keep your 8 needs healthy — they drive your **mood**, and mood changes how
  well actions go (Inspired boosts creativity, Burnt Out blocks big tasks…).
- Follow **Quests** to unlock careers, worlds, pets and new storylines.
- Everything **auto-saves** to your browser. Reset anytime from the `⋯` menu.

### The tabs
| Tab | What's there |
|-----|--------------|
| 🏠 Home | Your place, by room + everyday actions; **🛠️ Build & Buy** |
| 🧍 Sim | Your **3D character** + ✨ Style Studio, needs, skills, traits, XP |
| 🗺️ World | 11 worlds; locked ones show how to unlock them |
| 💼 Life | Careers (10 ladders) + School (6 majors) |
| 💞 Social | NPCs, relationships, and their memories of you |
| 🐾 Pets | Adopt & care for dogs/cats/bunnies |
| 🗒️ Quests | Active objectives, progress, rewards |
| 📰 Feed | Your life's activity log |

---

## 🧩 The systems (all data-driven)

1. **Worlds & unlocks** — 11 areas (Home, Pet Park, Campus, Career/Fashion/
   Fame/Nightlife/Business Districts, Travel Hub, Wedding World, Wellness
   Retreat), each with its own unlock rule shown on the locked card.
2. **Pets** — adopt, 4 pet needs, bonding, 5 care actions, cute random events.
3. **Quests** — a modular engine: objectives with predicates, rewards, and
   unlocks that chain into new questlines.
4. **NPCs** — roles, personalities, schedules, and live friendship/romance/
   trust/jealousy scores.
5. **NPC memory** — NPCs remember how you treat them; memories bias future
   interactions (flirting a stranger flops and leaves an awkward memory).
6. **Deep needs & mood** — 8 needs feed a 10-state mood model that modifies
   action outcomes.
7. **Time & schedule** — day-of-week + clock; actions cost hours, needs decay
   hourly, and some content is time-gated (nightlife after 7pm, classes 8–3…).
8. **Careers** — 10 careers, each a 5-tier ladder with pay, schedules,
   promotion requirements, and skill gates.
9. **School** — enroll in a major; attend class, study, sit exams, track grades.
10. **Objects & Build/Buy** — modular home objects, plus a **Build & Buy**
    catalog: purchase furniture for new activities, hobby gear that trains new
    skills (fitness, music, art), and **decor that raises home "ambiance"** —
    which keeps your Environment need high. Furniture is grouped into **rooms**
    with a little room preview, and everything can be sold back.
11. **Random events** — life happens, triggered by time, mood, pets, career, etc.
12. **Expansion packs** — 10 content packs that unlock as you progress.
13. **Multiplayer-readiness** — see below.
14. **Tabbed UI** — mobile-first, neon-glam.
15. **Save system** — versioned saves with a step-by-step migration chain
    (old saves upgrade in place, never wiped).
16. **World & renderer architecture** — lots with room graphs, world
    coordinates (X/Y/Z), placed furniture instances with transforms,
    placement validation, interaction-slot reservations, NPC autonomy state,
    and a renderer-neutral contract (DOM renderer today, Three.js later).
    **Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the full map.
17. **Rigged 3D character + Style Studio** — your Sim is a fully rigged
    humanoid: a skinned GLB body (female + male bases) on a 19-bone skeleton,
    with modular clothing/shoes as named mesh slots, face + hair modules on
    the Head bone, and an AnimationMixer with a real motion suite — walk,
    dance, wave, and a breathing idle — crossfaded over the signature pose
    (Motion chips in Style Studio). The stage uses image-based environment
    lighting, soft cast shadows, and micro-surface fabric/skin detail. Customization swaps meshes and materials — nothing is
    rebuilt from primitives. Assets are authored by
    `tools/build-character-assets.mjs` and live in `assets/characters/`;
    studio-authored GLBs can replace them with no code changes. The
    ✨ Style Studio customizes skin tone (6), hair (6 styles, 7 colors) and
    outfit presets — all data-driven, all saved.

---

## 🌐 Multiplayer-readiness (not built yet — by design)

This upgrade deliberately does **not** add online play, but it's structured so
that it can be added later without a rewrite:

- **One serializable state** (`CCS.state`) — player / world / NPC / quests /
  event-log are cleanly separated and JSON-safe.
- **Action handlers are decoupled from the UI.** Every button just calls
  `CCS.sim.performAction(id)`. A network layer could call the exact same entry
  point. Nothing game-logical lives in click handlers.
- **Data-driven content** (worlds/careers/NPCs/quests/objects/events/packs are
  data tables), so shared/authoritative content is easy to sync.

The original real-time **multiplayer server still ships** (`server/server.js`)
and powers the preserved 🕹️ **classic walk-around mode** (`classic.html`,
linked from the Sim tab) — so nothing that worked before was thrown away.

---

## 🗂️ Project layout

```
index.html              The life sim (mobile-first tabbed UI)
classic.html            The original canvas walk-around game (preserved)
src/core.js             Shared namespace (CCS), event bus, helpers
src/sim/
  state.js              The single serializable game state + factory
  data-worlds.js        Worlds + unlock rules
  data-careers.js       Career ladders + school majors
  data-npcs.js          NPC cast + interaction catalog
  data-objects.js       Home objects + the full action catalog
  data-catalog.js       Build & Buy catalog (furniture, hobby gear, decor)
  data-quests.js        Quest definitions (objectives/rewards/unlocks)
  data-events-packs.js  Random events, expansion packs, moods, traits
  time.js               Clock, schedule, hourly decay
  needs-mood.js         Wellbeing + mood classifier
  engine.js             performAction pipeline (effects/xp/requirements)
  quests.js             Quest engine
  npc.js                Relationships + memory
  progression.js        Careers, school, pets, unlocks, events
  coords.js             World coordinate system (X/Y/Z) + legacy migration
  data-lots.js          Lot definitions + room graphs
  lots.js               Lot runtime: placed instances, room styles, scenes
  placement.js          Placement rules + validation (footprints, mounts…)
  slots.js              Interaction slots + reservations
  autonomy.js           NPC autonomy state + interfaces (no AI yet)
  home.js               Build & Buy: buying/selling, backed by placed instances
  save.js               Versioned save/load with migration chain
  ui.js                 The tabbed interface
  boot.js               Startup
src/render/
  renderer.js           Renderer-neutral contract + registry
  renderer-dom.js       Top-down DOM renderer (default)
  renderer-three-stub.js  Placeholder for the future Three.js lot renderer
  avatar3d.js           Character viewer: stage, face/hair modules, expressions
  character-rig.js      CharacterRig: GLB loading, slots, tints, animation
assets/characters/      Rigged GLB bodies + modular wardrobe (generated)
tools/
  build-character-assets.mjs   Authors the rigged character GLBs
vendor/
  three.module.js + three.core.js   Vendored Three.js (no CDN needed)
  loaders/ + utils/     Vendored GLTFLoader, SkeletonUtils, BufferGeometryUtils
docs/
  ARCHITECTURE.md       Simulation vs renderer, lots, rooms, placement, slots
src/ (bed.js, world.js, …)  Classic-mode modules (unchanged)
server/server.js        Static + realtime server (for classic mode)
mods/                   Classic-mode example mods
```

---

## 🔧 Extending it

Because content is data, adding to the game is mostly editing a data table:

- **New action/object** → add to `src/sim/data-objects.js`.
- **New buyable furniture/decor** → add to `src/sim/data-catalog.js` (its
  actions auto-register and only work once bought).
- **New quest** → add to `src/sim/data-quests.js` (objectives are predicates).
- **New world / career / NPC / event / pack** → the matching `data-*.js`.

No wiring required — the engine, quest system and UI pick it up automatically.

---

## 📜 License

MIT.
