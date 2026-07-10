// ============================================================================
// MOD: Coffee Addiction  ☕
// The most advanced example. It adds a whole NEW need ("Caffeine") plus a
// coffee machine to refill it — and if your caffeine runs dry, your energy
// starts draining faster. Shows needs + objects + per-tick logic together.
// ============================================================================

CCS.registerMod({
  id: 'coffee-addiction',
  name: 'Coffee Addiction',
  icon: '☕',
  version: '1.0.0',
  author: 'CCS Team',
  description: 'Adds a Caffeine need and a coffee machine. Let it run empty and you crash — energy drains faster.',

  onEnable(api) {
    // 1) A new need shows up automatically in the needs panel.
    api.addNeed('caffeine', { label: 'Caffeine', emoji: '☕', decay: 0.6, color: '#c98a5e' });

    // 2) Somewhere to get your fix.
    api.addObject({
      id: 'coffee-machine',
      name: 'Coffee Machine',
      emoji: '☕',
      col: 3, row: 1, w: 1, h: 1,
      action: {
        label: 'Make coffee',
        duration: 1.5,
        verb: 'brewing ☕',
        effects: { caffeine: +80, energy: +15, bladder: -8 },
        cost: 5,
      },
    });

    // 3) The "addiction": when caffeine is low, energy suffers.
    api.everyGameMinutes(15, () => {
      const p = api.player;
      if (!p) return;
      if ((p.needs.caffeine ?? 0) < 20) {
        p.needs.energy = CCS.util.clamp(p.needs.energy - 4, 0, 100);
      }
    });

    api.notify('☕ Coffee machine installed. Stay caffeinated!');
  },
});
