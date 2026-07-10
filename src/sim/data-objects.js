// ============================================================================
// data-objects.js — home objects (#10) + the whole action catalog.
//
// An "action" is a data record: what it costs in time, what it changes, and
// what it requires. UI buttons only carry an action id; engine.js looks it up
// and runs it. That decoupling is what keeps this multiplayer-ready.
//
// effects:  { needs:{}, money, xp, skills:{}, followers, flags:{}, petNeeds:{}, feed }
// requires: { minEnergy, afterHour, beforeHour, flag, hasPet, world, money }
// special:  routes to a system handler (work/study/exam/adopt/etc.)
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

CCS.data.objects = [
  { id: 'bed', name: 'Bed', emoji: '🛏️', room: 'bedroom', actions: [
    { id: 'sleep', label: 'Sleep', emoji: '😴', time: 8, sleep: true,
      effects: { needs: { energy: +95, stress: -35, hygiene: -5 }, feed: 'Slept and recharged.' } },
    { id: 'nap', label: 'Power nap', emoji: '💤', time: 2,
      effects: { needs: { energy: +35, stress: -12 } } },
  ]},
  { id: 'fridge', name: 'Fridge', emoji: '🧊', room: 'kitchen', actions: [
    { id: 'cook', label: 'Cook a meal', emoji: '🍳', time: 1, tag: 'eat',
      effects: { needs: { hunger: +55, stress: -4 }, skills: { cooking: +4 }, xp: +4 }, requires: { minEnergy: 8 } },
    { id: 'snack', label: 'Grab a snack', emoji: '🍎', time: 0.5, tag: 'eat',
      effects: { needs: { hunger: +25 } } },
  ]},
  { id: 'shower', name: 'Shower', emoji: '🚿', room: 'bathroom', actions: [
    { id: 'shower', label: 'Shower', emoji: '🚿', time: 0.5, tag: 'shower',
      effects: { needs: { hygiene: +90, stress: -8, confidence: +4 }, feed: 'Freshened up.' } },
  ]},
  { id: 'mirror', name: 'Mirror', emoji: '🪞', room: 'bedroom', actions: [
    { id: 'hype', label: 'Hype yourself up', emoji: '💪', time: 0.5, tag: 'selfcare',
      effects: { needs: { confidence: +12, stress: -5 } } },
    { id: 'useMirror', label: 'Do your look', emoji: '💄', time: 0.5, tag: 'style',
      effects: { needs: { confidence: +8 }, skills: { style: +5 }, xp: +3 } },
  ]},
  { id: 'closet', name: 'Closet', emoji: '👚', room: 'bedroom', actions: [
    { id: 'changeOutfit', label: 'Change outfit', emoji: '🧥', time: 0.5, tag: 'style', special: 'changeOutfit',
      effects: { needs: { confidence: +6 }, skills: { style: +3 } } },
    { id: 'saveLook', label: 'Save this look', emoji: '📸', time: 0.5, tag: 'style', special: 'saveLook',
      effects: { needs: { confidence: +5 }, skills: { style: +4 }, xp: +4 } },
  ]},
  { id: 'phone', name: 'Phone', emoji: '📱', room: 'anywhere', actions: [
    { id: 'scroll', label: 'Scroll feed', emoji: '📲', time: 0.5,
      effects: { needs: { fun: +18, stress: +4, social: +4 } } },
    { id: 'postContent', label: 'Post content', emoji: '✨', time: 1, tag: 'creator',
      effects: { needs: { fun: +8, confidence: +5 }, skills: { creativity: +5 }, followers: +12, xp: +5 } },
    { id: 'callFriend', label: 'Call a friend', emoji: '📞', time: 0.5, tag: 'social', special: 'callFriend',
      effects: { needs: { social: +18, stress: -5 } } },
    { id: 'textFriend', label: 'Send a message', emoji: '💬', time: 0.25, tag: 'social', special: 'textFriend',
      effects: { needs: { social: +10 } } },
  ]},
  { id: 'couch', name: 'Couch', emoji: '🛋️', room: 'living', actions: [
    { id: 'watchTv', label: 'Watch TV', emoji: '📺', time: 1,
      effects: { needs: { fun: +30, energy: +8, stress: -10 } } },
  ]},
  { id: 'desk', name: 'Desk', emoji: '🖊️', room: 'bedroom', actions: [
    { id: 'project', label: 'Work on a passion project', emoji: '🎨', time: 2, tag: 'create',
      effects: { needs: { fun: +12, energy: -12, stress: +5 }, skills: { creativity: +8 }, xp: +6 }, requires: { minEnergy: 15 } },
  ]},
  { id: 'laptop', name: 'Laptop', emoji: '💻', room: 'bedroom', actions: [
    { id: 'freelance', label: 'Do a freelance gig', emoji: '💸', time: 3, tag: 'work',
      effects: { needs: { energy: -18, fun: -6, stress: +10 }, money: +90, skills: { business: +4 }, xp: +6 }, requires: { minEnergy: 20 } },
    { id: 'studyOnline', label: 'Study online', emoji: '📖', time: 2, tag: 'study',
      effects: { needs: { energy: -10, fun: -6 }, skills: { academics: +6 }, xp: +4 }, requires: { minEnergy: 12 } },
  ]},
  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', room: 'living', actions: [
    { id: 'read', label: 'Read a book', emoji: '📗', time: 1, tag: 'selfcare',
      effects: { needs: { fun: +12, stress: -14, energy: -4 }, skills: { academics: +4 }, xp: +3 } },
  ]},
  { id: 'calendar', name: 'Calendar', emoji: '📅', room: 'bedroom', actions: [
    { id: 'planDay', label: 'Plan your day', emoji: '🗓️', time: 0.5, tag: 'selfcare',
      effects: { needs: { stress: -12, confidence: +4, environment: +4 } } },
  ]},
  { id: 'broom', name: 'Cleaning kit', emoji: '🧹', room: 'living', actions: [
    { id: 'tidyUp', label: 'Tidy up the place', emoji: '🧽', time: 1, tag: 'clean',
      effects: { needs: { environment: +35, hygiene: -4, stress: -6 }, feed: 'The place looks great now.' } },
  ]},
  { id: 'petBowl', name: 'Pet station', emoji: '🥣', room: 'living', requires: { hasPet: true }, actions: [
    { id: 'fillBowl', label: 'Fill the pet bowl', emoji: '🍖', time: 0.5, special: 'feedPet', tag: 'pet',
      effects: { petNeeds: { hunger: +60, cleanliness: -5 }, needs: { social: +4 } } },
  ]},
];

// --- World actions (surfaced when you're in / have unlocked that world) -----
CCS.data.worldActions = {
  // Pet Park
  walkPet:     { id: 'walkPet', label: 'Walk your pet', emoji: '🦮', time: 1, world: 'petPark', special: 'walkPet', tag: 'pet',
    effects: { needs: { fun: +15, energy: -8, social: +8, stress: -10 }, petNeeds: { energy: -10, affection: +25, hunger: -8 } }, requires: { hasPet: true } },
  petPlaydate: { id: 'petPlaydate', label: 'Pet playdate', emoji: '🐕', time: 1, world: 'petPark', tag: 'pet',
    effects: { needs: { fun: +18, social: +12 }, petNeeds: { affection: +20, energy: -12 } }, requires: { hasPet: true } },

  // Campus
  attendClass: { id: 'attendClass', label: 'Attend class', emoji: '📝', time: 3, world: 'campus', special: 'attendClass',
    effects: {}, requires: { afterHour: 8, beforeHour: 15 } },
  study:       { id: 'study', label: 'Study', emoji: '📚', time: 2, world: 'campus', special: 'study',
    effects: {} },
  exam:        { id: 'exam', label: 'Take an exam', emoji: '🧪', time: 2, world: 'campus', special: 'exam',
    effects: {} },

  // Career District
  work:        { id: 'work', label: 'Go to work', emoji: '💼', time: 4, special: 'work', effects: {} },

  // Fashion District
  styleSession:{ id: 'styleSession', label: 'Style session', emoji: '🛍️', time: 2, world: 'fashionDistrict', tag: 'style',
    effects: { needs: { fun: +15, confidence: +10 }, skills: { style: +8 }, xp: +6 } },
  photoshoot:  { id: 'photoshoot', label: 'Do a photoshoot', emoji: '📷', time: 2, world: 'fashionDistrict', tag: 'style',
    effects: { needs: { confidence: +14 }, skills: { style: +6 }, followers: +30, xp: +6 } },

  // Fame District
  contentDay:  { id: 'contentDay', label: 'Batch content', emoji: '🎬', time: 3, world: 'fameDistrict', tag: 'creator',
    effects: { needs: { energy: -14, stress: +8 }, skills: { creativity: +8 }, followers: +80, money: +60, xp: +8 } },
  redCarpet:   { id: 'redCarpet', label: 'Walk a red carpet', emoji: '🌟', time: 2, world: 'fameDistrict',
    effects: { needs: { confidence: +20, fun: +18 }, followers: +150, xp: +10 } },

  // Nightlife
  danceOut:    { id: 'danceOut', label: 'Go dancing', emoji: '🕺', time: 3, world: 'nightlife', tag: 'social',
    effects: { needs: { fun: +30, social: +20, energy: -18, stress: -14 }, xp: +5 }, requires: { afterHour: 19 } },
  karaoke:     { id: 'karaoke', label: 'Karaoke night', emoji: '🎤', time: 2, world: 'nightlife', tag: 'social',
    effects: { needs: { fun: +26, social: +18, confidence: +10 }, skills: { music: +4 } }, requires: { afterHour: 19 } },

  // Business
  pitchIdea:   { id: 'pitchIdea', label: 'Pitch an idea', emoji: '📊', time: 2, world: 'businessDistrict', tag: 'business',
    effects: { needs: { stress: +10, confidence: +6 }, skills: { business: +8 }, money: +120, xp: +7 } },
  runPopup:    { id: 'runPopup', label: 'Run a pop-up shop', emoji: '🏪', time: 4, world: 'businessDistrict', tag: 'business',
    effects: { needs: { energy: -20, stress: +12 }, money: +260, skills: { business: +10 }, xp: +9 } },

  // Travel / Wedding / Wellness
  weekendTrip: { id: 'weekendTrip', label: 'Take a weekend trip', emoji: '🏝️', time: 12, world: 'travelHub',
    effects: { needs: { fun: +40, stress: -50, energy: +20, environment: +10 }, money: -150, xp: +8 } },
  planWedding: { id: 'planWedding', label: 'Plan your wedding', emoji: '💒', time: 4, world: 'weddingWorld', special: 'planWedding',
    effects: { needs: { fun: +25, confidence: +15 }, xp: +12 } },
  spaDay:      { id: 'spaDay', label: 'Spa day', emoji: '💆', time: 3, world: 'wellnessRetreat', tag: 'selfcare',
    effects: { needs: { stress: -40, hygiene: +20, confidence: +10 }, money: -60 } },
  meditate:    { id: 'meditate', label: 'Meditate', emoji: '🧘', time: 1, world: 'wellnessRetreat', tag: 'selfcare',
    effects: { needs: { stress: -25, confidence: +6, energy: +8 } } },
};

// Build one lookup of every action id -> def (object actions + world actions).
CCS.data.actionById = {};
for (const obj of CCS.data.objects) {
  for (const a of obj.actions) CCS.data.actionById[a.id] = { ...a, objectId: obj.id, objectName: obj.name };
}
for (const [id, a] of Object.entries(CCS.data.worldActions)) CCS.data.actionById[id] = a;
