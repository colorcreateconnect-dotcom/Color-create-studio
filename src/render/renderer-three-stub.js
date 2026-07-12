// ============================================================================
// renderer-three-stub.js — placeholder proving the contract is renderer-agnostic.
//
// A future Three.js renderer replaces this file, implementing the same
// contract against a WebGL scene: rooms → floor/wall meshes, placed instances
// → models keyed by catalogId, entities → animated characters. Until then this
// stub satisfies the interface so `CCS.renderer.use('three')` is a safe no-op
// switch, and documents the intended mapping.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  const notReady = () => console.info('[renderer:three] stub — Three.js renderer not implemented yet.');

  CCS.renderer.register('three', {
    mount(el) { notReady(); this._el = el; },
    dispose() { this._el = null; },
    renderScene(desc) { this._lastScene = desc; /* future: sync meshes to desc */ },
    updateEntity() {},
    updateObject() {},
    removeEntity() {},
    setCameraTarget() {},
    raycast() { return null; },
    worldToScreen() { return { x: 0, y: 0 }; },
    screenToWorld() { return null; },
  });
})();
