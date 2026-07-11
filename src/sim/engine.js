// ============================================================================
// engine.js — the action pipeline (the multiplayer-ready core).
//
// Every button in the UI ultimately calls CCS.sim.performAction(id). The engine
// checks requirements, runs any special handler, applies effects (with trait +
// mood multipliers), advances time, logs the feed, emits a 'sim-event' for the
// quest system, rolls random events, re-checks unlocks, recomputes mood, saves.
//
// Nothing about the UI is baked in here — that is deliberate. A network layer
// could call performAction the same way a button does.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};
CCS.sim.handlers = CCS.sim.handlers || {};   // special-action handlers (registered by systems)

// --- Activity feed ---------------------------------------------------------
CCS.sim.feed = function feed(text, icon = '•') {
  const f = CCS.state.feed;
  f.unshift({ t: CCS.sim.time.label(), text, icon, day: CCS.state.time.day });
  if (f.length > 120) f.length = 120;
  CCS.events.emit('feed-changed');
};

// --- Emit a game event (quests + anything else listen) ---------------------
CCS.sim.emitEvent = function emitEvent(ev) {
  CCS.events.emit('sim-event', ev);
};

// --- XP + leveling ---------------------------------------------------------
CCS.sim.grantXp = function grantXp(amount) {
  const p = CCS.state.player;
  p.xp += amount;
  while (p.xp >= CCS.sim.levelXp(p.level)) {
    p.xp -= CCS.sim.levelXp(p.level);
    p.level += 1;
    CCS.sim.feed(`⭐ You reached level ${p.level}!`, '⭐');
    CCS.ui?.toast?.(`⭐ Level ${p.level}!`);
    CCS.events.emit('level-up', p.level);
  }
};

CCS.sim.addSkill = function addSkill(skill, amount) {
  const s = CCS.state;
  let gain = amount;
  const t = s.player.traits;
  const moodMods = CCS.sim.mood.mods();
  if (moodMods[skill]) gain *= moodMods[skill];
  if (skill === 'creativity' && t.includes('Creative')) gain *= 1.3;
  if (skill === 'academics' && t.includes('Bookworm')) gain *= 1.3;
  if (skill === 'charisma' && t.includes('Charismatic')) gain *= 1.25;
  if (s.player.lifePath && CCS.data.lifePathById[s.player.lifePath]?.skill === skill) gain *= 1.15;
  s.skills[skill] = Math.round(((s.skills[skill] || 0) + gain) * 10) / 10;
};

// --- Apply an effects bundle ----------------------------------------------
CCS.sim.applyEffects = function applyEffects(effects = {}, ctx = {}) {
  const s = CCS.state;

  if (effects.needs) {
    for (const [k, v] of Object.entries(effects.needs)) {
      let d = v;
      if (k === 'hunger' && v > 0 && s.player.traits.includes('Foodie')) d *= 1.3;
      if (k === 'social' && v > 0 && s.player.traits.includes('Extrovert')) d *= 1.25;
      s.needs[k] = CCS.util.clamp((s.needs[k] ?? 70) + d, 0, 100);
    }
  }
  if (effects.money) {
    s.player.money = Math.max(0, s.player.money + effects.money);
    if (effects.money > 0 && (ctx.tag === 'work' || ctx.tag === 'business')) {
      s.flags.gigEarnings = (s.flags.gigEarnings || 0) + effects.money;
    }
  }
  if (effects.followers) s.player.followers = Math.max(0, s.player.followers + effects.followers);
  if (effects.skills) for (const [k, v] of Object.entries(effects.skills)) CCS.sim.addSkill(k, v);
  if (effects.xp) {
    let xp = effects.xp;
    if ((ctx.tag === 'work' || ctx.tag === 'study') && s.player.traits.includes('Ambitious')) xp *= 1.2;
    if (CCS.sim.mood.mods().xp) xp *= CCS.sim.mood.mods().xp;
    CCS.sim.grantXp(Math.round(xp));
  }
  if (effects.flags) Object.assign(s.flags, effects.flags);
  if (effects.inc) for (const [k, v] of Object.entries(effects.inc)) s.flags[k] = (s.flags[k] || 0) + v;
  if (effects.petNeeds && s.pets[0]) {
    const pet = ctx.pet || s.pets[0];
    for (const [k, v] of Object.entries(effects.petNeeds)) pet.needs[k] = CCS.util.clamp((pet.needs[k] ?? 70) + v, 0, 100);
    pet.bond = CCS.util.clamp(pet.bond + (effects.petNeeds.affection ? effects.petNeeds.affection / 12 : 0.4), 0, 100);
  }
  if (effects.npcMood && ctx.npc) ctx.npc.mood = CCS.util.clamp((ctx.npc.mood || 60) + effects.npcMood, 0, 100);
  if (effects.item) { s.inventory.push(effects.item); }
  if (effects.moodBias) s.flags._moodBias = (s.flags._moodBias || 0) + effects.moodBias;
};

// --- Requirement check -----------------------------------------------------
CCS.sim.checkRequires = function checkRequires(def) {
  const s = CCS.state, r = def.requires || {};
  const moodMods = CCS.sim.mood.mods();

  if (r.minEnergy != null && s.needs.energy < r.minEnergy) return { ok: false, reason: 'Too tired — get some rest first.' };
  if (moodMods.blockHighEnergy && (def.time >= 3 || (def.effects?.needs?.energy || 0) <= -15))
    return { ok: false, reason: 'You\'re burnt out. Rest before doing something big.' };
  if (r.hasPet && s.pets.length === 0) return { ok: false, reason: 'You need a pet for that. Adopt one first!' };
  if (r.owns && !CCS.sim.home.isOwned(r.owns)) return { ok: false, reason: 'Buy that in Build & Buy first!' };
  if (r.flag && !s.flags[r.flag]) return { ok: false, reason: 'Not available yet.' };
  if (r.money != null && s.player.money < r.money) return { ok: false, reason: 'You can\'t afford that.' };
  if ((def.effects?.money || 0) < 0 && s.player.money + def.effects.money < 0) return { ok: false, reason: 'You can\'t afford that.' };

  if (r.afterHour != null || r.beforeHour != null) {
    if (!CCS.sim.time.inWindow(s.time.hour, r.afterHour, r.beforeHour)) {
      const fmt = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;
      const win = r.afterHour != null && r.beforeHour != null ? `${fmt(r.afterHour)}–${fmt(r.beforeHour)}`
        : r.afterHour != null ? `after ${fmt(r.afterHour)}` : `before ${fmt(r.beforeHour)}`;
      return { ok: false, reason: `Only available ${win}.` };
    }
  }
  // World actions require their world to be unlocked.
  if (def.world && s.worlds[def.world]?.unlocked === false) {
    const w = CCS.data.worldById[def.world];
    return { ok: false, reason: `${w ? w.name : 'That area'} is locked.` };
  }
  return { ok: true };
};

// --- The main entry point --------------------------------------------------
CCS.sim.performAction = function performAction(actionId, ctx = {}) {
  const def = ctx.def || CCS.data.actionById[actionId];
  if (!def) { console.warn('[engine] unknown action', actionId); return { ok: false }; }

  const check = CCS.sim.checkRequires(def);
  if (!check.ok) { CCS.ui?.toast?.(check.reason); return { ok: false, reason: check.reason }; }

  const tag = def.tag;
  let handled = false;

  // Special handlers (career/school/pets/social/etc.) may abort or take over.
  if (def.special && CCS.sim.handlers[def.special]) {
    const res = CCS.sim.handlers[def.special](def, ctx) || {};
    if (res.abort) { CCS.ui?.toast?.(res.reason || 'Can\'t do that right now.'); return { ok: false }; }
    if (res.addEffects) CCS.sim.applyEffects(res.addEffects, { ...ctx, tag });
    if (res.feed) CCS.sim.feed(res.feed, def.emoji || '•');
    if (res.ctx) Object.assign(ctx, res.ctx);
    handled = !!res.handled;
  }

  if (!handled) CCS.sim.applyEffects(def.effects || {}, { ...ctx, tag });

  // Time + counters
  CCS.sim.time.advance(def.time || 1);
  const s = CCS.state;
  s.stats.totalActions += 1;
  s.stats.actionsToday += 1;
  CCS.sim.mood.recompute();
  if (s.mood.score > 70) s.stats.goodMoodActionsToday += 1;

  // Focus/flirty transient flags for the mood classifier.
  if (tag === 'study' || tag === 'work' || tag === 'business') s.flags._focusedRecently = true;
  else s.flags._focusedRecently = false;

  // Feed line (unless the handler/effects already wrote one).
  if (!def._silent) {
    const label = def.label + (def.objectName ? '' : '');
    CCS.sim.feed(`${label}.`, def.emoji || '•');
  }

  // Tell quests + roll world/pack unlocks + random events.
  CCS.sim.emitEvent({ kind: 'action', actionId: def.id, tag });
  CCS.sim.progression.afterAction(def);

  CCS.sim.mood.recompute();
  CCS.sim.save?.();
  CCS.events.emit('state-changed');
  return { ok: true };
};
