// ============================================================================
// save.js — persistence (#15).
//
// The whole game is one serializable object (CCS.state), so saving is just
// JSON in localStorage. Debounced so rapid actions don't thrash storage.
// load() migrates/repairs older or partial saves so updates don't wipe progress.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

const KEY = 'ccs.sim.save';
let saveTimer = null;

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
  if (!data || data.version !== CCS.sim.SAVE_VERSION) {
    console.warn('[save] incompatible save version — starting fresh.');
    return false;
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
