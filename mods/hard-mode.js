// ============================================================================
// MOD: Hard Mode  🔥
// Cranks up how fast your needs drain — for players who want a real challenge.
// Shows how a mod can re-balance the whole game by tweaking need decay rates.
// ============================================================================

CCS.registerMod({
  id: 'hard-mode',
  name: 'Hard Mode',
  icon: '🔥',
  version: '1.0.0',
  author: 'CCS Team',
  description: 'Needs drain roughly twice as fast. Survival is a full-time job. (Restores to normal when off.)',

  onEnable(api) {
    for (const key of Object.keys(CCS.needsDef)) {
      api.setNeedDecay(key, CCS.needsDef[key].decay * 2);
    }
    api.notify('🔥 Hard Mode on — good luck!');
  },
});
