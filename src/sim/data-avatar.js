// ============================================================================
// data-avatar.js — the 3D character's look: skin tones, hair, outfit presets.
//
// Everything the avatar renderer (src/render/avatar3d.js) draws is described
// here as data, and the player's chosen look lives in state.player.avatar —
// so looks persist in saves and, later, sync in multiplayer.
// ============================================================================

/* CCS is the shared global from core.js */
(() => {
  CCS.data = CCS.data || {};

  const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

  // --- Skin tones ------------------------------------------------------------
  CCS.data.skinTones = [
    { id: 'espresso', name: 'Espresso', hex: 0x51322a },
    { id: 'mocha', name: 'Mocha', hex: 0x6e4433 },
    { id: 'caramel', name: 'Caramel', hex: 0x96604a },
    { id: 'honey', name: 'Honey', hex: 0xbd8055 },
    { id: 'sand', name: 'Sand', hex: 0xdba982 },
    { id: 'porcelain', name: 'Porcelain', hex: 0xf0cfae },
  ].map((s) => ({ ...s, css: css(s.hex) }));

  // --- Hair ------------------------------------------------------------------
  CCS.data.hairStyles = [
    { id: 'ponytail', name: 'Long Pony', emoji: '💁‍♀️' },
    { id: 'curls', name: 'Big Curls', emoji: '👩‍🦱' },
    { id: 'braids', name: 'Long Braids', emoji: '💇‍♀️' },
    { id: 'bob', name: 'Sleek Bob', emoji: '👱‍♀️' },
    { id: 'buns', name: 'Space Buns', emoji: '👧' },
    { id: 'short', name: 'Short Crop', emoji: '🧑' },
  ];

  CCS.data.hairColors = [
    { id: 'noir', name: 'Noir', hex: 0x18121a },
    { id: 'espressoBrown', name: 'Espresso', hex: 0x33211b },
    { id: 'chestnut', name: 'Chestnut', hex: 0x5c3a26 },
    { id: 'honeyBlonde', name: 'Honey Blonde', hex: 0xc99a58 },
    { id: 'rose', name: 'Rose Pink', hex: 0xf07fb4 },
    { id: 'ice', name: 'Ice Blue', hex: 0x7fa8d9 },
    { id: 'ruby', name: 'Ruby', hex: 0x8e2a3e },
  ].map((c) => ({ ...c, css: css(c.hex) }));

  // --- Outfit presets (the closet from the concept art) -----------------------
  // `slots` names the wardrobe meshes to equip on the rigged character
  // (assets/characters/base_female.glb). Colors tint those slot materials.
  CCS.data.avatarOutfits = [
    {
      id: 'prettyPaid', name: 'Pretty & Paid', emoji: '💗', vibe: 'pink',
      slots: { top: 'top_cropHoodie', bottom: 'bottom_joggers', shoe: 'shoe_sneaker' },
      top: { color: 0xf27ab8, style: 'long', crop: true, hoodie: true, zipper: true },
      bottom: { style: 'joggers', color: 0xf58cc0, stars: 0xd63384 },
      shoes: { style: 'sneaker', main: 0xf5f0f2, accent: 0xf7a8ce },
    },
    {
      id: 'streetStar', name: 'Street Star', emoji: '🖤', vibe: 'street',
      slots: { top: 'top_cropHoodie', bottom: 'bottom_cargo', shoe: 'shoe_sneaker' },
      top: { color: 0x221e2b, style: 'long', crop: true, hoodie: true },
      bottom: { style: 'cargo', color: 0x2a2635, stars: 0xb9bdd9 },
      shoes: { style: 'sneaker', main: 0x17141f, accent: 0xe8e6f2 },
    },
    {
      id: 'angelEnergy', name: 'Angel Energy', emoji: '💙', vibe: 'denim',
      slots: { top: 'top_cropZip', bottom: 'bottom_flare', shoe: 'shoe_sneaker' },
      top: { color: 0x7fa8dd, style: 'long', crop: true, zipper: true },
      bottom: { style: 'flare', color: 0x6c94cf, stars: 0xf2f6ff },
      shoes: { style: 'sneaker', main: 0xf2f6ff, accent: 0x7fa8dd },
    },
    {
      id: 'nightOut', name: 'Night Out', emoji: '🌙', vibe: 'glam',
      slots: { dress: 'dress_slip', shoe: 'shoe_heel' },
      top: { color: 0x1c1522, style: 'strap' },
      bottom: { style: 'dress', color: 0x1c1522, sheen: true },
      shoes: { style: 'heel', main: 0x14101a, accent: 0xd4af37 },
    },
    {
      id: 'onStage', name: 'On Stage', emoji: '💚', vibe: 'bold',
      slots: { top: 'top_strap', bottom: 'bottom_cargo', shoe: 'shoe_heel' },
      top: { color: 0x8fd44f, style: 'strap', crop: true },
      bottom: { style: 'cargo', color: 0x9ade5b },
      shoes: { style: 'heel', main: 0x221e2b, accent: 0xd4af37 },
    },
    {
      id: 'luxuryVibes', name: 'Luxury Vibes', emoji: '💎', vibe: 'luxe',
      slots: { top: 'top_fur', bottom: 'bottom_skirt', shoe: 'shoe_heel' },
      top: { color: 0xf7a8ce, style: 'long', fur: true },
      bottom: { style: 'skirt', color: 0xf27ab8, sparkle: true },
      shoes: { style: 'heel', main: 0xf7a8ce, accent: 0xd4af37 },
    },
  ];
  CCS.data.avatarOutfitById = Object.fromEntries(CCS.data.avatarOutfits.map((o) => [o.id, o]));

  // --- Body proportion parameters ----------------------------------------------
  // Multipliers on the base fashion-doll measurements in avatar3d.js. Used
  // internally by the builder today; a future "body" tab can write per-player
  // overrides to state.player.avatar.proportions without any schema change.
  CCS.data.avatarProportions = {
    headScale: 1,       // head size (kept stylized, not chibi)
    shoulderWidth: 1,   // shoulder span
    torsoLength: 1,     // hip → shoulder distance
    waistScale: 1,      // waist radius
    hipWidth: 1,        // hip radius
    legLength: 1,       // floor → hip distance
    armLength: 1,       // shoulder → wrist distance
  };

  // --- Expression states (Phase 2: face) ----------------------------------------
  // Parameter sets the facial rig blends between. All values deliberately
  // subtle — fashion-doll poise, never a frozen grin or anime exaggeration.
  //   smile    -1..1  (corner drop .. soft smile)
  //   browLift -1..1  (knit .. raised)      browTilt: + = worried inner-up, - = determined
  //   browAsym  0..1  (one-brow raise, flirty)
  //   lid       0..1  (lids lowered — bedroom eyes / bored half-lids)
  //   eyeOpen   ~1    (eye white vertical openness)
  //   gazeX/Y  -1..1  (gaze bias)           wander: how much the eyes roam
  //   headTilt/headPitch (radians, added to the base pose)
  //   blush     0..1  (cheek color amount)
  CCS.data.expressions = {
    neutral:     { smile: 0.18, browLift: 0,     browTilt: 0,     browAsym: 0,   lid: 0.10, eyeOpen: 1,    gazeX: 0,    gazeY: 0,     wander: 1,   headTilt: 0,     headPitch: 0,     blush: 0.20 },
    happy:       { smile: 0.60, browLift: 0.35,  browTilt: 0,     browAsym: 0,   lid: 0.06, eyeOpen: 1,    gazeX: 0,    gazeY: 0.1,   wander: 1,   headTilt: 0.025, headPitch: -0.01, blush: 0.45 },
    confident:   { smile: 0.38, browLift: -0.08, browTilt: -0.15, browAsym: 0,   lid: 0.30, eyeOpen: 1,    gazeX: 0,    gazeY: 0.05,  wander: 0.6, headTilt: -0.02, headPitch: -0.05, blush: 0.25 },
    flirty:      { smile: 0.50, browLift: 0.15,  browTilt: 0,     browAsym: 0.8, lid: 0.42, eyeOpen: 1,    gazeX: 0.35, gazeY: 0.05,  wander: 0.7, headTilt: 0.06,  headPitch: 0.01,  blush: 0.60 },
    stressed:    { smile: -0.28, browLift: 0.22, browTilt: 0.55,  browAsym: 0,   lid: 0.12, eyeOpen: 1.05, gazeX: 0,    gazeY: 0,     wander: 1.3, headTilt: 0,     headPitch: 0.03,  blush: 0.15 },
    embarrassed: { smile: 0.12, browLift: 0.1,   browTilt: 0.30,  browAsym: 0,   lid: 0.35, eyeOpen: 0.98, gazeX: 0.15, gazeY: -0.55, wander: 0.5, headTilt: 0.03,  headPitch: 0.07,  blush: 1.0 },
    bored:       { smile: -0.08, browLift: -0.12, browTilt: 0,    browAsym: 0,   lid: 0.55, eyeOpen: 0.94, gazeX: 0.5,  gazeY: -0.05, wander: 0.8, headTilt: 0.05,  headPitch: 0.015, blush: 0.15 },
    focused:     { smile: 0.06, browLift: -0.22, browTilt: -0.35, browAsym: 0,   lid: 0.18, eyeOpen: 0.96, gazeX: 0,    gazeY: 0,     wander: 0.2, headTilt: -0.01, headPitch: 0.02,  blush: 0.18 },
  };

  // The simulation's mood states (needs-mood.js) → face expression states.
  // Mapping only — mood math is untouched.
  CCS.data.moodExpressionMap = {
    Inspired: 'happy', Happy: 'happy', Confident: 'confident', Flirty: 'flirty',
    Focused: 'focused', Bored: 'bored', Lonely: 'stressed', Stressed: 'stressed',
    'Burnt Out': 'stressed', Embarrassed: 'embarrassed',
  };

  // --- Live avatar state helpers ----------------------------------------------
  CCS.sim = CCS.sim || {};
  CCS.sim.avatar = {
    DEFAULTS: { skin: 'mocha', hairStyle: 'ponytail', hairColor: 'noir', outfit: 'prettyPaid' },

    get() {
      const p = CCS.state.player;
      if (!p.avatar) p.avatar = { ...this.DEFAULTS };
      return p.avatar;
    },

    // Resolved body proportions: global defaults + (optional, future) per-player
    // overrides. Read-only merge — nothing is written to the save here.
    proportions() {
      return { ...CCS.data.avatarProportions, ...(this.get().proportions || {}) };
    },

    // Current facial expression id, derived from the live mood state.
    expression() {
      return CCS.data.moodExpressionMap[CCS.state?.mood?.state] || 'neutral';
    },

    // Fully-resolved look (hex colors + outfit params) for the renderer.
    resolved() {
      const a = this.get();
      return {
        skin: (CCS.data.skinTones.find((s) => s.id === a.skin) || CCS.data.skinTones[1]).hex,
        hairStyle: a.hairStyle,
        hairColor: (CCS.data.hairColors.find((c) => c.id === a.hairColor) || CCS.data.hairColors[0]).hex,
        outfit: CCS.data.avatarOutfitById[a.outfit] || CCS.data.avatarOutfits[0],
      };
    },

    set(patch) {
      Object.assign(this.get(), patch);
      CCS.sim.save?.();
      CCS.events.emit('avatar-changed');
    },

    equipOutfit(id) {
      const o = CCS.data.avatarOutfitById[id];
      if (!o) return;
      this.set({ outfit: id });
      CCS.state.player.outfit = o.name; // lookbook + quests keep working
      CCS.ui?.toast?.(`${o.emoji} Equipped: ${o.name}`);
    },

    cycleOutfit() {
      const list = CCS.data.avatarOutfits;
      const i = list.findIndex((o) => o.id === this.get().outfit);
      const next = list[(i + 1) % list.length];
      this.equipOutfit(next.id);
      return next.name;
    },
  };
})();
