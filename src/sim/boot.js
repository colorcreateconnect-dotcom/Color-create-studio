// ============================================================================
// boot.js — start everything up.
//
// Load a save (or make a fresh one), initialize the systems, wire the quest
// engine, and hand off to the UI. First-time players get a create screen.
// ============================================================================

/* CCS is the shared global from core.js */

function boot() {
  // Quest engine listens for game events.
  CCS.sim.quests.init();

  // Load or create the world.
  const loaded = CCS.sim.load();
  if (!loaded) CCS.state = CCS.sim.newState();

  // Make sure structural bits exist, then settle initial unlocks + mood.
  CCS.sim.worlds.ensureAll();
  CCS.sim.lots.ensureAll();   // lots, rooms, fixtures, player world position
  CCS.sim.home.ensure();
  CCS.sim.npc.ensure('maya');
  CCS.sim.progression.checkUnlocks();
  CCS.sim.mood.recompute();

  // Pick the renderer (contract in src/render/renderer.js). The DOM renderer
  // is the default; a Three.js implementation swaps in here later.
  CCS.renderer.use('dom');

  CCS.ui.init();

  // First run → create screen (can't be dismissed until they start).
  if (!CCS.state.flags._created) {
    CCS.ui.openModal('create', { locked: true });
  }

  CCS.sim.save(true);
  console.log('%cColor Create Studio — Life Sim ready', 'color:#e08bff;font-weight:bold');
}

window.addEventListener('DOMContentLoaded', boot);
