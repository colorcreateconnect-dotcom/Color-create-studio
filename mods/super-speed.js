// ============================================================================
// MOD: Super Speed  🏃
// Move around the lot much faster. Shows how a mod can tweak a config value
// and have it automatically restored when switched off.
// ============================================================================

CCS.registerMod({
  id: 'super-speed',
  name: 'Super Speed',
  icon: '🏃',
  version: '1.0.0',
  author: 'CCS Team',
  description: 'Zoom around at 2.4× normal walking speed.',

  onEnable(api) {
    // setConfig remembers the old value and restores it on disable for you.
    api.setConfig('playerSpeed', CCS.config.playerSpeed * 2.4);
  },
});
