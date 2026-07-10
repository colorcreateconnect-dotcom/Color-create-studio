// ============================================================================
// data-events-packs.js — random events (#11), expansion packs (#12),
// mood definitions (#6), traits and life paths.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

// --- Mood states (#6) ------------------------------------------------------
// `mods` are outcome multipliers/flags the engine applies (mood affects action
// outcomes). e.g. Inspired boosts creativity; Burnt Out blocks high-energy.
CCS.data.moods = {
  Inspired:   { emoji: '💡', blurb: 'Ideas everywhere.', mods: { creativity: 1.5, xp: 1.2 } },
  Happy:      { emoji: '😄', blurb: 'Life is good.',     mods: {} },
  Confident:  { emoji: '😎', blurb: 'Main character energy.', mods: { charisma: 1.4, socialSuccess: 1.2 } },
  Flirty:     { emoji: '😏', blurb: 'Feeling bold.',     mods: { romance: 1.3, socialSuccess: 1.15 } },
  Focused:    { emoji: '🎯', blurb: 'Locked in.',        mods: { academics: 1.4, business: 1.3, xp: 1.15 } },
  Bored:      { emoji: '🥱', blurb: 'Need something fun.', mods: { xp: 0.9 } },
  Lonely:     { emoji: '🥺', blurb: 'Craving connection.', mods: { socialSuccess: 0.85 } },
  Embarrassed:{ emoji: '😳', blurb: 'Cringing a little.', mods: { socialSuccess: 0.8, charisma: 0.8 } },
  Stressed:   { emoji: '😩', blurb: 'Too much at once.',  mods: { socialSuccess: 0.85, xp: 0.9 } },
  'Burnt Out':{ emoji: '🫠', blurb: 'Running on empty.',  mods: { blockHighEnergy: true, xp: 0.75 } },
};

// --- Traits ----------------------------------------------------------------
CCS.data.traits = [
  { id: 'Creative',    emoji: '🎨', blurb: 'Creativity grows faster.' },
  { id: 'Charismatic', emoji: '💬', blurb: 'Social wins come easier.' },
  { id: 'Ambitious',   emoji: '📈', blurb: 'Extra XP from work & study.' },
  { id: 'Athletic',    emoji: '🏃', blurb: 'Energy drains slower.' },
  { id: 'Bookworm',    emoji: '📚', blurb: 'Academics grow faster.' },
  { id: 'Foodie',      emoji: '🍜', blurb: 'Food satisfies more.' },
  { id: 'Romantic',    emoji: '💕', blurb: 'Romance builds faster.' },
  { id: 'Neat',        emoji: '🧼', blurb: 'Hygiene & home stay tidy.' },
  { id: 'Extrovert',   emoji: '🎉', blurb: 'Bigger social boosts.' },
  { id: 'Chill',       emoji: '🧘', blurb: 'Stress builds slower.' },
];
CCS.data.traitById = Object.fromEntries(CCS.data.traits.map((t) => [t.id, t]));

// --- Life paths (chosen in "First Day Energy") -----------------------------
CCS.data.lifePaths = [
  { id: 'creative', name: 'Creative Soul', emoji: '🎨', blurb: 'Art, content, self-expression.', skill: 'creativity' },
  { id: 'social',   name: 'Social Star',   emoji: '🌟', blurb: 'People, parties, popularity.', skill: 'charisma' },
  { id: 'ambitious',name: 'Go-Getter',     emoji: '💼', blurb: 'Career, money, the grind.', skill: 'business' },
  { id: 'scholar',  name: 'Scholar',       emoji: '🎓', blurb: 'Learning, mastery, growth.', skill: 'academics' },
];
CCS.data.lifePathById = Object.fromEntries(CCS.data.lifePaths.map((p) => [p.id, p]));

// --- Expansion packs (#12) -------------------------------------------------
// Content everywhere is tagged with a `pack`. A pack's content is "active" once
// state.packs[id].unlocked is true. Pets is on from the start. Others unlock
// via quests/careers/checks (progression.js re-checks `unlock`).
CCS.data.packs = [
  { id: 'pets', name: 'Pets Pack', emoji: '🐾', default: true, req: 'Available immediately',
    description: 'Adopt dogs, cats and bunnies. Pet Park, bonding and cute events.',
    adds: { worlds: ['petPark'], objects: ['petBowl'], npcs: ['rex'] } },
  { id: 'school', name: 'School Pack', emoji: '🎓', req: 'Enroll in school',
    description: 'Majors, classes, homework, exams and campus life.',
    unlock: (s) => !!s.school, adds: { worlds: ['campus'], careers: ['student'], npcs: ['jade', 'professorlee'] } },
  { id: 'career', name: 'Career Pack', emoji: '💼', req: 'Choose your first career',
    description: 'Ten career ladders with promotions and paydays.',
    unlock: (s) => !!s.career, adds: { worlds: ['careerDistrict'], npcs: ['dana'] } },
  { id: 'fashion', name: 'Fashion Pack', emoji: '👗', req: 'Finish style/closet quests',
    description: 'Outfits, the Fashion District, photoshoots and runway looks.',
    unlock: (s) => (s.flags.styleQuestsDone || 0) >= 2, adds: { worlds: ['fashionDistrict'], npcs: ['coco'] } },
  { id: 'fame', name: 'Fame Pack', emoji: '🌟', req: 'Grow as a creator / 1k followers',
    description: 'Followers, brand deals, red carpets, the Fame District.',
    unlock: (s) => s.flags.creatorCh1 || s.player.followers >= 1000, adds: { worlds: ['fameDistrict'], npcs: ['brandi'] } },
  { id: 'nightlife', name: 'Nightlife Pack', emoji: '🌃', req: 'Young adult / social questline',
    description: 'Clubs, karaoke and rooftop nights after dark.',
    unlock: (s) => s.player.ageStage !== 'teen' || s.flags.socialQuestlineDone, adds: { worlds: ['nightlife'], npcs: ['leo', 'zuri'] } },
  { id: 'business', name: 'Business Pack', emoji: '🏙️', req: 'Earn $1k / entrepreneur questline',
    description: 'Pitches, pop-ups and building your empire.',
    unlock: (s) => s.player.money >= 1000 || s.flags.entrepreneurDone, adds: { worlds: ['businessDistrict'] } },
  { id: 'travel', name: 'Travel Pack', emoji: '✈️', req: 'Reach level 8',
    description: 'Getaways that recharge you completely.',
    unlock: (s) => s.player.level >= 8, adds: { worlds: ['travelHub'] } },
  { id: 'wedding', name: 'Wedding Pack', emoji: '💍', req: 'Reach a romance milestone',
    description: 'Venues, vows and the big day.',
    unlock: (s) => Object.values(s.npcs).some((n) => (n.romance || 0) >= 80), adds: { worlds: ['weddingWorld'] } },
  { id: 'wellness', name: 'Wellness Pack', emoji: '🧘', req: 'Finish the self-care questline',
    description: 'Spa days, yoga and the Wellness Retreat.',
    unlock: (s) => s.flags.selfCareDone, adds: { worlds: ['wellnessRetreat'] } },
];
CCS.data.packById = Object.fromEntries(CCS.data.packs.map((p) => [p.id, p]));

// --- Random events (#11) ---------------------------------------------------
// trigger(state) decides eligibility; the event system rolls among the eligible.
CCS.data.events = [
  { id: 'petMess', icon: '🐾', text: 'Your pet made a little mess!', weight: 3,
    trigger: (s) => s.pets.length > 0,
    effects: { needs: { environment: -12 }, petNeeds: { cleanliness: -20 } } },
  { id: 'npcText', icon: '💬', text: '{npc} texted you just to check in. Sweet!', weight: 3,
    trigger: (s) => Object.keys(s.npcs).length > 0,
    effects: { needs: { social: +10, confidence: +3 }, npcMood: +5 } },
  { id: 'wokeInspired', icon: '💡', text: 'You woke up feeling inspired!', weight: 2,
    trigger: (s) => s.time.hour >= 6 && s.time.hour <= 10,
    effects: { needs: { confidence: +8, stress: -6 }, skills: { creativity: +4 } } },
  { id: 'fridgeEmpty', icon: '🧊', text: 'Your fridge is basically empty…', weight: 2,
    trigger: (s) => (s.needs.hunger || 0) < 50,
    effects: { needs: { fun: -4 }, feed: 'Time for a grocery run (grab a snack or cook).' } },
  { id: 'neighborInvite', icon: '🚪', text: 'Noah invited you to hang out later.', weight: 2,
    trigger: (s) => s.worlds.home?.unlocked !== false,
    effects: { needs: { social: +8 }, npcMood: +4 } },
  { id: 'jobPosting', icon: '📋', text: 'You spotted a promising job posting.', weight: 2,
    trigger: (s) => !s.career,
    effects: { needs: { confidence: +5 }, feed: 'Maybe it\'s time to pick a career?' } },
  { id: 'classmateStudy', icon: '📚', text: 'Jade wants to study together.', weight: 2,
    trigger: (s) => !!s.school,
    effects: { needs: { social: +8 }, skills: { academics: +3 } } },
  { id: 'rivalShade', icon: '🌩️', text: 'Kai posted some shade about you online.', weight: 2,
    trigger: (s) => s.player.followers > 50,
    effects: { needs: { confidence: -8, stress: +8 }, feed: 'Rise above it. (Confidence took a hit.)' } },
  { id: 'foundCash', icon: '💵', text: 'You found $40 in an old jacket!', weight: 1,
    trigger: () => true, effects: { money: +40 } },
  { id: 'goodHairDay', icon: '💇', text: 'It\'s a good hair day. You feel unstoppable.', weight: 1,
    trigger: () => true, effects: { needs: { confidence: +10 } } },
  { id: 'brandDeal', icon: '🤝', text: 'A brand slid into your DMs with a deal!', weight: 2,
    trigger: (s) => s.player.followers >= 500,
    effects: { money: +200, needs: { confidence: +8 }, feed: 'Cha-ching. Being known pays off.' } },
];
