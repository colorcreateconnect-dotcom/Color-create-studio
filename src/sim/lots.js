// ============================================================================
// lots.js — lot runtime: ownership, placed instances, room styles, scenes.
//
// CATALOG ITEM  (data-catalog.js) = what a thing IS (price, effects, actions).
// PLACED INSTANCE (state.lots[..].placed[]) = one concrete copy IN THE WORLD:
//   { instanceId, catalogId, lotId, roomId, pos{x,y,z}, rot{x,y,z},
//     scale{x,y,z}, state{}, owner, builtin }
// Footprints and interaction slots derive from placement.js / slots.js meta,
// so they never go stale inside saves.
//
// Base furniture (bed, fridge…) is instantiated once per lot as `builtin`
// fixtures: they carry spatial data for renderers/placement but their actions
// and availability still come from data-objects.js — gameplay is unchanged.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.sim = CCS.sim || {};

  CCS.sim.lots = {
    // ---- state shape ---------------------------------------------------------
    freshLotState(def) {
      return {
        lotId: def.lotId,
        worldId: def.worldId,
        owned: !!def.defaultOwned,
        pricePaid: 0,
        placed: [],
        roomStyles: Object.fromEntries(def.rooms.map((r) => [r.roomId, {
          wallpaper: r.wallpaper, flooring: r.flooring, theme: r.theme,
        }])),
      };
    },

    ensureAll() {
      if (!CCS.state.lots) CCS.state.lots = {};
      if (!CCS.state.reservations) CCS.state.reservations = {};
      for (const def of CCS.data.lots) {
        if (!CCS.state.lots[def.lotId]) CCS.state.lots[def.lotId] = this.freshLotState(def);
        const lot = CCS.state.lots[def.lotId];
        // Repair partial saves.
        if (!lot.placed) lot.placed = [];
        if (!lot.roomStyles) lot.roomStyles = this.freshLotState(def).roomStyles;
        if (lot.owned) this.instantiateFixtures(lot, def);
      }
      if (!CCS.state.currentLotId || !CCS.state.lots[CCS.state.currentLotId]) {
        CCS.state.currentLotId = 'home_lot';
      }
      // Player gets a world position at the active lot's spawn point.
      if (!CCS.state.player.pos) {
        const spawn = this.activeLotDef()?.spawnPoints?.[0] || { x: 5, y: 0, z: 5 };
        CCS.state.player.pos = { x: spawn.x, y: spawn.y || 0, z: spawn.z };
      }
    },

    // Builtin fixtures: one spatial instance per base object, per owned lot.
    instantiateFixtures(lotState, def) {
      for (const obj of CCS.data.objects) {
        if (obj.room === 'anywhere') continue;                       // e.g. phone
        if (!def.rooms.some((r) => r.roomId === obj.room)) continue; // lot lacks room
        const catalogId = 'fixture:' + obj.id;
        if (lotState.placed.some((p) => p.catalogId === catalogId)) continue;
        const pos = CCS.sim.placement.autoPlace(lotState, obj.room, catalogId);
        lotState.placed.push(this.makeInstance(catalogId, lotState.lotId, obj.room, pos, { builtin: true }));
      }
    },

    makeInstance(catalogId, lotId, roomId, pos, extra = {}) {
      return {
        instanceId: 'inst_' + CCS.util.randId(),
        catalogId, lotId, roomId,
        pos: CCS.world3.clone(pos || { x: 0, y: 0, z: 0 }),
        rot: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        state: {},                       // per-instance runtime state (dirty, on/off…)
        owner: extra.builtin ? 'builtin' : 'player',
        builtin: !!extra.builtin,
      };
    },

    // ---- lookups ---------------------------------------------------------------
    activeLot() { this.ensureAll(); return CCS.state.lots[CCS.state.currentLotId]; },
    activeLotDef() { return CCS.data.lotById[CCS.state.currentLotId || 'home_lot']; },
    ownedLots() { return Object.values(CCS.state.lots || {}).filter((l) => l.owned); },

    findInstance(instanceId) {
      for (const lot of Object.values(CCS.state.lots || {})) {
        const found = lot.placed.find((p) => p.instanceId === instanceId);
        if (found) return found;
      }
      return null;
    },

    // The placed instance backing a gameplay objectId (base or catalog) on the
    // active lot. Used by the slot system before actions run.
    findInstanceByObjectId(objectId) {
      const lot = this.activeLot();
      if (!lot) return null;
      return lot.placed.find((p) => p.catalogId === objectId || p.catalogId === 'fixture:' + objectId) || null;
    },

    // ---- buying lots -------------------------------------------------------------
    buyLot(lotId) {
      this.ensureAll();
      const def = CCS.data.lotById[lotId];
      const lot = CCS.state.lots[lotId];
      if (!def || !lot) return { ok: false, reason: 'No such lot.' };
      if (lot.owned) return { ok: false, reason: 'Already owned.' };
      if (CCS.state.player.money < def.price) return { ok: false, reason: "Can't afford this lot." };
      CCS.state.player.money -= def.price;
      lot.owned = true;
      lot.pricePaid = def.price;
      this.instantiateFixtures(lot, def);
      CCS.sim.feed(`🏡 You bought ${def.name} for $${def.price}!`, '🏡');
      CCS.ui?.toast?.(`🏡 New lot: ${def.name}!`);
      CCS.sim.save?.(); CCS.events.emit('state-changed');
      return { ok: true };
    },

    setActiveLot(lotId) {
      this.ensureAll();
      const lot = CCS.state.lots[lotId];
      if (!lot?.owned) { CCS.ui?.toast?.("You don't own that lot."); return; }
      CCS.state.currentLotId = lotId;
      const spawn = CCS.data.lotById[lotId]?.spawnPoints?.[0];
      if (spawn) CCS.state.player.pos = { x: spawn.x, y: spawn.y || 0, z: spawn.z };
      CCS.sim.save?.(); CCS.events.emit('state-changed');
    },

    // ---- placing / moving / removing ---------------------------------------------
    place(catalogId, roomId, pos = null, rotY = 0) {
      const lot = this.activeLot();
      const finalPos = pos || CCS.sim.placement.autoPlace(lot, roomId, catalogId);
      if (pos) {
        const v = CCS.sim.placement.validate(lot, roomId, catalogId, pos, rotY);
        if (!v.ok) return { ok: false, reason: v.reason };
      }
      const inst = this.makeInstance(catalogId, lot.lotId, roomId, finalPos);
      inst.rot.y = rotY;
      lot.placed.push(inst);
      return { ok: true, instance: inst };
    },

    moveInstance(instanceId, roomId, pos, rotY = 0) {
      const inst = this.findInstance(instanceId);
      if (!inst) return { ok: false, reason: 'No such instance.' };
      const lot = CCS.state.lots[inst.lotId];
      const meta = CCS.sim.placement.metaFor(inst.catalogId);
      const snapped = CCS.world3.snapPos(pos, meta.snap);
      const rot = CCS.world3.snap(rotY, meta.rotSnap);
      const v = CCS.sim.placement.validate(lot, roomId, inst.catalogId, snapped, rot, instanceId);
      if (!v.ok) return v;
      inst.roomId = roomId;
      inst.pos = snapped;
      inst.rot.y = rot;
      CCS.sim.save?.(); CCS.events.emit('state-changed');
      return { ok: true };
    },

    removeInstance(instanceId) {
      for (const lot of Object.values(CCS.state.lots || {})) {
        const i = lot.placed.findIndex((p) => p.instanceId === instanceId);
        if (i >= 0) {
          // Free any slot reservations on it.
          for (const key of Object.keys(CCS.state.reservations || {})) {
            if (key.startsWith(instanceId + ':')) delete CCS.state.reservations[key];
          }
          return lot.placed.splice(i, 1)[0];
        }
      }
      return null;
    },

    // ---- room styles ----------------------------------------------------------------
    roomStyle(roomId, lotId = null) {
      const lot = lotId ? CCS.state.lots[lotId] : this.activeLot();
      return lot?.roomStyles?.[roomId] || null;
    },
    setRoomStyle(roomId, patch, lotId = null) {
      const lot = lotId ? CCS.state.lots[lotId] : this.activeLot();
      if (!lot?.roomStyles?.[roomId]) return;
      Object.assign(lot.roomStyles[roomId], patch);
      CCS.sim.save?.(); CCS.events.emit('state-changed');
    },
    cycleRoomStyle(roomId, kind) {
      const list = kind === 'wallpaper' ? CCS.data.wallpapers : CCS.data.floorings;
      const cur = this.roomStyle(roomId)?.[kind];
      const next = list[(list.indexOf(cur) + 1) % list.length];
      this.setRoomStyle(roomId, { [kind]: next });
      CCS.ui?.toast?.(`🎨 ${roomId}: ${kind} → ${next}`);
    },

    // ---- renderer scene description ----------------------------------------------------
    // Renderer-neutral description of the active lot (architecture #6/#7).
    sceneDescription() {
      const lot = this.activeLot();
      const def = this.activeLotDef();
      if (!lot || !def) return null;
      return {
        lotId: lot.lotId,
        name: def.name,
        dims: def.dims,
        lighting: def.lighting,
        cameraBounds: def.cameraBounds,
        rooms: def.rooms.map((r) => ({
          roomId: r.roomId, name: r.name, bounds: r.bounds, outdoor: r.outdoor,
          floorIndex: r.floorIndex, style: lot.roomStyles[r.roomId] || {},
        })),
        placed: lot.placed.map((p) => ({
          instanceId: p.instanceId, catalogId: p.catalogId, roomId: p.roomId,
          pos: p.pos, rot: p.rot, scale: p.scale, builtin: p.builtin,
          emoji: emojiFor(p.catalogId),
          footprint: CCS.sim.placement.footprintRect(p.catalogId, p.pos, p.rot?.y || 0),
          slots: CCS.sim.slots.slotsFor(p.catalogId).map((s) => ({
            slotId: s.id, pos: CCS.sim.slots.slotWorldPos(p, s.id),
            reserved: !CCS.sim.slots.isFree(p.instanceId, s.id),
          })),
        })),
        entities: [{
          id: 'player', kind: 'sim', name: CCS.state.player.name,
          color: CCS.state.player.color, emoji: CCS.data.moods[CCS.state.mood.state]?.emoji || '🙂',
          pos: CCS.state.player.pos || { x: 5, y: 0, z: 5 },
        }],
      };
    },
  };

  function emojiFor(catalogId) {
    if (String(catalogId).startsWith('fixture:')) {
      const obj = CCS.data.objects.find((o) => o.id === catalogId.slice(8));
      return obj?.emoji || '📦';
    }
    return CCS.data.catalogById[catalogId]?.emoji || '📦';
  }
})();
