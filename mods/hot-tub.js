// ============================================================================
// MOD: Hot Tub  🛁
// Adds a brand-new piece of furniture to the world with its own interaction.
// This is how you add new "stuff" to the game — the core of Sims-style mods.
// ============================================================================

CCS.registerMod({
  id: 'hot-tub',
  name: 'Hot Tub',
  icon: '🛁',
  version: '1.0.0',
  author: 'CCS Team',
  description: 'Drops a luxury hot tub into the lounge. Boosts Fun, Hygiene and Social all at once.',

  onEnable(api) {
    api.addObject({
      id: 'hot-tub',
      name: 'Hot Tub',
      emoji: '🛁',
      col: 14, row: 12, w: 2, h: 1,
      tint: 'rgba(124,198,255,0.35)',
      action: {
        label: 'Soak',
        duration: 3.5,
        verb: 'soaking 🫧',
        effects: { fun: +45, hygiene: +40, social: +20, energy: +10 },
      },
    });
    api.notify('🛁 A hot tub appeared in the lounge!');
  },
});
