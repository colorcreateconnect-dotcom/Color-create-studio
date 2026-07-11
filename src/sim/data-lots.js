// ============================================================================
// data-lots.js — lot definitions + room graphs (architecture #1, #2).
//
// A WORLD (data-worlds.js) is a district you travel to. A LOT is a concrete
// parcel inside a world: it has dimensions, floors, a room graph, spawn
// points, buildable bounds, a price, lighting, and camera bounds.
//
// Rooms form a graph: each room has bounds (rect on the lot grid, in world
// units), doors, and a list of connected rooms — the future basis for
// pathfinding and autonomous NPCs walking between rooms.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.data = CCS.data || {};

  // Named style palettes rooms can use (renderers map these to visuals).
  CCS.data.wallpapers = ['lavender', 'cream', 'blush', 'mint', 'night', 'sky'];
  CCS.data.floorings = ['wood', 'tile', 'carpet', 'stone', 'grass'];
  CCS.data.roomThemes = ['cozy', 'modern', 'glam', 'natural', 'playful'];

  const R = (roomId, name, x0, z0, x1, z1, opts = {}) => ({
    roomId, name,
    floorIndex: opts.floorIndex || 0,
    bounds: { x0, z0, x1, z1 },                    // rect in world units
    polygon: [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }],
    connected: opts.connected || [],
    doors: opts.doors || [],                        // [{ to, at:{x,z} }]
    outdoor: !!opts.outdoor,
    wallpaper: opts.wallpaper || 'cream',
    flooring: opts.flooring || (opts.outdoor ? 'grass' : 'wood'),
    theme: opts.theme || 'cozy',
    ambiance: opts.ambiance || 0,                   // base room ambiance
  });

  CCS.data.lots = [
    {
      lotId: 'home_lot',
      worldId: 'home',
      name: 'Starter Loft',
      description: 'Your first place. Small, sunny, full of potential.',
      dims: { width: 12, depth: 14 },
      floors: 1,
      price: 0,
      defaultOwned: true,
      spawnPoints: [{ x: 3.5, y: 0, z: 7, roomId: 'living' }],
      entrances: [{ id: 'front', at: { x: 6, y: 0, z: 13.5 }, toRoom: 'outdoor' }],
      buildableBounds: { x0: 0, z0: 0, x1: 12, z1: 14 },
      lighting: { profile: 'cozy', ambient: '#f3e6ff', warmth: 0.7, nightDim: 0.45 },
      cameraBounds: { x0: -2, z0: -2, x1: 14, z1: 16, minZoom: 0.6, maxZoom: 2.2 },
      rooms: [
        R('bedroom', 'Bedroom', 0, 0, 5, 4, {
          connected: ['living', 'bathroom'], wallpaper: 'lavender', theme: 'cozy',
          doors: [{ to: 'living', at: { x: 2.5, z: 4 } }, { to: 'bathroom', at: { x: 5, z: 2 } }],
        }),
        R('bathroom', 'Bathroom', 5, 0, 8, 4, {
          connected: ['bedroom', 'living'], wallpaper: 'sky', flooring: 'tile',
          doors: [{ to: 'living', at: { x: 6.5, z: 4 } }],
        }),
        R('kitchen', 'Kitchen', 8, 0, 12, 4, {
          connected: ['living'], wallpaper: 'cream', flooring: 'tile',
          doors: [{ to: 'living', at: { x: 10, z: 4 } }],
        }),
        R('living', 'Living Room', 0, 4, 7, 10, {
          connected: ['bedroom', 'bathroom', 'kitchen', 'study', 'outdoor'], wallpaper: 'blush',
          doors: [{ to: 'study', at: { x: 7, z: 7 } }, { to: 'outdoor', at: { x: 3.5, z: 10 } }],
        }),
        R('study', 'Studio', 7, 4, 12, 10, {
          connected: ['living'], wallpaper: 'mint', theme: 'playful',
        }),
        R('outdoor', 'Backyard', 0, 10, 12, 14, {
          connected: ['living'], outdoor: true, theme: 'natural', ambiance: 4,
        }),
      ],
    },

    // A second, bigger lot the player can buy later — proves multi-lot support.
    {
      lotId: 'garden_villa',
      worldId: 'home',
      name: 'Garden Villa',
      description: 'A roomy villa with a huge garden. The upgrade dream.',
      dims: { width: 16, depth: 18 },
      floors: 1,
      price: 5000,
      defaultOwned: false,
      spawnPoints: [{ x: 5, y: 0, z: 8, roomId: 'living' }],
      entrances: [{ id: 'front', at: { x: 8, y: 0, z: 17.5 }, toRoom: 'outdoor' }],
      buildableBounds: { x0: 0, z0: 0, x1: 16, z1: 18 },
      lighting: { profile: 'bright', ambient: '#fff6e6', warmth: 0.55, nightDim: 0.5 },
      cameraBounds: { x0: -2, z0: -2, x1: 18, z1: 20, minZoom: 0.5, maxZoom: 2.2 },
      rooms: [
        R('bedroom', 'Main Bedroom', 0, 0, 6, 5, { connected: ['living', 'bathroom'], wallpaper: 'lavender' }),
        R('bathroom', 'Spa Bath', 6, 0, 10, 5, { connected: ['bedroom', 'living'], wallpaper: 'sky', flooring: 'tile' }),
        R('kitchen', 'Chef Kitchen', 10, 0, 16, 5, { connected: ['living'], flooring: 'tile' }),
        R('living', 'Great Room', 0, 5, 10, 12, { connected: ['bedroom', 'bathroom', 'kitchen', 'study', 'outdoor'], wallpaper: 'cream', theme: 'modern' }),
        R('study', 'Atelier', 10, 5, 16, 12, { connected: ['living'], wallpaper: 'mint', theme: 'glam' }),
        R('outdoor', 'Grand Garden', 0, 12, 16, 18, { connected: ['living'], outdoor: true, theme: 'natural', ambiance: 8 }),
      ],
    },
  ];

  CCS.data.lotById = Object.fromEntries(CCS.data.lots.map((l) => [l.lotId, l]));
})();
