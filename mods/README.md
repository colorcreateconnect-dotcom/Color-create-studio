# 🔧 Making your own mods

A mod is just a small `.js` file in this folder. To make one:

1. Create a file, e.g. `mods/my-cool-mod.js`.
2. Add it to `manifest.json` so the game loads it:
   ```json
   [
     { "file": "money-cheat.js" },
     { "file": "my-cool-mod.js" }
   ]
   ```
3. Refresh the game. Your mod appears in the **Mods panel** with an on/off
   switch. Turning it off cleanly undoes everything it did.

---

## The shape of a mod

```js
CCS.registerMod({
  id: 'my-cool-mod',            // unique id (no spaces)
  name: 'My Cool Mod',          // shown in the panel
  icon: '✨',                   // any emoji
  version: '1.0.0',
  author: 'Your Name',
  description: 'What it does, in one sentence.',

  onEnable(api) {
    // runs when the player switches the mod ON
  },

  onDisable(api) {
    // optional — runs when switched OFF
    // (most things you add via `api` are auto-removed for you)
  },
});
```

## What `api` gives you

| Call | What it does |
|------|--------------|
| `api.player` | The Sim the player controls (read `.needs`, `.money`, `.x`, `.y`…) |
| `api.addObject(def)` | Add a new piece of furniture (see below) |
| `api.addNeed(key, def)` | Add a brand-new need bar |
| `api.setNeedDecay(need, rate)` | Change how fast a need drains |
| `api.setConfig(key, value)` | Tweak a game setting (e.g. `playerSpeed`) |
| `api.addMoney(n)` | Give (or take, with a negative) money |
| `api.on(event, fn)` | Listen to game events (`tick`, `interact-finish`, …) |
| `api.everyGameMinutes(mins, fn)` | Run something on a repeating in-game timer |
| `api.notify(text)` | Pop up a little message |

Everything you add through `api` is automatically torn down when the mod is
disabled — no cleanup code required.

## Adding furniture

```js
api.addObject({
  id: 'arcade',
  name: 'Arcade Machine',
  emoji: '🕹️',
  col: 5, row: 5, w: 1, h: 1,        // position + size in tiles
  action: {
    label: 'Play',                    // the "Press E · Play" prompt
    duration: 3,                      // seconds it takes
    verb: 'gaming 🕹️',                // shown above the Sim
    effects: { fun: +70, energy: -10 }, // needs it changes
    cost: 2,                          // optional: money it costs
    earn: 0,                          // optional: money it pays
  },
});
```

## Events you can listen to

- `tick` — every frame: `{ dt, gameMinutes, clock }`
- `interact-start` / `interact-finish` / `interact-cancel` — `{ player, obj }`
- `need-changed`, `object-added`, `mod-toggled`, `render`

Copy any file in this folder as a starting point — `money-cheat.js` is the
simplest, `coffee-addiction.js` shows off nearly everything.
