// ============================================================================
// slots.js — interaction slots + reservations (architecture #5).
//
// Every placed object exposes usable SLOTS (positions an entity stands/sits at
// to use it). Before using an object — and later, before an autonomous NPC
// walks to one — an entity must RESERVE a slot. Reservations live in
// CCS.state.reservations (serialized), keyed `${instanceId}:${slotId}`, so two
// entities can never occupy the same slot.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.sim = CCS.sim || {};

  // Items with more than the default single "use" slot.
  const SLOT_DEFS = {
    bed:      [{ id: 'left', offset: { x: -1.2, y: 0, z: 0 } }, { id: 'right', offset: { x: 1.2, y: 0, z: 0 } }],
    kingBed:  [{ id: 'left', offset: { x: -1.4, y: 0, z: 0 } }, { id: 'right', offset: { x: 1.4, y: 0, z: 0 } }],
    couch:    [{ id: 'seat1', offset: { x: -0.6, y: 0, z: 0.8 } }, { id: 'seat2', offset: { x: 0.6, y: 0, z: 0.8 } }],
    reclinerSofa: [{ id: 'seat1', offset: { x: -0.7, y: 0, z: 0.9 } }, { id: 'seat2', offset: { x: 0.7, y: 0, z: 0.9 } }],
    firePit:  [{ id: 's1', offset: { x: 0, y: 0, z: 1.2 } }, { id: 's2', offset: { x: 1.2, y: 0, z: 0 } },
               { id: 's3', offset: { x: -1.2, y: 0, z: 0 } }, { id: 's4', offset: { x: 0, y: 0, z: -1.2 } }],
    homePool: [{ id: 'lane1', offset: { x: -1, y: 0, z: 0 } }, { id: 'lane2', offset: { x: 1, y: 0, z: 0 } }],
    smartTv:  [{ id: 'view1', offset: { x: -0.6, y: 0, z: 1.6 } }, { id: 'view2', offset: { x: 0.6, y: 0, z: 1.6 } }],
  };
  const DEFAULT_SLOTS = [{ id: 'use', offset: { x: 0, y: 0, z: 1 } }];

  function res() {
    if (!CCS.state.reservations) CCS.state.reservations = {};
    return CCS.state.reservations;
  }

  CCS.sim.slots = {
    // Slot definitions for a base/catalog id (offsets are pre-rotation).
    slotsFor(catalogId) {
      const bare = String(catalogId).replace(/^fixture:/, '');
      return SLOT_DEFS[bare] || DEFAULT_SLOTS;
    },

    // World position of a slot on a placed instance (rotation-aware).
    slotWorldPos(instance, slotId) {
      const slot = this.slotsFor(instance.catalogId).find((s) => s.id === slotId);
      if (!slot) return CCS.world3.clone(instance.pos);
      const off = CCS.world3.rotateY(slot.offset, instance.rot?.y || 0);
      return CCS.world3.add(instance.pos, off);
    },

    key(instanceId, slotId) { return `${instanceId}:${slotId}`; },

    isFree(instanceId, slotId) { return !res()[this.key(instanceId, slotId)]; },

    occupant(instanceId, slotId) { return res()[this.key(instanceId, slotId)] || null; },

    reserve(entityId, instanceId, slotId) {
      const key = this.key(instanceId, slotId);
      const existing = res()[key];
      if (existing && existing.entityId !== entityId) {
        return { ok: false, reason: 'Slot already reserved.', key };
      }
      res()[key] = { entityId, instanceId, slotId, day: CCS.state.time.day, hour: CCS.state.time.hour };
      return { ok: true, key };
    },

    // First free slot on an instance.
    reserveAny(entityId, instance) {
      for (const s of this.slotsFor(instance.catalogId)) {
        const r = this.reserve(entityId, instance.instanceId, s.id);
        if (r.ok) return { ...r, slotId: s.id };
      }
      const holder = this.slotsFor(instance.catalogId)
        .map((s) => this.occupant(instance.instanceId, s.id)).find(Boolean);
      return { ok: false, reason: this.holderName(holder) + ' is using that right now.' };
    },

    // Engine entry: reserve a slot on whichever placed instance backs objectId.
    // Objects with no spatial instance (e.g. the phone, "anywhere") need none.
    reserveForAction(entityId, objectId) {
      const inst = CCS.sim.lots.findInstanceByObjectId(objectId);
      if (!inst) return { ok: true, key: null };
      return this.reserveAny(entityId, inst);
    },

    release(key) { if (key) delete res()[key]; },

    releaseAll(entityId) {
      for (const [k, v] of Object.entries(res())) if (v.entityId === entityId) delete res()[k];
    },

    holderName(holder) {
      if (!holder) return 'Someone';
      if (holder.entityId === 'player') return CCS.state.player.name;
      const npcId = String(holder.entityId).replace(/^npc:/, '');
      return CCS.data.npcById[npcId]?.name || 'Someone';
    },
  };
})();
