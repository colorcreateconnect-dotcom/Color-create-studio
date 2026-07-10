// ============================================================================
// mods.js — the mod system.
//
// A mod is just a small file that calls CCS.registerMod({...}). When you turn a
// mod ON, its onEnable(api) runs; when you turn it OFF, everything it added is
// cleanly removed again. This is what makes the game feel like "Sims with mods".
//
// Mods are listed in /mods/manifest.json and loaded at startup.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.modManager = (() => {
  const registry = new Map();        // id -> mod definition
  const disposers = new Map();       // id -> array of cleanup fns
  const STORAGE = 'ccs.enabledMods';

  function enabledSet() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE) || '[]')); }
    catch { return new Set(); }
  }
  function saveEnabled(set) {
    localStorage.setItem(STORAGE, JSON.stringify([...set]));
  }

  // The toolbox handed to each mod. Anything a mod adds through here can be
  // undone automatically when the mod is disabled.
  function makeApi(modId) {
    const cleanup = disposers.get(modId);
    return {
      CCS,
      get player() { return CCS.player; },

      // Subscribe to a game event; auto-unsubscribed when the mod is disabled.
      on(event, fn) {
        const off = CCS.events.on(event, fn);
        cleanup.push(off);
        return off;
      },

      // Run fn every N in-game minutes (great for "over time" effects).
      everyGameMinutes(minutes, fn) {
        let acc = 0;
        const off = CCS.events.on('tick', ({ gameMinutes }) => {
          acc += gameMinutes;
          while (acc >= minutes) { acc -= minutes; fn(); }
        });
        cleanup.push(off);
        return off;
      },

      // Add furniture. Automatically removed on disable.
      addObject(def) {
        CCS.world.addObject(def);
        cleanup.push(() => CCS.world.removeObject(def.id));
      },

      // Add a brand-new need type.
      addNeed(key, def) {
        CCS.needs.define(key, def);
        cleanup.push(() => { delete CCS.needsDef[key]; CCS.events.emit('needs-def-changed', key); });
      },

      // Temporarily override a config value (restored on disable).
      setConfig(key, value) {
        const prev = CCS.config[key];
        CCS.config[key] = value;
        cleanup.push(() => { CCS.config[key] = prev; });
      },

      // Temporarily change how fast a need drains.
      setNeedDecay(need, rate) {
        if (!CCS.needsDef[need]) return;
        const prev = CCS.needsDef[need].decay;
        CCS.needsDef[need].decay = rate;
        cleanup.push(() => { if (CCS.needsDef[need]) CCS.needsDef[need].decay = prev; });
      },

      addMoney(n) { if (CCS.player) CCS.player.money += n; },
      notify(msg) { CCS.ui?.toast(msg); },
      util: CCS.util,
    };
  }

  function registerMod(def) {
    if (!def || !def.id) return console.warn('[mods] mod missing id', def);
    def.name = def.name || def.id;
    def.version = def.version || '1.0.0';
    registry.set(def.id, def);
    disposers.set(def.id, []);
    CCS.events.emit('mod-registered', def);
  }

  function enable(id) {
    const mod = registry.get(id);
    if (!mod || mod._enabled) return;
    disposers.set(id, []);
    try { mod.onEnable?.(makeApi(id)); }
    catch (err) { console.error(`[mod:${id}] enable failed`, err); }
    mod._enabled = true;
    const set = enabledSet(); set.add(id); saveEnabled(set);
    CCS.events.emit('mod-toggled', { id, enabled: true });
    CCS.ui?.toast(`🔧 Enabled: ${mod.name}`);
  }

  function disable(id) {
    const mod = registry.get(id);
    if (!mod || !mod._enabled) return;
    try { mod.onDisable?.(makeApi(id)); }
    catch (err) { console.error(`[mod:${id}] disable failed`, err); }
    for (const fn of (disposers.get(id) || [])) { try { fn(); } catch {} }
    disposers.set(id, []);
    mod._enabled = false;
    const set = enabledSet(); set.delete(id); saveEnabled(set);
    CCS.events.emit('mod-toggled', { id, enabled: false });
    CCS.ui?.toast(`⭕ Disabled: ${mod.name}`);
  }

  function toggle(id) {
    const mod = registry.get(id);
    if (mod?._enabled) disable(id); else enable(id);
  }

  function list() { return [...registry.values()]; }
  function isEnabled(id) { return !!registry.get(id)?._enabled; }

  // Load every mod file listed in the manifest, then auto-enable the ones the
  // player had turned on last time.
  async function loadFromManifest() {
    let manifest = [];
    try {
      const res = await fetch('mods/manifest.json', { cache: 'no-store' });
      manifest = await res.json();
    } catch {
      console.warn('[mods] no manifest found (run via the server to load mods).');
      return;
    }
    await Promise.all(manifest.map((entry) => loadScript(`mods/${entry.file}`)));

    const wanted = enabledSet();
    for (const id of wanted) if (registry.has(id)) enable(id);
    CCS.events.emit('mods-loaded');
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { console.warn('[mods] failed to load', src); resolve(); };
      document.head.appendChild(s);
    });
  }

  return { registerMod, enable, disable, toggle, list, isEnabled, loadFromManifest };
})();

// Public shorthand that mod files call.
CCS.registerMod = (def) => CCS.modManager.registerMod(def);
