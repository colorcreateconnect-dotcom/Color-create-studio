// ============================================================================
// quests.js — the quest engine (#3).
//
// Listens to 'sim-event', advances any objective whose predicate matches, and
// completes quests — paying rewards and applying unlocks (worlds, packs, more
// quests, flags). Static defs live in data-quests.js; only progress is saved.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.quests = {
  ensure(id) {
    if (!CCS.state.quests[id]) CCS.state.quests[id] = { active: false, completed: false, progress: {} };
    return CCS.state.quests[id];
  },

  isAvailable(def) {
    const rec = this.ensure(def.id);
    if (rec.completed) return false;
    try { return def.available ? !!def.available(CCS.state) : true; } catch { return false; }
  },

  // Quests the player can currently make progress on.
  active() {
    return CCS.data.quests.filter((q) => this.isAvailable(q));
  },

  progressPct(def) {
    const rec = this.ensure(def.id);
    let done = 0, total = 0;
    for (const o of def.objectives) {
      total += o.count;
      done += Math.min(o.count, rec.progress[o.id] || 0);
    }
    return total ? done / total : 0;
  },

  onEvent(ev) {
    for (const def of CCS.data.quests) {
      if (!this.isAvailable(def)) continue;
      const rec = this.ensure(def.id);
      let changed = false;

      for (const o of def.objectives) {
        const cur = rec.progress[o.id] || 0;
        if (cur >= o.count) continue;
        let hit = false;
        try { hit = o.match(ev, CCS.state); } catch { hit = false; }
        if (hit) { rec.progress[o.id] = cur + 1; changed = true; }
      }

      if (changed) {
        const allDone = def.objectives.every((o) => (rec.progress[o.id] || 0) >= o.count);
        if (allDone) this.complete(def);
        else CCS.events.emit('quests-changed');
      }
    }
  },

  complete(def) {
    const rec = this.ensure(def.id);
    if (rec.completed) return;
    rec.completed = true;
    rec.active = false;

    const r = def.rewards || {};
    if (r.xp) CCS.sim.grantXp(r.xp);
    if (r.money) CCS.state.player.money += r.money;
    if (r.followers) CCS.state.player.followers += r.followers;
    if (r.confidence) CCS.state.needs.confidence = CCS.util.clamp(CCS.state.needs.confidence + r.confidence, 0, 100);
    if (r.skills) for (const [k, v] of Object.entries(r.skills)) CCS.sim.addSkill(k, v);
    if (r.item) CCS.state.inventory.push(r.item);

    this.applyUnlocks(def.unlocks || {});

    CCS.state.flags._recentQuestWins = (CCS.state.flags._recentQuestWins || 0) + 1;
    CCS.state.flags._moodBias = (CCS.state.flags._moodBias || 0) + 6;

    CCS.sim.feed(`✅ Quest complete: “${def.title}”`, '✅');
    CCS.ui?.toast?.(`✅ Quest complete: ${def.title}`);
    CCS.events.emit('quests-changed');
    CCS.sim.mood.recompute();
  },

  applyUnlocks(u) {
    if (u.flags) Object.assign(CCS.state.flags, u.flags);
    if (u.inc) for (const [k, v] of Object.entries(u.inc)) CCS.state.flags[k] = (CCS.state.flags[k] || 0) + v;

    if (u.worlds) for (const id of u.worlds) CCS.sim.worlds.unlock(id, 'quest reward');
    if (u.packs) for (const id of u.packs) CCS.sim.progression.unlockPack(id, 'quest reward');
    if (u.npcs) for (const id of u.npcs) CCS.sim.npc.discover(id);
    if (u.quests) for (const id of u.quests) {
      this.ensure(id);
      const q = CCS.data.questById[id];
      if (q && this.isAvailable(q)) { CCS.sim.feed(`🗒️ New quest: “${q.title}”`, '🗒️'); }
    }
    // Flags changed — a world/pack may now qualify.
    CCS.sim.progression.checkUnlocks();
  },
};

// Wire the engine's events into the quest system.
CCS.sim.quests.init = function init() {
  CCS.events.on('sim-event', (ev) => CCS.sim.quests.onEvent(ev));
};
