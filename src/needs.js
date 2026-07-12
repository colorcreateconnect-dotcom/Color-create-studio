// ============================================================================
// needs.js — the heart of the "Sims" feeling.
//
// Your Sim has a set of needs (hunger, energy, fun...) that slowly drain over
// time. Objects in the world refill them. When needs get low, mood drops.
//
// Needs are stored in a registry so mods can add brand-new needs.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

// Each need: value 0..100 (100 = fully satisfied), and a decay rate per minute.
CCS.needsDef = {
  hunger:  { label: 'Hunger',  emoji: '🍔', decay: 0.45, color: '#ff8f6b' },
  energy:  { label: 'Energy',  emoji: '⚡', decay: 0.30, color: '#ffd76b' },
  hygiene: { label: 'Hygiene', emoji: '🧼', decay: 0.28, color: '#6bd0ff' },
  bladder: { label: 'Bladder', emoji: '🚽', decay: 0.55, color: '#b9e56b' },
  fun:     { label: 'Fun',     emoji: '🎉', decay: 0.35, color: '#e08bff' },
  social:  { label: 'Social',  emoji: '💬', decay: 0.25, color: '#8bffcf' },
};

CCS.needs = {
  // Register a new need type at runtime (used by mods).
  define(key, def) {
    CCS.needsDef[key] = { label: key, emoji: '❔', decay: 0.3, color: '#cccccc', ...def };
    // Seed the value on the local player if they already exist.
    if (CCS.player && CCS.player.needs[key] == null) CCS.player.needs[key] = 80;
    CCS.events.emit('needs-def-changed', key);
  },

  // Fresh set of needs for a new Sim (everyone starts comfortable).
  fresh() {
    const out = {};
    for (const key of Object.keys(CCS.needsDef)) out[key] = 75 + Math.random() * 15;
    return out;
  },

  // Drain all needs by however many in-game minutes passed.
  decay(needs, minutes) {
    for (const [key, def] of Object.entries(CCS.needsDef)) {
      if (needs[key] == null) needs[key] = 80;
      needs[key] = CCS.util.clamp(needs[key] - def.decay * minutes, 0, 100);
    }
  },

  // Overall wellbeing 0..100 (average of all needs).
  average(needs) {
    const vals = Object.keys(CCS.needsDef).map((k) => needs[k] ?? 80);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },

  // Turn wellbeing into a mood face + label.
  mood(needs) {
    const avg = CCS.needs.average(needs);
    if (avg >= 80) return { emoji: '😄', label: 'Great' };
    if (avg >= 60) return { emoji: '🙂', label: 'Fine' };
    if (avg >= 40) return { emoji: '😐', label: 'Meh' };
    if (avg >= 20) return { emoji: '😟', label: 'Sad' };
    return { emoji: '😫', label: 'Miserable' };
  },
};
