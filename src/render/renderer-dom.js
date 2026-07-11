// ============================================================================
// renderer-dom.js — the DOM implementation of the renderer contract.
//
// Draws the active lot top-down: room rectangles tinted by wallpaper/flooring
// styles, placed objects as emoji, the player as a colored chip. All world→%
// conversion happens HERE — the simulation stays coordinate-neutral.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  const WALL_TINTS = {
    lavender: '#8a7bb855', cream: '#c9bb9a44', blush: '#c98aa855',
    mint: '#7bb89a4d', night: '#3a3a6644', sky: '#7ba8c955',
  };
  const FLOOR_TINTS = {
    wood: '#8a6a4a33', tile: '#9aa8b833', carpet: '#a88aa833',
    stone: '#8a8a8a33', grass: '#5a9a5a40',
  };

  let host = null;
  let scene = null;
  let camTarget = null;

  function pct(scene, pos) {
    return { x: (pos.x / scene.dims.width) * 100, y: (pos.z / scene.dims.depth) * 100 };
  }

  const dom = {
    mount(el) {
      if (host === el) return;
      this.dispose();
      host = el;
      host.classList.add('lotdom');
      host.addEventListener('click', onClick);
    },

    dispose() {
      if (host) { host.removeEventListener('click', onClick); host.innerHTML = ''; }
      host = null; scene = null;
    },

    renderScene(desc) {
      if (!host || !desc) return;
      scene = desc;
      host.style.aspectRatio = `${desc.dims.width} / ${desc.dims.depth}`;

      const rooms = desc.rooms.map((r) => {
        const b = r.bounds;
        const l = (b.x0 / desc.dims.width) * 100, t = (b.z0 / desc.dims.depth) * 100;
        const w = ((b.x1 - b.x0) / desc.dims.width) * 100, h = ((b.z1 - b.z0) / desc.dims.depth) * 100;
        const wall = WALL_TINTS[r.style.wallpaper] || WALL_TINTS.cream;
        const floor = FLOOR_TINTS[r.style.flooring] || FLOOR_TINTS.wood;
        return `<div class="lv-room ${r.outdoor ? 'outdoor' : ''}" data-room="${r.roomId}"
          style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;
                 background:linear-gradient(${wall},${wall}),linear-gradient(${floor},${floor})">
          <span class="lv-roomname">${r.name}</span></div>`;
      }).join('');

      const objects = desc.placed.map((p) => {
        const c = pct(desc, p.pos);
        const yaw = p.rot?.y || 0;
        return `<span class="lv-obj ${p.builtin ? '' : 'bought'}" data-instance="${p.instanceId}"
          style="left:${c.x}%;top:${c.y}%;transform:translate(-50%,-50%) rotate(${yaw}deg)">${p.emoji}</span>`;
      }).join('');

      const entities = desc.entities.map((e) => {
        const c = pct(desc, e.pos);
        return `<span class="lv-ent" data-entity="${e.id}" title="${e.name}"
          style="left:${c.x}%;top:${c.y}%;background:${e.color}">${e.emoji}</span>`;
      }).join('');

      host.innerHTML = rooms + objects + entities;
    },

    updateEntity(id, entityState) {
      if (!host || !scene) return;
      const el = host.querySelector(`[data-entity="${id}"]`);
      if (!el) { this.renderScene(scene); return; }
      const c = pct(scene, entityState.pos);
      el.style.left = c.x + '%'; el.style.top = c.y + '%';
      if (entityState.emoji) el.textContent = entityState.emoji;
    },

    updateObject(instanceId, objState) {
      if (!host || !scene) return;
      const el = host.querySelector(`[data-instance="${instanceId}"]`);
      if (!el || !objState.pos) { return; }
      const c = pct(scene, objState.pos);
      el.style.left = c.x + '%'; el.style.top = c.y + '%';
    },

    removeEntity(id) {
      host?.querySelector(`[data-entity="${id}"]`)?.remove();
    },

    setCameraTarget(target) { camTarget = target; }, // top-down view: stored for contract parity

    raycast(screenX, screenY) {
      if (!host || !scene) return null;
      const el = document.elementFromPoint(screenX, screenY);
      if (el?.dataset?.instance) return { type: 'object', instanceId: el.dataset.instance };
      if (el?.dataset?.entity) return { type: 'entity', entityId: el.dataset.entity };
      const world = this.screenToWorld(screenX, screenY);
      return world ? { type: 'floor', pos: world } : null;
    },

    worldToScreen(pos) {
      if (!host || !scene) return { x: 0, y: 0 };
      const r = host.getBoundingClientRect();
      return {
        x: r.left + (pos.x / scene.dims.width) * r.width,
        y: r.top + (pos.z / scene.dims.depth) * r.height,
      };
    },

    screenToWorld(x, y) {
      if (!host || !scene) return null;
      const r = host.getBoundingClientRect();
      return {
        x: ((x - r.left) / r.width) * scene.dims.width,
        y: 0,
        z: ((y - r.top) / r.height) * scene.dims.depth,
      };
    },
  };

  function onClick(e) {
    const hit = dom.raycast(e.clientX, e.clientY);
    if (hit) CCS.events.emit('renderer-select', hit);
  }

  CCS.renderer.register('dom', dom);
})();
