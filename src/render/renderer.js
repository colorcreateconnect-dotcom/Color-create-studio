// ============================================================================
// renderer.js — the renderer-neutral contract + registry (architecture #6).
//
// The simulation NEVER touches pixels; it produces a scene description
// (CCS.sim.lots.sceneDescription()) in world coordinates (X horiz, Y up,
// Z depth). A renderer implements this contract to draw it. Today that's the
// DOM renderer; later a Three.js renderer implements the same contract and
// the game swaps with CCS.renderer.use('three').
//
// Contract every renderer must implement:
//   mount(el, opts)                  attach to a DOM host element
//   dispose()                        unmount + free resources
//   renderScene(sceneDesc)           (re)draw a full scene description
//   updateEntity(id, entityState)    incremental entity update
//   updateObject(instanceId, state)  incremental placed-object update
//   removeEntity(id)                 remove an entity
//   setCameraTarget(target)          {x,y,z} | entityId to follow
//   raycast(screenX, screenY)        → { type:'object'|'entity'|'floor', ... } | null
//   worldToScreen(pos)               world {x,y,z} → {x,y} in host pixels
//   screenToWorld(x, y)              host pixels → world {x,y,z} (ground plane)
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  const impls = new Map();
  let active = null;
  let activeName = null;

  const REQUIRED = ['mount', 'dispose', 'renderScene', 'updateEntity', 'updateObject',
    'removeEntity', 'setCameraTarget', 'raycast', 'worldToScreen', 'screenToWorld'];

  CCS.renderer = {
    register(name, impl) {
      const missing = REQUIRED.filter((m) => typeof impl[m] !== 'function');
      if (missing.length) {
        console.warn(`[renderer:${name}] missing contract methods: ${missing.join(', ')}`);
      }
      impls.set(name, impl);
    },

    use(name) {
      const impl = impls.get(name);
      if (!impl) { console.warn(`[renderer] unknown renderer "${name}"`); return null; }
      if (active && active !== impl) { try { active.dispose(); } catch {} }
      active = impl; activeName = name;
      return impl;
    },

    get active() { return active; },
    get activeName() { return activeName; },
    list() { return [...impls.keys()]; },
  };
})();
