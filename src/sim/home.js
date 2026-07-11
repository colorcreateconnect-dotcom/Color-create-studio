// ============================================================================
// home.js — Build & Buy: owning, placing and valuing furniture.
//
// Base furniture is always available; this module tracks the *extra* items you
// purchase, groups everything into rooms, and computes the home "ambiance"
// that keeps your Environment need healthy.
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
    if (!CCS.state.home) CCS.state.home = { owned: [], theme: 'cozy' };
    return CCS.state.home;
  },

  isOwned(catId) { return this.ensure().owned.some((o) => o.catId === catId); },

  ownedItems() {
    return this.ensure().owned.map((o) => ({ ...o, def: CCS.data.catalogById[o.catId] })).filter((o) => o.def);
  },

  ambiance() {
    return this.ownedItems().reduce((a, o) => a + (o.def.ambiance || 0), 0);
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

    CCS.state.player.money -= def.price;
    this.ensure().owned.push({ iid: 'it_' + CCS.util.randId(), catId, room: def.room });

    CCS.sim.feed(`🛒 You bought a ${def.name} for $${def.price}.`, def.emoji);
    CCS.ui?.toast?.(`🛒 Bought ${def.name}!`);
    CCS.sim.emitEvent({ kind: 'buy', catId, cat: def.cat });
    CCS.sim.progression.checkUnlocks();
    CCS.sim.mood.recompute();
    CCS.sim.save?.(); CCS.events.emit('state-changed');
    return { ok: true };
  },

  sell(iid) {
    const home = this.ensure();
    const idx = home.owned.findIndex((o) => o.iid === iid);
    if (idx < 0) return;
    const def = CCS.data.catalogById[home.owned[idx].catId];
    const refund = Math.round((def?.price || 0) * 0.5);
    home.owned.splice(idx, 1);
    CCS.state.player.money += refund;
    CCS.sim.feed(`💸 You sold your ${def?.name || 'item'} for $${refund}.`, '💸');
    CCS.ui?.toast?.(`Sold for $${refund}`);
    CCS.sim.mood.recompute();
    CCS.sim.save?.(); CCS.events.emit('state-changed');
  },

  move(iid, room) {
    const o = this.ensure().owned.find((x) => x.iid === iid);
    if (o) { o.room = room; CCS.sim.save?.(); CCS.events.emit('state-changed'); }
  },

  // All furniture (base + owned) in a room, as {name, emoji, room, actions}.
  furnitureInRoom(room) {
    const base = CCS.data.objects
      .filter((o) => o.room === room && !(o.requires?.hasPet && CCS.state.pets.length === 0))
      .map((o) => ({ name: o.name, emoji: o.emoji, room, actions: o.actions, catId: null }));
    const bought = this.ownedItems()
      .filter((o) => o.room === room)
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
