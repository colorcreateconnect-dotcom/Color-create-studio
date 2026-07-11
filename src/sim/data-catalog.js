// ============================================================================
// data-catalog.js — the Build & Buy catalog (buyable furniture + decor).
//
// Base furniture (data-objects.js) is always free & available so nothing early
// breaks. The catalog is *extra* stuff you spend money on:
//   • upgrades       — better versions of basics
//   • hobby/skill    — new actions that grow skills (fitness, music, art…)
//   • decor          — raises your home "ambiance", which keeps Environment high
//
// Each item's actions are registered into CCS.data.actionById (with an `owns`
// requirement) so they flow through the exact same performAction pipeline.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

// Category metadata (order + labels for the Build tab).
CCS.data.catalogCategories = [
  { id: 'comfort', name: 'Comfort', emoji: '🛋️' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍳' },
  { id: 'bathroom', name: 'Bath & Spa', emoji: '🛁' },
  { id: 'hobby', name: 'Hobby & Skill', emoji: '🎨' },
  { id: 'tech', name: 'Tech & Fun', emoji: '📺' },
  { id: 'decor', name: 'Decor', emoji: '🪴' },
  { id: 'outdoor', name: 'Outdoor', emoji: '🌳' },
];

CCS.data.catalog = [
  // --- Comfort -------------------------------------------------------------
  { id: 'kingBed', name: 'King Bed', emoji: '🛏️', cat: 'comfort', room: 'bedroom', price: 600,
    desc: 'Sleep like royalty. More rest in less time.',
    actions: [{ id: 'sleepLux', label: 'Sleep (luxury)', emoji: '😴', time: 7, sleep: true,
      effects: { needs: { energy: +100, stress: -45, hygiene: -4 }, feed: 'Slept like royalty.' } }] },
  { id: 'reclinerSofa', name: 'Recliner Sofa', emoji: '🛋️', cat: 'comfort', room: 'living', price: 340,
    desc: 'Peak lounging. Fun and rest at once.',
    actions: [{ id: 'lounge', label: 'Lounge', emoji: '😌', time: 1, effects: { needs: { fun: +26, energy: +14, stress: -14 } } }] },
  { id: 'readingNook', name: 'Reading Nook', emoji: '🪑', cat: 'comfort', room: 'living', price: 200,
    desc: 'A snug corner for stories and calm.',
    actions: [{ id: 'cozyRead', label: 'Cozy read', emoji: '📖', time: 1, tag: 'selfcare',
      effects: { needs: { fun: +14, stress: -18 }, skills: { academics: +4 }, xp: +3 } }] },

  // --- Kitchen -------------------------------------------------------------
  { id: 'chefRange', name: "Chef's Range", emoji: '🍳', cat: 'kitchen', room: 'kitchen', price: 500,
    desc: 'Restaurant-grade cooking. Big meals, big skill.',
    actions: [{ id: 'gourmet', label: 'Cook gourmet meal', emoji: '👨‍🍳', time: 1.5, tag: 'eat',
      effects: { needs: { hunger: +85, stress: -8, fun: +8 }, skills: { cooking: +9 }, xp: +6 }, requires: { minEnergy: 8 } }] },
  { id: 'espressoMachine', name: 'Espresso Machine', emoji: '☕', cat: 'kitchen', room: 'kitchen', price: 220,
    desc: 'A real pick-me-up on demand.',
    actions: [{ id: 'espresso', label: 'Make espresso', emoji: '☕', time: 0.25, tag: 'drink',
      effects: { needs: { energy: +26, stress: -4, bladder: -6 } } }] },
  { id: 'smoothieBar', name: 'Smoothie Bar', emoji: '🥤', cat: 'kitchen', room: 'kitchen', price: 160,
    desc: 'Blend up a healthy boost.',
    actions: [{ id: 'smoothie', label: 'Blend a smoothie', emoji: '🍓', time: 0.5, tag: 'eat',
      effects: { needs: { hunger: +30, energy: +12 }, skills: { fitness: +2 } } }] },

  // --- Bath & Spa ----------------------------------------------------------
  { id: 'rainShower', name: 'Rainfall Shower', emoji: '🚿', cat: 'bathroom', room: 'bathroom', price: 300,
    desc: 'Spa-quality rinse. Melts stress away.',
    actions: [{ id: 'spaShower', label: 'Rainfall shower', emoji: '🌧️', time: 0.5, tag: 'shower',
      effects: { needs: { hygiene: +100, stress: -18, confidence: +6 }, feed: 'Heavenly shower.' } }] },
  { id: 'bathtub', name: 'Soaking Tub', emoji: '🛁', cat: 'bathroom', room: 'bathroom', price: 420,
    desc: 'A long bubble bath fixes everything.',
    actions: [{ id: 'bubbleBath', label: 'Take a bubble bath', emoji: '🫧', time: 1.5, tag: 'selfcare',
      effects: { needs: { hygiene: +90, stress: -30, fun: +12, confidence: +5 } } }] },

  // --- Hobby & Skill (new skill sources!) ----------------------------------
  { id: 'treadmill', name: 'Treadmill', emoji: '🏃', cat: 'hobby', room: 'study', price: 450,
    desc: 'Get your steps (and gains) in at home.',
    actions: [{ id: 'workout', label: 'Work out', emoji: '💪', time: 1, tag: 'workout',
      effects: { needs: { energy: -12, stress: -16, fun: +6, hygiene: -10 }, skills: { fitness: +9 }, xp: +5 }, requires: { minEnergy: 15 } }] },
  { id: 'yogaMat', name: 'Yoga Mat', emoji: '🧘', cat: 'hobby', room: 'study', price: 90,
    desc: 'Stretch, breathe, reset.',
    actions: [{ id: 'homeYoga', label: 'Do yoga', emoji: '🧘', time: 1, tag: 'selfcare',
      effects: { needs: { stress: -24, energy: +8, confidence: +6 }, skills: { fitness: +4 } } }] },
  { id: 'keyboard', name: 'Keyboard', emoji: '🎹', cat: 'hobby', room: 'study', price: 380,
    desc: 'Write songs and practice your craft.',
    actions: [{ id: 'playMusic', label: 'Practice music', emoji: '🎶', time: 1.5, tag: 'music',
      effects: { needs: { fun: +18, stress: -10, energy: -6 }, skills: { music: +9 }, xp: +5 } }] },
  { id: 'easel', name: 'Art Easel', emoji: '🎨', cat: 'hobby', room: 'study', price: 260,
    desc: 'Paint your feelings — and maybe sell them.',
    actions: [{ id: 'paint', label: 'Paint a piece', emoji: '🖼️', time: 2, tag: 'art',
      effects: { needs: { fun: +16, stress: -8, energy: -8 }, skills: { creativity: +9 }, money: +40, xp: +6 }, requires: { minEnergy: 12 } }] },
  { id: 'potteryWheel', name: 'Pottery Wheel', emoji: '🏺', cat: 'hobby', room: 'study', price: 210,
    desc: 'Get your hands messy and creative.',
    actions: [{ id: 'pottery', label: 'Throw pottery', emoji: '🏺', time: 1.5, tag: 'art',
      effects: { needs: { fun: +14, stress: -12 }, skills: { creativity: +6, style: +3 }, xp: +4 } }] },

  // --- Tech & Fun ----------------------------------------------------------
  { id: 'gamingPC', name: 'Gaming PC', emoji: '🖥️', cat: 'tech', room: 'bedroom', price: 700,
    desc: 'Game hard — or stream for followers.',
    actions: [
      { id: 'gaming', label: 'Game for hours', emoji: '🎮', time: 2, effects: { needs: { fun: +38, energy: -12, stress: -10, social: -4 } } },
      { id: 'stream', label: 'Livestream', emoji: '🔴', time: 3, tag: 'creator',
        effects: { needs: { fun: +12, energy: -14, stress: +6 }, followers: +40, money: +50, skills: { creativity: +5 }, xp: +6 } },
    ] },
  { id: 'smartTv', name: 'Home Theater', emoji: '📺', cat: 'tech', room: 'living', price: 400,
    desc: 'Movie nights hit different.',
    actions: [{ id: 'movieNight', label: 'Movie night', emoji: '🍿', time: 2, effects: { needs: { fun: +34, social: +10, stress: -14, energy: +6 } } }] },
  { id: 'soundSystem', name: 'Sound System', emoji: '🔊', cat: 'tech', room: 'living', price: 300,
    desc: 'Turn the living room into a dancefloor.',
    actions: [{ id: 'danceParty', label: 'Dance party', emoji: '🪩', time: 1, tag: 'workout',
      effects: { needs: { fun: +28, energy: -10, stress: -12 }, skills: { fitness: +3 } } }] },

  // --- Decor (raises ambiance → keeps Environment high) --------------------
  { id: 'pottedPlant', name: 'Potted Plant', emoji: '🪴', cat: 'decor', room: 'living', price: 60, ambiance: 6 },
  { id: 'scentedCandle', name: 'Scented Candles', emoji: '🕯️', cat: 'decor', room: 'living', price: 40, ambiance: 4,
    actions: [{ id: 'lightCandles', label: 'Light the candles', emoji: '🕯️', time: 0.25, tag: 'selfcare', effects: { needs: { stress: -10, environment: +4 } } }] },
  { id: 'fairyLights', name: 'Fairy Lights', emoji: '✨', cat: 'decor', room: 'bedroom', price: 50, ambiance: 5 },
  { id: 'areaRug', name: 'Area Rug', emoji: '🟫', cat: 'decor', room: 'living', price: 110, ambiance: 7 },
  { id: 'wallArt', name: 'Wall Art', emoji: '🖼️', cat: 'decor', room: 'living', price: 130, ambiance: 9 },
  { id: 'aquarium', name: 'Aquarium', emoji: '🐠', cat: 'decor', room: 'living', price: 300, ambiance: 12,
    actions: [{ id: 'watchFish', label: 'Watch the fish', emoji: '🐟', time: 0.5, tag: 'selfcare', effects: { needs: { stress: -16, fun: +6 } } }] },
  { id: 'bigWindow', name: 'Bay Window', emoji: '🪟', cat: 'decor', room: 'living', price: 520, ambiance: 15, unlock: (s) => s.player.level >= 4, req: 'Reach Lv 4' },

  // --- Outdoor -------------------------------------------------------------
  { id: 'gardenBed', name: 'Garden Bed', emoji: '🌷', cat: 'outdoor', room: 'outdoor', price: 150, ambiance: 6,
    actions: [{ id: 'gardenHome', label: 'Tend the garden', emoji: '🌱', time: 1, tag: 'selfcare', effects: { needs: { stress: -14, fun: +10, environment: +6 }, skills: { fitness: +2 } } }] },
  { id: 'firePit', name: 'Fire Pit', emoji: '🔥', cat: 'outdoor', room: 'outdoor', price: 250, ambiance: 6,
    actions: [{ id: 'firepitHang', label: 'Fire pit hangout', emoji: '🔥', time: 1.5, tag: 'social', effects: { needs: { social: +16, fun: +18, stress: -12 } }, requires: { afterHour: 17 } }] },
  { id: 'homePool', name: 'Swimming Pool', emoji: '🏊', cat: 'outdoor', room: 'outdoor', price: 1200, ambiance: 10, unlock: (s) => s.player.level >= 6, req: 'Reach Lv 6',
    actions: [{ id: 'swim', label: 'Go for a swim', emoji: '🏊', time: 1.5, tag: 'workout', effects: { needs: { fun: +24, hygiene: +20, energy: -10, stress: -14 }, skills: { fitness: +7 }, xp: +5 } }] },
];
CCS.data.catalogById = Object.fromEntries(CCS.data.catalog.map((c) => [c.id, c]));

// Register catalog actions into the global action lookup, tagging them with an
// ownership requirement so they can only be used once the item is bought.
for (const item of CCS.data.catalog) {
  for (const a of item.actions || []) {
    CCS.data.actionById[a.id] = { ...a, objectId: item.id, objectName: item.name, requires: { ...(a.requires || {}), owns: item.id } };
  }
}
