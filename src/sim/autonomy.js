// ============================================================================
// autonomy.js — NPC autonomy STATE + interfaces (architecture #8).
//
// This is deliberately NOT an AI. It defines the serialized autonomy record
// every entity carries, plus the goal/queue interfaces a future behavior
// system (or server) will drive. tick() is wired into the engine but is a
// safe no-op scaffold: it only expires stale slot reservations.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.sim = CCS.sim || {};

  const FRESH = () => ({
    autonomyEnabled: false,     // future AI switch — off for everyone today
    currentGoal: null,          // e.g. { kind: 'satisfy-need', need: 'fun' }
    currentAction: null,        // e.g. { actionId: 'watchTv', startedDay, startedHour }
    targetEntityId: null,       // entity/instance the NPC is heading toward
    actionQueue: [],            // [{ actionId | interactionId, targetId }]
    reservedInteractionSlot: null, // reservation key held while walking/using
  });

  CCS.sim.autonomy = {
    // Attach (or repair) the autonomy record on any entity state object.
    ensure(rec) {
      if (!rec.autonomy) rec.autonomy = FRESH();
      else rec.autonomy = { ...FRESH(), ...rec.autonomy };
      return rec.autonomy;
    },

    ensureNpc(npcId) {
      const rec = CCS.sim.npc.ensure(npcId);
      return rec ? this.ensure(rec) : null;
    },

    setGoal(rec, goal) {
      const a = this.ensure(rec);
      a.currentGoal = goal;
      a.actionQueue = [];
      return a;
    },

    enqueue(rec, action) {
      const a = this.ensure(rec);
      a.actionQueue.push(action);
      return a;
    },

    clear(rec) {
      const a = this.ensure(rec);
      if (a.reservedInteractionSlot) CCS.sim.slots.release(a.reservedInteractionSlot);
      rec.autonomy = FRESH();
    },

    // Reserve a slot on behalf of an entity and remember it on their record.
    reserveSlot(rec, entityId, instance) {
      const a = this.ensure(rec);
      const r = CCS.sim.slots.reserveAny(entityId, instance);
      if (r.ok) a.reservedInteractionSlot = r.key;
      return r;
    },

    // Called by the engine each action. No behavior yet — just hygiene:
    // release reservations older than a day (crash/stale protection).
    tick() {
      const res = CCS.state.reservations || {};
      for (const [key, r] of Object.entries(res)) {
        if (CCS.state.time.day - (r.day || 0) >= 1 && r.entityId !== 'player') delete res[key];
      }
    },
  };
})();
