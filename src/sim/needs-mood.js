// ============================================================================
// needs-mood.js — wellbeing + the mood classifier (#6).
//
// Mood is derived from needs, traits, pet bond, relationships, recent events
// and quest momentum. The resulting mood STATE feeds outcome modifiers that
// change how well actions go (Inspired → more creativity, Burnt Out → blocks
// high-energy tasks, etc.).
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.mood = {
  // 0..100 overall wellbeing. Stress counts inverted.
  wellbeing() {
    const n = CCS.state.needs;
    let sum = 0, count = 0;
    for (const [key, def] of Object.entries(CCS.sim.NEEDS)) {
      const v = n[key] ?? 70;
      sum += def.dir > 0 ? v : (100 - v);
      count++;
    }
    let score = sum / count;

    // Bonds & momentum nudge the baseline.
    const s = CCS.state;
    if (s.pets.length) score += Math.min(8, s.pets.reduce((a, p) => a + p.bond, 0) / 20);
    const rel = Object.values(s.npcs);
    if (rel.length) score += Math.min(8, rel.reduce((a, n2) => a + Math.max(0, n2.score || 0), 0) / 60);
    score += Math.min(6, (s.flags._recentQuestWins || 0) * 2);
    score += (s.flags._moodBias || 0); // transient event bias, decays over time

    return CCS.util.clamp(score, 0, 100);
  },

  // Pick the mood STATE from need patterns + score (priority order).
  classify() {
    const n = CCS.state.needs;
    const score = this.wellbeing();
    const s = CCS.state;

    let state = 'Happy';
    if (n.energy < 20 || n.stress > 82) state = 'Burnt Out';
    else if (n.stress > 62) state = 'Stressed';
    else if (n.confidence < 24) state = 'Embarrassed';
    else if (n.social < 24) state = 'Lonely';
    else if (n.fun < 24) state = 'Bored';
    else if (s.flags._flirtyUntil && s.time.day <= s.flags._flirtyUntil) state = 'Flirty';
    else if (n.confidence > 78 && score > 62) state = 'Confident';
    else if (n.energy > 62 && n.stress < 40 && (s.flags._focusedRecently)) state = 'Focused';
    else if (score > 78 && n.fun > 55) state = 'Inspired';
    else if (score > 60) state = 'Happy';
    else state = 'Bored';

    return { state, score };
  },

  recompute() {
    // Let transient biases fade.
    const s = CCS.state;
    if (s.flags._moodBias) s.flags._moodBias *= 0.9;
    if (Math.abs(s.flags._moodBias || 0) < 0.5) s.flags._moodBias = 0;

    const m = this.classify();
    s.mood.state = m.state;
    s.mood.score = Math.round(m.score);
    return s.mood;
  },

  // Outcome modifiers for the current mood (used by the engine).
  mods() {
    return (CCS.data.moods[CCS.state.mood.state] || {}).mods || {};
  },
};
