// ============================================================================
// npc.js — NPCs, relationships, and memory (#4/#5).
//
// Each interaction weighs the relationship, your mood, your charisma, the NPC's
// personality, and — crucially — their MEMORIES of you. A flirt at low
// friendship flops and leaves an awkward memory; kindness builds trust that
// makes future interactions land better.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.npc = {
  // Create the live relationship record from the static seed.
  ensure(id) {
    const def = CCS.data.npcById[id];
    if (!def) return null;
    if (!CCS.state.npcs[id]) {
      CCS.state.npcs[id] = {
        discovered: false, friendship: 0, romance: 0, trust: 0, jealousy: 0,
        mood: 60, score: 0, memories: [], ...def.seed,
      };
      this.recomputeScore(id);
    }
    // Autonomy record (architecture #8) — state only, no AI behavior yet.
    CCS.sim.autonomy?.ensure(CCS.state.npcs[id]);
    return CCS.state.npcs[id];
  },

  discover(id) {
    const n = this.ensure(id);
    const def = CCS.data.npcById[id];
    if (n && !n.discovered) {
      n.discovered = true;
      CCS.sim.feed(`🤝 You met ${def.name} (${def.role}).`, def.emoji);
    }
    return n;
  },

  recomputeScore(id) {
    const n = CCS.state.npcs[id];
    n.score = Math.round(CCS.util.clamp(n.friendship + n.romance * 0.4 + n.trust * 0.3 - n.jealousy * 0.4, -50, 100));
    return n.score;
  },

  friendLabel(n) {
    if (n.friendship >= 70) return 'Best Friend';
    if (n.friendship >= 45) return 'Good Friend';
    if (n.friendship >= 20) return 'Friend';
    if (n.friendship >= 5) return 'Acquaintance';
    if (n.friendship < -5) return 'On the outs';
    return 'Just met';
  },
  romanceLabel(n) {
    if (n.romance >= 80) return '💍 In love';
    if (n.romance >= 50) return '💞 Dating';
    if (n.romance >= 25) return '💘 Crushing';
    if (n.romance >= 10) return '✨ Spark';
    return '';
  },

  // Sum of memory sentiment (recent memories weigh more) — steers outcomes.
  memoryBias(n, tag) {
    let bias = 0;
    for (const m of n.memories) {
      let w = m.sentiment;
      if (tag && m.tag === tag) w *= 1.5;
      bias += w;
    }
    return CCS.util.clamp(bias * 0.02, -0.35, 0.35);
  },

  addMemory(n, mem) {
    if (!mem) return;
    n.memories.unshift({ ...mem, day: CCS.state.time.day });
    if (n.memories.length > 12) n.memories.length = 12;
    // Trust erodes if you're all gossip; grows with heart-to-hearts.
    if (mem.tag === 'gossip') n.trust = CCS.util.clamp(n.trust - 2, -50, 100);
  },

  canInteract(id, def) {
    const n = this.ensure(id);
    if (def.minFriend && n.friendship < def.minFriend)
      return { ok: false, hint: `Needs Friend lvl (${def.minFriend}+)` };
    return { ok: true };
  },

  interact(id, interactionId) {
    const def = CCS.data.interactionById[interactionId];
    const npcDef = CCS.data.npcById[id];
    const n = this.discover(id);
    if (!def || !n) return { ok: false };

    // --- Success chance -----------------------------------------------------
    let chance = 0.78;
    chance += (CCS.state.skills.charisma || 0) * 0.005;
    const socMod = CCS.sim.mood.mods().socialSuccess;
    if (socMod) chance += (socMod - 1);
    if (CCS.state.player.traits.includes('Charismatic')) chance += 0.08;
    if (interactionId === 'flirt' && CCS.state.player.traits.includes('Romantic')) chance += 0.1;
    chance += this.memoryBias(n, def.mem?.tag);
    if (def.risk) chance -= def.risk;
    // Gate: risky moves before you're close enough usually flop.
    if (def.minFriend && n.friendship < def.minFriend) chance -= 0.5 + (def.minFriend - n.friendship) / 120;
    if (npcDef.personality.includes('private') && ['vent', 'flirt'].includes(interactionId)) chance -= 0.1;
    chance = CCS.util.clamp(chance, 0.05, 0.97);

    const success = Math.random() < chance;

    // --- Apply outcome ------------------------------------------------------
    const nd = CCS.state.needs;
    const add = (k, v) => { nd[k] = CCS.util.clamp(nd[k] + v, 0, 100); };

    if (success) {
      add('social', def.social || 0);
      if (def.mood) add('confidence', def.mood);
      if (def.fun) add('fun', def.fun);
      if (def.stress) add('stress', def.stress);
      if (def.confidence) add('confidence', def.confidence);
      for (const [k, v] of Object.entries(def.deltas || {})) {
        let dv = v;
        if (k === 'romance' && CCS.state.player.traits.includes('Romantic')) dv *= 1.3;
        n[k] = CCS.util.clamp((n[k] || 0) + dv, -50, 100);
      }
      n.mood = CCS.util.clamp(n.mood + 6, 0, 100);
      this.addMemory(n, def.mem);
      if (interactionId === 'flirt') CCS.state.flags._flirtyUntil = CCS.state.time.day;
      CCS.sim.feed(`${def.emoji} You ${def.label.toLowerCase()} with ${npcDef.name}. It went well!`, def.emoji);
    } else {
      add('social', (def.social || 0) * 0.4);
      add('confidence', -6);
      add('stress', +5);
      n.friendship = CCS.util.clamp(n.friendship - 1, -50, 100);
      if (interactionId === 'flirt') n.romance = CCS.util.clamp(n.romance - 4, -50, 100);
      this.addMemory(n, def.memFail || { text: `${def.label.toLowerCase()} fell flat`, sentiment: -1, tag: 'awkward' });
      n.mood = CCS.util.clamp(n.mood - 4, 0, 100);
      CCS.sim.feed(`${def.emoji} You tried to ${def.label.toLowerCase()} with ${npcDef.name}… it fell flat.`, '😬');
    }

    this.recomputeScore(id);

    // Time + downstream systems (same pipeline actions use).
    CCS.sim.time.advance(0.5);
    CCS.state.stats.totalActions += 1;
    CCS.state.stats.actionsToday += 1;
    CCS.sim.mood.recompute();
    CCS.sim.emitEvent({ kind: 'npc', npcId: id, interactionId, success });
    CCS.sim.progression.afterAction({ tag: 'social' });
    CCS.sim.mood.recompute();
    CCS.sim.save?.();
    CCS.events.emit('state-changed');
    return { ok: true, success };
  },
};

// --- Special action handlers for phone social actions ----------------------
CCS.sim.handlers = CCS.sim.handlers || {};
CCS.sim.handlers.callFriend = function (def, ctx) {
  const friend = pickKnownFriend();
  if (friend) {
    const n = CCS.sim.npc.ensure(friend);
    n.friendship = CCS.util.clamp(n.friendship + 4, -50, 100);
    n.mood = CCS.util.clamp(n.mood + 5, 0, 100);
    CCS.sim.npc.addMemory(n, { text: 'we caught up on a call', sentiment: 2, tag: 'friendly' });
    CCS.sim.npc.recomputeScore(friend);
    ctx.npc = n;
    return { feed: `📞 You called ${CCS.data.npcById[friend].name} for a good chat.` };
  }
  return {};
};
CCS.sim.handlers.textFriend = function (def, ctx) {
  const friend = pickKnownFriend();
  if (friend) {
    const n = CCS.sim.npc.ensure(friend);
    n.friendship = CCS.util.clamp(n.friendship + 2, -50, 100);
    CCS.sim.npc.recomputeScore(friend);
    return { feed: `💬 You messaged ${CCS.data.npcById[friend].name}.` };
  }
  return {};
};

function pickKnownFriend() {
  const known = Object.entries(CCS.state.npcs).filter(([, n]) => n.discovered);
  if (known.length) {
    known.sort((a, b) => (b[1].friendship) - (a[1].friendship));
    return known[0][0];
  }
  return 'maya'; // your default bestie
}
