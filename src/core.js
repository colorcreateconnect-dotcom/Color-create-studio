// ============================================================================
// core.js — the shared namespace that everything (including mods) hangs off of.
//
// Everything in the game lives under the global `CCS` object. Mods talk to the
// game through `CCS` too, so keeping one clean namespace is what makes the game
// moddable.
// ============================================================================

const CCS = (window.CCS = window.CCS || {});

CCS.version = '0.1.0';

// --- Config knobs (mods are allowed to change these) -----------------------
CCS.config = {
  tileSize: 40,
  cols: 20,
  rows: 15,
  playerSpeed: 130,        // pixels per second
  interactRange: 44,       // how close you must stand to use an object
  gameMinutesPerSecond: 6, // one real second = 6 in-game minutes (~4 min/day)
};

// --- Tiny event bus --------------------------------------------------------
// Lets different systems (and mods) react to things like 'tick', 'interact',
// 'need-changed' without being wired directly together.
CCS.events = (() => {
  const listeners = new Map();
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn); // returns an "off" fn
    },
    off(name, fn) {
      listeners.get(name)?.delete(fn);
    },
    emit(name, payload) {
      const set = listeners.get(name);
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(payload); } catch (err) { console.error(`[event:${name}]`, err); }
      }
    },
  };
})();

// --- Small helpers ---------------------------------------------------------
CCS.util = {
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  randId: () => Math.random().toString(36).slice(2, 9),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  // Nice random pastel-ish color for a new player
  randColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h} 70% 62%)`;
  },
};

// A place mods can stash their own data without stepping on the game.
CCS.modData = {};

console.log(`%cColor Create Studio v${CCS.version}`, 'color:#7cc6ff;font-weight:bold');
