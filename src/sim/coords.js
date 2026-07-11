// ============================================================================
// coords.js — the renderer-neutral world coordinate system.
//
// Simulation space is measured in world units (1 unit ≈ 1 meter / 1 tile):
//   X = horizontal (west → east)
//   Y = height     (floor → up)      floorIndex * FLOOR_HEIGHT
//   Z = depth      (north → south)
//
// NOTHING in gameplay uses pixels or percentages. Renderers convert world
// coordinates to their own space (DOM %, Three.js meters) internally.
// Migration helpers translate legacy coordinates (classic-mode canvas pixels,
// old percentage layouts) into world units.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.world3 = {
    UP_AXIS: 'Y',
    UNIT: 1,               // 1 world unit = 1 tile/meter
    FLOOR_HEIGHT: 3,       // Y offset per floor index

    vec(x = 0, y = 0, z = 0) { return { x, y, z }; },
    clone(v) { return { x: v.x || 0, y: v.y || 0, z: v.z || 0 }; },
    add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
    dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); },

    floorY(floorIndex) { return (floorIndex || 0) * this.FLOOR_HEIGHT; },

    // Rotate an offset around Y by yaw degrees (for slot positions on rotated objects).
    rotateY(off, yawDeg) {
      const r = (yawDeg || 0) * Math.PI / 180;
      const cos = Math.cos(r), sin = Math.sin(r);
      return { x: off.x * cos - off.z * sin, y: off.y || 0, z: off.x * sin + off.z * cos };
    },

    // ---- Migration helpers --------------------------------------------------
    // Classic canvas mode stored pixel positions on a 40px tile grid.
    fromClassicPixels(px, py, tileSize = 40) {
      return { x: px / tileSize, y: 0, z: py / tileSize };
    },
    fromClassicTile(col, row) { return { x: col + 0.5, y: 0, z: row + 0.5 }; },

    // Older layouts that stored 0..100 percentages of a lot's extents.
    fromPercent(pctX, pctZ, lotDef) {
      const w = lotDef?.dims?.width || 10, d = lotDef?.dims?.depth || 10;
      return { x: (pctX / 100) * w, y: 0, z: (pctZ / 100) * d };
    },
    toPercent(pos, lotDef) {
      const w = lotDef?.dims?.width || 10, d = lotDef?.dims?.depth || 10;
      return { x: (pos.x / w) * 100, z: (pos.z / d) * 100 };
    },

    // Snap a value/position to an increment.
    snap(v, inc) { return inc ? Math.round(v / inc) * inc : v; },
    snapPos(pos, inc) {
      return { x: this.snap(pos.x, inc), y: pos.y || 0, z: this.snap(pos.z, inc) };
    },
  };
})();
