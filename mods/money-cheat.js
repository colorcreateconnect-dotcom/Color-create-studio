// ============================================================================
// MOD: Money Cheat  💰
// The classic "motherlode". Instantly gives you cash, and keeps you topped up.
// ----------------------------------------------------------------------------
// This is the simplest kind of mod — a great starting template.
// ============================================================================

CCS.registerMod({
  id: 'money-cheat',
  name: 'Money Cheat',
  icon: '💰',
  version: '1.0.0',
  author: 'CCS Team',
  description: 'Get $10,000 instantly, then a steady trickle of income while enabled.',

  onEnable(api) {
    api.addMoney(10000);
    api.notify('💰 Motherlode! +$10,000');

    // Give a little extra cash every in-game hour.
    api.everyGameMinutes(60, () => api.addMoney(500));
  },

  // Nothing to clean up manually — the trickle stops automatically on disable.
  onDisable(api) {
    api.notify('💸 The money train has left.');
  },
});
