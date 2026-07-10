# 🎨 Color Create Studio

A **moddable, online life-simulation game** — think *The Sims* gameplay, an
easy *mod system* baked in, and a *GTA-Online-style* shared world where you and
your friends hang out in the same house in real time.

It runs entirely in the browser. No game engine to install, no build step.

---

## ▶️ Play it (3 steps)

You need [Node.js](https://nodejs.org) installed (v18+). Then, in this folder:

```bash
npm install      # one-time: downloads the tiny multiplayer library
npm start        # starts the game + multiplayer server
```

Open **http://localhost:3000** in your browser. That's it — you're playing.

> The game also works fully single-player. Multiplayer + mods just need the
> server running (which `npm start` does for you).

---

## 🎮 How to play

- **Move:** `W` `A` `S` `D` or the arrow keys.
- **Do something:** walk up to a glowing object and press **`E`** (eat at the
  fridge, sleep in the bed, shower, watch TV, work at the computer…).
- **Stop early:** press **`Esc`**.
- Keep your **needs** (hunger, energy, fun…) topped up — if they drop, your
  Sim's **mood** drops with them. Working at the computer earns 💰.

---

## 🔧 The three pillars

### 1. The Sims part — life simulation
Your Sim has needs that drain over time, furniture that refills them, money, a
day/night clock, and a mood that reflects how well you're taking care of them.
It's all in `src/needs.js`, `src/world.js`, and `src/entity.js`.

### 2. The mods part
Turn mods on and off live from the **Mods panel** on the left. The game ships
with five example mods (money cheat, super speed, a hot tub, a coffee-addiction
system that adds a *new need*, and a hard mode). **Making your own mod is a
single small file** — see [`mods/README.md`](mods/README.md).

### 3. The GTA-Online part — play together
Type a **room name**, click **Go Online**, and share that room name with
friends. Everyone in the same room sees each other move around the same house
in real time, with live chat. Powered by `server/server.js` + `src/net.js`.

---

## 🗂️ Project layout

```
index.html            The game page (loads everything, holds the layout/CSS)
package.json          Project + the one dependency (ws) and the start script
server/
  server.js           Serves the game AND runs the multiplayer world
src/
  core.js             Shared namespace (CCS), event bus, helpers
  needs.js            The needs system (hunger, energy, …)
  world.js            The lot: floor, walls, furniture + interactions
  entity.js           Your Sim (movement, using objects, money)
  render.js           Draws everything to the canvas
  input.js            Keyboard controls
  mods.js             The mod loader + the API mods plug into
  net.js              Multiplayer client (syncs players, chat)
  ui.js               The HUD: needs bars, mods panel, chat, toasts
  game.js             Boots the game and runs the main loop
mods/
  manifest.json       The list of mods to load
  *.js                The example mods (copy one to make your own!)
```

---

## 🌐 Playing with friends over the internet

Out of the box, "online" means everyone on **your local network** (same Wi-Fi)
can join via your computer's local IP (e.g. `http://192.168.1.20:3000`).

To play with friends anywhere, host `server/server.js` on any Node-friendly
host (Render, Railway, Fly.io, a VPS, etc.) and share that URL. The client
auto-detects `ws://` vs `wss://`, so it works behind HTTPS too.

---

## 🚧 What this is (and isn't)

This is a genuine, playable **foundation** — the real core loop of a life sim,
a working mod system, and working real-time multiplayer. It is intentionally
small and readable so it's easy to grow.

It is **not** (yet) a photorealistic 3D world with hundreds of hours of
content — that's the long road we can build along from here. Natural next
steps: build/buy mode (place your own furniture), multiple rooms/lots,
relationships between Sims, careers, a proper save system, and richer art.

---

## 📜 License

MIT — do whatever you like with it.
