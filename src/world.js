// ============================================================================
// world.js — the lot you live on: the floor, the walls, and the furniture.
//
// Objects (furniture) live in a registry. Each object knows how to be "used":
// standing next to it and pressing E runs an interaction that fills needs,
// costs/earns money, etc. Mods add furniture by pushing into this registry.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

// The lot layout. '#' = wall, '.' = floor. (20 wide x 15 tall)
const MAP = [
  '####################',
  '#..................#',
  '#..................#',
  '#........####......#',
  '#........#..#......#',
  '#........#..#......#',
  '#.................##',
  '#..................D',   // D = door / exit spot (still floor, just a marker)
  '#.................##',
  '#..................#',
  '#......####........#',
  '#......#..#........#',
  '#......#..#........#',
  '#..................#',
  '####################',
];

CCS.world = {
  map: MAP,

  isWall(col, row) {
    if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[0].length) return true;
    return MAP[row][col] === '#';
  },

  // Is the pixel point inside a solid tile or an object footprint?
  isBlocked(px, py) {
    const t = CCS.config.tileSize;
    const col = Math.floor(px / t);
    const row = Math.floor(py / t);
    if (CCS.world.isWall(col, row)) return true;
    for (const obj of CCS.world.objects) {
      if (obj.solid === false) continue;
      const ox = obj.col * t;
      const oy = obj.row * t;
      const ow = (obj.w || 1) * t;
      const oh = (obj.h || 1) * t;
      if (px >= ox && px < ox + ow && py >= oy && py < oy + oh) return true;
    }
    return false;
  },

  // All placed furniture. Interactions are defined here.
  objects: [
    {
      id: 'bed', name: 'Bed', emoji: '🛏️', col: 10, row: 4, w: 2, h: 1,
      action: { label: 'Sleep', duration: 4, effects: { energy: +90 }, verb: 'sleeping 😴' },
    },
    {
      id: 'fridge', name: 'Fridge', emoji: '🍔', col: 1, row: 1, w: 1, h: 1,
      action: { label: 'Eat', duration: 2.5, effects: { hunger: +80 }, cost: 15, verb: 'eating 🍽️' },
    },
    {
      id: 'toilet', name: 'Toilet', emoji: '🚽', col: 18, row: 1, w: 1, h: 1,
      action: { label: 'Use', duration: 1.5, effects: { bladder: +100, hygiene: -5 }, verb: 'in the bathroom' },
    },
    {
      id: 'shower', name: 'Shower', emoji: '🚿', col: 18, row: 3, w: 1, h: 1,
      action: { label: 'Shower', duration: 2.5, effects: { hygiene: +95 }, verb: 'showering 🚿' },
    },
    {
      id: 'tv', name: 'TV', emoji: '📺', col: 1, row: 13, w: 1, h: 1,
      action: { label: 'Watch', duration: 3, effects: { fun: +60, energy: +5 }, verb: 'watching TV 📺' },
    },
    {
      id: 'sofa', name: 'Sofa', emoji: '🛋️', col: 3, row: 13, w: 2, h: 1,
      action: { label: 'Relax', duration: 3, effects: { fun: +30, energy: +25 }, verb: 'relaxing 🛋️' },
    },
    {
      id: 'computer', name: 'Computer', emoji: '💻', col: 7, row: 11, w: 1, h: 1,
      action: { label: 'Work from home', duration: 4, effects: { fun: +15, energy: -10 }, earn: 120, verb: 'working 💼' },
    },
    {
      id: 'plant', name: 'Plant', emoji: '🪴', col: 17, row: 12, w: 1, h: 1,
      action: { label: 'Water', duration: 1.5, effects: { fun: +8 }, verb: 'gardening 🪴' },
    },
  ],

  // Mods use this to add furniture.
  addObject(def) {
    CCS.world.objects.push({ w: 1, h: 1, solid: true, ...def });
    CCS.events.emit('object-added', def);
  },

  removeObject(id) {
    CCS.world.objects = CCS.world.objects.filter((o) => o.id !== id);
  },

  // Center pixel of an object (used for distance checks + drawing).
  center(obj) {
    const t = CCS.config.tileSize;
    return {
      x: obj.col * t + (obj.w || 1) * t / 2,
      y: obj.row * t + (obj.h || 1) * t / 2,
    };
  },

  // The closest object the player is near enough to use, or null.
  nearestUsable(px, py) {
    let best = null;
    let bestDist = CCS.config.interactRange + Math.max(CCS.config.tileSize, 0);
    for (const obj of CCS.world.objects) {
      if (!obj.action) continue;
      const c = CCS.world.center(obj);
      const reach = CCS.config.interactRange + Math.max(obj.w || 1, obj.h || 1) * CCS.config.tileSize / 2;
      const d = CCS.util.dist(px, py, c.x, c.y);
      if (d <= reach && d < bestDist) { best = obj; bestDist = d; }
    }
    return best;
  },
};
