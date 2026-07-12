// ============================================================================
// home.js — Build & Buy: buying, selling and valuing furniture.
//
// Ownership is now backed by PLACED INSTANCES on the active lot
// (state.lots[..].placed, see lots.js) instead of a flat owned[] list — the
// same records a renderer draws and the placement validator checks. The API
// below is unchanged from the flat-list era, so gameplay callers (engine
// requires.owns, quests, ambiance, the Build tab) didn't have to move.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.ROOMS = [
  { id: 'bedroom', name: 'Bedroom', emoji: '🛏️' },
  { id: 'bathroom', name: 'Bathroom', emoji: '🛁' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍽️' },
  { id: 'living', name: 'Living Room', emoji: '🛋️' },
  { id: 'study', name: 'Studio', emoji: '🎨' },
  { id: 'outdoor', name: 'Outdoor', emoji: '🌳' },
];

CCS.sim.home = {
  ensure() {
    if (!CCS.state.home) CCS.state.home = { theme: 'cozy' };
    CCS.sim.lots.ensureAll();
    return CCS.state.home;
  },

  // Player-bought placed instances across ALL owned lots (ownership survives
  // switching lots); catalog gates only care that you own one somewhere.
  _boughtInstances() {
    this.ensure();
    const out = [];
    for (const lot of Object.values(CCS.state.lots)) {
      for (const p of lot.placed) if (!p.builtin) out.push(p);
    }
    return out;
  },

  isOwned(catId) { return this._boughtInstances().some((p) => p.catalogId === catId); },

  // Legacy-shaped view: [{ iid, catId, room, def, instance }]
  ownedItems() {
    return this._boughtInstances()
      .map((p) => ({ iid: p.instanceId, catId: p.catalogId, room: p.roomId, def: CCS.data.catalogById[p.catalogId], instance: p }))
      .filter((o) => o.def);
  },

  ambiance() {
    let a = this.ownedItems().reduce((sum, o) => sum + (o.def.ambiance || 0), 0);
    // Rooms contribute their base ambiance too (e.g. gardens).
    const def = CCS.sim.lots.activeLotDef();
    if (def) a += def.rooms.reduce((sum, r) => sum + (r.ambiance || 0), 0);
    return a;
  },
  // Environment settles toward this. A bare home is mediocre (~50); decor lifts it.
  ambianceTarget() { return CCS.util.clamp(50 + this.ambiance(), 0, 100); },

  canBuy(catId) {
    const def = CCS.data.catalogById[catId];
    if (!def) return { ok: false, reason: 'Unknown item.' };
    if (this.isOwned(catId)) return { ok: false, reason: 'Already owned.' };
    if (def.unlock && !safeUnlock(def.unlock)) return { ok: false, reason: 'Locked.' };
    if (CCS.state.player.money < def.price) return { ok: false, reason: "Can't afford it." };
    return { ok: true };
  },

  buy(catId) {
    const def = CCS.data.catalogById[catId];
    const check = this.canBuy(catId);
    if (!check.ok) { CCS.ui?.toast?.(check.reason); return { ok: false }; }

    // Place it in its default room on the active lot (auto-positioned + snapped).
    const lotDef = CCS.sim.lots.activeLotDef();
    const roomId = lotDef.rooms.some((r) => r.roomId === def.room) ? def.room : lotDef.rooms[0].roomId;
    const placed = CCS.sim.lots.place(catId, roomId);
    if (!placed.ok) { CCS.ui?.toast?.(placed.reason || "No space for that."); return { ok: false }; }

    CCS.state.player.money -= def.price;
    CCS.sim.feed(`🛒 You bought a ${def.name} for $${def.price}.`, def.emoji);
    CCS.ui?.toast?.(`🛒 Bought ${def.name}!`);
    CCS.sim.emitEvent({ kind: 'buy', catId, cat: def.cat });
    CCS.sim.progression.checkUnlocks();
    CCS.sim.mood.recompute();
    CCS.sim.save?.(); CCS.events.emit('state-changed');
    return { ok: true, instance: placed.instance };
  },

  sell(iid) {
    const inst = CCS.sim.lots.findInstance(iid);
    if (!inst || inst.builtin) return;
    const def = CCS.data.catalogById[inst.catalogId];
    const refund = Math.round((def?.price || 0) * 0.5);
    CCS.sim.lots.removeInstance(iid);
    CCS.state.player.money += refund;
    CCS.sim.feed(`💸 You sold your ${def?.name || 'item'} for $${refund}.`, '💸');
    CCS.ui?.toast?.(`Sold for $${refund}`);
    CCS.sim.mood.recompute();
    CCS.sim.save?.(); CCS.events.emit('state-changed');
  },

  // Move an owned item to another room (auto-position within it).
  move(iid, room) {
    const inst = CCS.sim.lots.findInstance(iid);
    if (!inst) return;
    const lot = CCS.state.lots[inst.lotId];
    const pos = CCS.sim.placement.autoPlace(lot, room, inst.catalogId);
    CCS.sim.lots.moveInstance(iid, room, pos, inst.rot?.y || 0);
  },

  // All furniture (base + owned) in a room, as {name, emoji, room, actions}.
  furnitureInRoom(room) {
    const base = CCS.data.objects
      .filter((o) => o.room === room && !(o.requires?.hasPet && CCS.state.pets.length === 0))
      .map((o) => ({ name: o.name, emoji: o.emoji, room, actions: o.actions, catId: null }));
    const bought = this.ownedItems()
      .filter((o) => o.room === room && o.instance.lotId === CCS.state.currentLotId)
      .map((o) => ({ name: o.def.name, emoji: o.def.emoji, room, actions: o.def.actions || [], catId: o.catId }));
    return [...base, ...bought];
  },

  // Which rooms currently have anything in them (for the room filter).
  activeRooms() {
    return CCS.sim.ROOMS.filter((r) => this.furnitureInRoom(r.id).length > 0);
  },

  // Furniture with no fixed room (e.g. the phone) — shown everywhere.
  anywhere() {
    return CCS.data.objects.filter((o) => o.room === 'anywhere')
      .map((o) => ({ name: o.name, emoji: o.emoji, room: 'anywhere', actions: o.actions, catId: null }));
  },
};

function safeUnlock(fn) { try { return fn(CCS.state); } catch { return false; } }
