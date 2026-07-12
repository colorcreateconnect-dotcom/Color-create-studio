// ============================================================================
// save.js — persistence + migrations (#15, architecture #9).
//
// The whole game is one serializable object (CCS.state), so saving is just
// JSON in localStorage. Debounced so rapid actions don't thrash storage.
//
// Saves carry a version. load() runs MIGRATIONS step-by-step (v2→v3→…) so
// old saves upgrade in place instead of being discarded, then repairs any
// missing fields against the current default shape.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

const KEY = 'ccs.sim.save';
let saveTimer = null;

// ---------------------------------------------------------------------------
// Migrations: MIGRATIONS[n] upgrades a version-n save to version n+1.
// ---------------------------------------------------------------------------
const MIGRATIONS = {
  // v2 → v3: world-coordinate architecture.
  //  - home.owned [{iid, catId, room}] → placed instances on the home lot with
  //    real world positions (auto-placed inside their room), preserving iids.
  //  - adds lots / currentLotId / reservations; player gets a world pos later
  //    (lots.ensureAll at boot fills spawn + builtin fixtures).
  2: (s) => {
    s.lots = s.lots || {};
    s.currentLotId = s.currentLotId || 'home_lot';
    s.reservations = s.reservations || {};

    const homeDef = CCS.data.lotById.home_lot;
    if (!s.lots.home_lot) s.lots.home_lot = CCS.sim.lots.freshLotState(homeDef);
    const lot = s.lots.home_lot;

    const legacyOwned = Array.isArray(s.home?.owned) ? s.home.owned : [];
    // Temporarily point CCS.state at the migrating save so placement helpers
    // (which read CCS.state) can validate against it.
    const prev = CCS.state;
    CCS.state = s;
    try {
      for (const o of legacyOwned) {
        if (!CCS.data.catalogById[o.catId]) continue;
        const roomId = homeDef.rooms.some((r) => r.roomId === o.room) ? o.room : homeDef.rooms[0].roomId;
        const pos = CCS.sim.placement.autoPlace(lot, roomId, o.catId);
        const inst = CCS.sim.lots.makeInstance(o.catId, 'home_lot', roomId, pos);
        if (o.iid) inst.instanceId = o.iid; // keep old ids stable for anything holding one
        lot.placed.push(inst);
      }
    } finally {
      CCS.state = prev;
    }
    s.home = { theme: s.home?.theme || 'cozy' };
    return s;
  },
};

CCS.sim.save = function save(immediate = false) {
  if (!CCS.state || !CCS.sim.config.autosave) return;
  clearTimeout(saveTimer);
  const doSave = () => {
    try { localStorage.setItem(KEY, JSON.stringify(CCS.state)); }
    catch (e) { console.warn('[save] failed', e); }
  };
  if (immediate) doSave(); else saveTimer = setTimeout(doSave, 400);
};

CCS.sim.hasSave = function hasSave() { return !!localStorage.getItem(KEY); };

CCS.sim.load = function load() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (!raw) return false;

  let data;
  try { data = JSON.parse(raw); } catch { return false; }
  if (!data || typeof data.version !== 'number') return false;
  if (data.version > CCS.sim.SAVE_VERSION) {
    console.warn('[save] save is from a NEWER version — starting fresh to avoid corruption.');
    return false;
  }

  // Walk the migration chain up to the current version.
  while (data.version < CCS.sim.SAVE_VERSION) {
    const step = MIGRATIONS[data.version];
    if (!step) { console.warn(`[save] no migration from v${data.version} — starting fresh.`); return false; }
    try { data = step(data) || data; } catch (e) { console.error('[save] migration failed', e); return false; }
    data.version += 1;
    console.info(`[save] migrated save to v${data.version}`);
  }

  // Repair against the default shape so new fields don't crash old saves.
  CCS.state = deepDefaults(data, CCS.sim.newState({ name: data.player?.name }));
  return true;
};

CCS.sim.reset = function reset() {
  try { localStorage.removeItem(KEY); } catch {}
  CCS.state = null;
};

CCS.sim.exportSave = function exportSave() { return JSON.stringify(CCS.state); };

// Fill any missing keys on `obj` from `def` (recursively, objects only).
function deepDefaults(obj, def) {
  if (Array.isArray(def)) return Array.isArray(obj) ? obj : def;
  if (def && typeof def === 'object') {
    const out = obj && typeof obj === 'object' ? obj : {};
    for (const k of Object.keys(def)) out[k] = deepDefaults(out[k], def[k]);
    return out;
  }
  return obj === undefined ? def : obj;
}
