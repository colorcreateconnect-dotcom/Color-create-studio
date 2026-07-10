// ============================================================================
// data-worlds.js — every world/area and how you unlock it (system #1).
//
// `unlock(state)` is a pure predicate the world system re-checks after each
// action for auto-unlocks (level, money, followers). Worlds can also be
// unlocked explicitly by quests/careers (they set worlds[id].unlocked = true).
// `req` is the human-readable requirement shown on locked cards.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

CCS.data.worlds = [
  {
    id: 'home', name: 'Home', emoji: '🏠', pack: null,
    description: 'Your cozy place. Sleep, eat, get ready, and run your life from here.',
    default: true, req: 'Unlocked by default',
    npcs: ['maya'], actions: ['home'],
  },
  {
    id: 'petPark', name: 'Pet Park', emoji: '🐾', pack: 'pets',
    description: 'A sunny park for pets to run, play, and make furry friends.',
    default: true, req: 'Unlocked by default',
    npcs: ['rex'], actions: ['walkPet', 'petPlaydate'],
  },
  {
    id: 'campus', name: 'School Campus', emoji: '🎓', pack: 'school',
    description: 'Lecture halls, the library, and a buzzing quad full of classmates.',
    req: 'Enroll in school',
    unlock: (s) => !!s.school,
    npcs: ['professorlee', 'jade'], actions: ['attendClass', 'study', 'exam'],
  },
  {
    id: 'careerDistrict', name: 'Career District', emoji: '💼', pack: 'career',
    description: 'Offices, studios, and storefronts where careers are made.',
    req: 'Choose a career',
    unlock: (s) => !!s.career,
    npcs: ['dana'], actions: ['work'],
  },
  {
    id: 'fashionDistrict', name: 'Fashion District', emoji: '👗', pack: 'fashion',
    description: 'Boutiques, runways, and mirrors everywhere. Serve looks.',
    req: 'Complete 3 style/closet quests',
    unlock: (s) => (s.flags.styleQuestsDone || 0) >= 3,
    npcs: ['coco'], actions: ['styleSession', 'photoshoot'],
  },
  {
    id: 'fameDistrict', name: 'Fame District', emoji: '🌟', pack: 'fame',
    description: 'Red carpets and creator studios. Where main characters live.',
    req: 'Reach 1,000 followers or finish Creator Path Ch.1',
    unlock: (s) => s.player.followers >= 1000 || s.flags.creatorCh1,
    npcs: ['brandi'], actions: ['contentDay', 'redCarpet'],
  },
  {
    id: 'nightlife', name: 'Nightlife District', emoji: '🌃', pack: 'nightlife',
    description: 'Clubs, rooftop bars and neon. Best after dark.',
    req: 'Reach young adult stage or finish the social questline',
    unlock: (s) => s.player.ageStage !== 'teen' || s.flags.socialQuestlineDone,
    npcs: ['leo'], actions: ['danceOut', 'karaoke'],
  },
  {
    id: 'businessDistrict', name: 'Business District', emoji: '🏙️', pack: 'business',
    description: 'Pitch rooms and pop-up shops. Build your empire.',
    req: 'Earn $1,000 or finish the entrepreneur questline',
    unlock: (s) => s.player.money >= 1000 || s.flags.entrepreneurDone,
    npcs: ['dana'], actions: ['pitchIdea', 'runPopup'],
  },
  {
    id: 'travelHub', name: 'Travel Hub', emoji: '✈️', pack: 'travel',
    description: 'Gateways to getaways. Recharge somewhere new.',
    req: 'Reach level 8',
    unlock: (s) => s.player.level >= 8,
    npcs: [], actions: ['weekendTrip'],
  },
  {
    id: 'weddingWorld', name: 'Wedding World', emoji: '💍', pack: 'wedding',
    description: 'Venues, vows and confetti. For when it gets serious.',
    req: 'Reach a relationship milestone (romance 80+)',
    unlock: (s) => Object.values(s.npcs).some((n) => (n.romance || 0) >= 80),
    npcs: [], actions: ['planWedding'],
  },
  {
    id: 'wellnessRetreat', name: 'Wellness Retreat', emoji: '🧘', pack: 'wellness',
    description: 'Spa days, yoga and quiet. Melt the stress away.',
    req: 'Complete the self-care questline',
    unlock: (s) => s.flags.selfCareDone,
    npcs: [], actions: ['spaDay', 'meditate'],
  },
];

CCS.data.worldById = Object.fromEntries(CCS.data.worlds.map((w) => [w.id, w]));
