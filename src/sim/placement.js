// ============================================================================
// placement.js — placement rules + validation (architecture #4).
//
// Every placeable thing (base fixture or catalog item) gets a `placement`
// meta record: mount type, footprint, snap/rotation increments, clearance,
// room restrictions, collision behavior, and indoor/outdoor rules.
// validate() is the single authority a build UI (or a network server) asks
// before a placement is accepted.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.sim = CCS.sim || {};

  const DEFAULT = {
    mount: 'floor',            // floor | wall | ceiling
    footprint: { w: 1, d: 1 }, // world units, before rotation
    snap: 0.5,                 // position snap increment
    rotSnap: 90,               // rotation snap increment (degrees, around Y)
    clearance: 0,              // extra empty margin required around footprint
    rooms: null,               // null = any room; or ['bedroom', ...]
    blocksMovement: true,      // solid for pathing
    interactionClearance: 1,   // empty space needed in front of slots
    indoor: true,
    outdoor: false,            // true = may be placed outdoors
    outdoorOnly: false,
  };

  // Per-item overrides (anything not listed uses DEFAULT).
  const OVERRIDES = {
    // --- base fixtures ---
    bed:        { footprint: { w: 2, d: 3 }, rooms: ['bedroom'] },
    fridge:     { rooms: ['kitchen'] },
    shower:     { rooms: ['bathroom'] },
    mirror:     { mount: 'wall', footprint: { w: 1, d: 0.3 }, blocksMovement: false },
    closet:     { footprint: { w: 2, d: 1 }, rooms: ['bedroom'] },
    couch:      { footprint: { w: 2, d: 1 } },
    desk:       { footprint: { w: 2, d: 1 } },
    laptop:     { footprint: { w: 1, d: 0.5 }, blocksMovement: false },
    bookshelf:  { mount: 'wall', footprint: { w: 2, d: 0.4 } },
    calendar:   { mount: 'wall', footprint: { w: 0.5, d: 0.1 }, blocksMovement: false },
    broom:      { footprint: { w: 0.5, d: 0.5 }, blocksMovement: false },
    petBowl:    { footprint: { w: 0.5, d: 0.5 }, blocksMovement: false },
    phone:      { footprint: { w: 0.3, d: 0.3 }, blocksMovement: false },

    // --- catalog ---
    kingBed:        { footprint: { w: 2.5, d: 3 }, rooms: ['bedroom'] },
    reclinerSofa:   { footprint: { w: 2.5, d: 1.2 } },
    readingNook:    { footprint: { w: 1.5, d: 1.5 } },
    chefRange:      { footprint: { w: 2, d: 1 }, rooms: ['kitchen'] },
    espressoMachine:{ footprint: { w: 0.6, d: 0.6 }, blocksMovement: false, rooms: ['kitchen'] },
    smoothieBar:    { footprint: { w: 1, d: 0.6 }, rooms: ['kitchen'] },
    rainShower:     { rooms: ['bathroom'] },
    bathtub:        { footprint: { w: 2, d: 1 }, rooms: ['bathroom'] },
    treadmill:      { footprint: { w: 1, d: 2 } },
    yogaMat:        { footprint: { w: 1, d: 2 }, blocksMovement: false },
    keyboard:       { footprint: { w: 1.5, d: 0.6 } },
    easel:          { footprint: { w: 1, d: 1 } },
    potteryWheel:   { footprint: { w: 1, d: 1 } },
    gamingPC:       { footprint: { w: 1.5, d: 0.8 } },
    smartTv:        { mount: 'wall', footprint: { w: 2, d: 0.3 } },
    soundSystem:    { footprint: { w: 0.8, d: 0.5 } },
    pottedPlant:    { footprint: { w: 0.5, d: 0.5 }, blocksMovement: false, outdoor: true },
    scentedCandle:  { footprint: { w: 0.3, d: 0.3 }, blocksMovement: false },
    fairyLights:    { mount: 'ceiling', footprint: { w: 2, d: 0.1 }, blocksMovement: false },
    areaRug:        { footprint: { w: 3, d: 2 }, blocksMovement: false },
    wallArt:        { mount: 'wall', footprint: { w: 1.5, d: 0.1 }, blocksMovement: false },
    aquarium:       { footprint: { w: 1.5, d: 0.6 } },
    bigWindow:      { mount: 'wall', footprint: { w: 2.5, d: 0.2 }, blocksMovement: false },
    gardenBed:      { footprint: { w: 2, d: 1 }, outdoorOnly: true, outdoor: true, indoor: false, rooms: ['outdoor'] },
    firePit:        { footprint: { w: 1.5, d: 1.5 }, outdoorOnly: true, outdoor: true, indoor: false, rooms: ['outdoor'], clearance: 0.5 },
    homePool:       { footprint: { w: 4, d: 3 }, outdoorOnly: true, outdoor: true, indoor: false, rooms: ['outdoor'], clearance: 0.5 },
  };

  CCS.sim.placement = {
    // Resolve placement meta for a base object id or catalog id.
    metaFor(id) {
      const bare = String(id).replace(/^fixture:/, '');
      return { ...DEFAULT, ...(OVERRIDES[bare] || {}) };
    },

    // Rotated footprint rect centered on pos (rot in 90° steps swaps w/d).
    footprintRect(id, pos, rotY = 0) {
      const m = this.metaFor(id);
      const swapped = Math.round(((rotY % 360) + 360) % 360 / 90) % 2 === 1;
      const w = swapped ? m.footprint.d : m.footprint.w;
      const d = swapped ? m.footprint.w : m.footprint.d;
      return { x0: pos.x - w / 2, z0: pos.z - d / 2, x1: pos.x + w / 2, z1: pos.z + d / 2 };
    },

    rectsOverlap(a, b, margin = 0) {
      return a.x0 - margin < b.x1 && a.x1 + margin > b.x0 && a.z0 - margin < b.z1 && a.z1 + margin > b.z0;
    },
    rectInside(inner, outer) {
      return inner.x0 >= outer.x0 && inner.z0 >= outer.z0 && inner.x1 <= outer.x1 && inner.z1 <= outer.z1;
    },

    // The single placement authority. Returns { ok, reason? }.
    validate(lotState, roomId, id, pos, rotY = 0, ignoreInstanceId = null) {
      const lotDef = CCS.data.lotById[lotState.lotId];
      const room = lotDef?.rooms.find((r) => r.roomId === roomId);
      if (!lotDef || !room) return { ok: false, reason: 'No such room.' };
      const m = this.metaFor(id);

      if (m.rooms && !m.rooms.includes(roomId)) return { ok: false, reason: `Only fits in: ${m.rooms.join(', ')}.` };
      if (room.outdoor && !m.outdoor && !m.outdoorOnly) return { ok: false, reason: 'That belongs indoors.' };
      if (!room.outdoor && m.outdoorOnly) return { ok: false, reason: 'That belongs outdoors.' };

      const rect = this.footprintRect(id, pos, rotY);
      if (!this.rectInside(rect, room.bounds)) return { ok: false, reason: 'Out of room bounds.' };
      if (!this.rectInside(rect, lotDef.buildableBounds)) return { ok: false, reason: 'Outside buildable area.' };

      // Collision with other placed instances (solid ones).
      for (const p of lotState.placed) {
        if (p.instanceId === ignoreInstanceId) continue;
        const pm = this.metaFor(p.catalogId);
        if (!m.blocksMovement && !pm.blocksMovement) continue; // decor may overlap decor
        // Wall/ceiling mounts don't collide with floor items.
        if (m.mount !== pm.mount) continue;
        const prect = this.footprintRect(p.catalogId, p.pos, p.rot?.y || 0);
        if (this.rectsOverlap(rect, prect, Math.max(m.clearance, pm.clearance))) {
          return { ok: false, reason: 'Collides with something already there.' };
        }
      }
      return { ok: true };
    },

    // Find a valid snapped position inside a room (used by buy + migration).
    autoPlace(lotState, roomId, id) {
      const lotDef = CCS.data.lotById[lotState.lotId];
      const room = lotDef?.rooms.find((r) => r.roomId === roomId);
      if (!room) return null;
      const m = this.metaFor(id);
      const step = Math.max(m.snap, 0.5);
      const b = room.bounds;
      for (let z = b.z0 + m.footprint.d / 2; z <= b.z1 - m.footprint.d / 2 + 1e-6; z += step) {
        for (let x = b.x0 + m.footprint.w / 2; x <= b.x1 - m.footprint.w / 2 + 1e-6; x += step) {
          const pos = CCS.world3.snapPos({ x, y: CCS.world3.floorY(room.floorIndex), z }, m.snap);
          if (this.validate(lotState, roomId, id, pos, 0).ok) return pos;
        }
      }
      // Never fail hard: drop it at room center (renderer will still show it).
      return { x: (b.x0 + b.x1) / 2, y: CCS.world3.floorY(room.floorIndex), z: (b.z0 + b.z1) / 2 };
    },
  };

  // Attach resolved placement meta onto the data defs themselves, so catalog
  // items and base objects carry their rules as inspectable data (#4).
  for (const item of CCS.data.catalog || []) item.placement = CCS.sim.placement.metaFor(item.id);
  for (const obj of CCS.data.objects || []) obj.placement = CCS.sim.placement.metaFor(obj.id);
})();
