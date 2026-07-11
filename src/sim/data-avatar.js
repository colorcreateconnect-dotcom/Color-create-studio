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
  // The builder reads: top {color, style, crop, hoodie, zipper, fur, sparkle},
  // bottom {style, color, stars}, shoes {style, main, accent}.
  CCS.data.avatarOutfits = [
    {
      id: 'prettyPaid', name: 'Pretty & Paid', emoji: '💗', vibe: 'pink',
      top: { color: 0xf27ab8, style: 'long', crop: true, hoodie: true, zipper: true },
      bottom: { style: 'joggers', color: 0xf58cc0, stars: 0xd63384 },
      shoes: { style: 'sneaker', main: 0xf5f0f2, accent: 0xf7a8ce },
    },
    {
      id: 'streetStar', name: 'Street Star', emoji: '🖤', vibe: 'street',
      top: { color: 0x221e2b, style: 'long', crop: true, hoodie: true },
      bottom: { style: 'cargo', color: 0x2a2635, stars: 0xb9bdd9 },
      shoes: { style: 'sneaker', main: 0x17141f, accent: 0xe8e6f2 },
    },
    {
      id: 'angelEnergy', name: 'Angel Energy', emoji: '💙', vibe: 'denim',
      top: { color: 0x7fa8dd, style: 'long', crop: true, zipper: true },
      bottom: { style: 'flare', color: 0x6c94cf, stars: 0xf2f6ff },
      shoes: { style: 'sneaker', main: 0xf2f6ff, accent: 0x7fa8dd },
    },
    {
      id: 'nightOut', name: 'Night Out', emoji: '🌙', vibe: 'glam',
      top: { color: 0x1c1522, style: 'strap' },
      bottom: { style: 'dress', color: 0x1c1522, sheen: true },
      shoes: { style: 'heel', main: 0x14101a, accent: 0xd4af37 },
    },
    {
      id: 'onStage', name: 'On Stage', emoji: '💚', vibe: 'bold',
      top: { color: 0x8fd44f, style: 'strap', crop: true },
      bottom: { style: 'cargo', color: 0x9ade5b },
      shoes: { style: 'heel', main: 0x221e2b, accent: 0xd4af37 },
    },
    {
      id: 'luxuryVibes', name: 'Luxury Vibes', emoji: '💎', vibe: 'luxe',
      top: { color: 0xf7a8ce, style: 'long', fur: true },
      bottom: { style: 'skirt', color: 0xf27ab8, sparkle: true },
      shoes: { style: 'heel', main: 0xf7a8ce, accent: 0xd4af37 },
    },
  ];
  CCS.data.avatarOutfitById = Object.fromEntries(CCS.data.avatarOutfits.map((o) => [o.id, o]));

  // --- Live avatar state helpers ----------------------------------------------
  CCS.sim = CCS.sim || {};
  CCS.sim.avatar = {
    DEFAULTS: { skin: 'mocha', hairStyle: 'ponytail', hairColor: 'noir', outfit: 'prettyPaid' },

    get() {
      const p = CCS.state.player;
      if (!p.avatar) p.avatar = { ...this.DEFAULTS };
      return p.avatar;
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
