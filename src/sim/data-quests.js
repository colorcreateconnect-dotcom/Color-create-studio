// ============================================================================
// data-quests.js — the modular quest catalog (#3).
//
// A quest is static data. Its live progress lives on state.quests[id]. Each
// objective has a `match(ev, state)` predicate; the quest engine (quests.js)
// listens to 'sim-event' and ticks objectives whose predicate passes. When all
// objectives are met the quest completes, paying rewards and applying unlocks.
//
// Event kinds an objective can match on `ev.kind`:
//   'action'  { actionId, tag }      · 'npc' { npcId, interactionId, success }
//   'lifepath'{ path }               · 'career' { careerId }
//   'enroll'  { major }              · 'pet-adopt' {}
//   'state'   (re-checked after every event; match reads `state`)
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

const obj = (id, label, match, count = 1) => ({ id, label, match, count });
const isAction = (idOrTag) => (ev) =>
  ev.kind === 'action' && (ev.actionId === idOrTag || ev.tag === idOrTag);

CCS.data.quests = [
  {
    id: 'lifeTogether', title: 'Get Your Life Together', type: 'lifestyle', chapter: 1,
    description: 'The basics. Shower, eat, sleep, and clean your space.',
    available: () => true,
    objectives: [
      obj('shower', 'Take a shower', isAction('shower')),
      obj('eat', 'Eat something', isAction('eat')),
      obj('sleep', 'Get a full night of sleep', isAction('sleep')),
      obj('clean', 'Tidy up your place', isAction('clean')),
    ],
    rewards: { xp: 20, money: 40 },
    unlocks: { quests: ['firstDay'] },
  },
  {
    id: 'firstDay', title: 'First Day Energy', type: 'lifestyle', chapter: 1,
    description: 'Decide who you want to be, and say hi to someone.',
    available: (s) => s.quests.lifeTogether?.completed,
    objectives: [
      obj('path', 'Choose a life path', (ev) => ev.kind === 'lifepath'),
      obj('meet', 'Introduce yourself to an NPC', (ev) => ev.kind === 'npc' && ev.interactionId === 'greet'),
    ],
    rewards: { xp: 30, confidence: 10 },
    unlocks: { quests: ['campusCurious', 'careerStarter', 'petBestie'] },
  },
  {
    id: 'campusCurious', title: 'Campus Curious', type: 'school', chapter: 1,
    description: 'Give school a shot: enroll, study, and meet a classmate.',
    available: (s) => s.quests.firstDay?.completed,
    objectives: [
      obj('enroll', 'Enroll in school', (ev) => ev.kind === 'enroll'),
      obj('study', 'Study once', isAction('study')),
      obj('classmate', 'Meet a classmate', (ev) => ev.kind === 'npc' && ['jade'].includes(ev.npcId)),
    ],
    rewards: { xp: 40, skills: { academics: 8 } },
    unlocks: { worlds: ['campus'], packs: ['school'] },
  },
  {
    id: 'careerStarter', title: 'Career Starter', type: 'career', chapter: 1,
    description: 'Pick a lane and clock your first shift.',
    available: (s) => s.quests.firstDay?.completed,
    objectives: [
      obj('choose', 'Choose a career', (ev) => ev.kind === 'career'),
      obj('firstShift', 'Complete your first work task', isAction('work')),
    ],
    rewards: { xp: 40, money: 80 },
    unlocks: { worlds: ['careerDistrict'], packs: ['career'] },
  },
  {
    id: 'closetConfidence', title: 'Closet Confidence', type: 'lifestyle', chapter: 1,
    description: 'Find your look: change outfit, use the mirror, save a look.',
    available: () => true,
    objectives: [
      obj('outfit', 'Change your outfit', isAction('changeOutfit')),
      obj('mirror', 'Use the mirror', isAction('useMirror')),
      obj('save', 'Save a look', isAction('saveLook')),
    ],
    rewards: { xp: 30, skills: { style: 10 }, confidence: 8 },
    unlocks: { inc: { styleQuestsDone: 1 }, quests: ['styleStreak'] },
  },
  {
    id: 'styleStreak', title: 'Style Streak', type: 'lifestyle', chapter: 2,
    description: 'Keep serving. Save two more looks.',
    available: (s) => s.quests.closetConfidence?.completed,
    objectives: [ obj('save2', 'Save 2 more looks', isAction('saveLook'), 2) ],
    rewards: { xp: 30, followers: 40 },
    unlocks: { inc: { styleQuestsDone: 2 }, packs: ['fashion'] },
  },
  {
    id: 'petBestie', title: 'Pet Bestie', type: 'pet', chapter: 1,
    description: 'Adopt a companion and start bonding.',
    available: (s) => s.quests.firstDay?.completed,
    objectives: [
      obj('adopt', 'Adopt a pet', (ev) => ev.kind === 'pet-adopt'),
      obj('feed', 'Feed your pet', (ev) => ev.kind === 'action' && ev.actionId === 'fillBowl'),
      obj('play', 'Play with your pet', (ev) => ev.kind === 'pet-action' && ev.petAction === 'play'),
    ],
    rewards: { xp: 30, skills: { charisma: 5 } },
    unlocks: {},
  },
  {
    id: 'socialSpark', title: 'The Social Spark', type: 'relationship', chapter: 1,
    description: 'Put yourself out there: call, message, and hang out.',
    available: () => true,
    objectives: [
      obj('call', 'Call a friend', isAction('callFriend')),
      obj('text', 'Send a message', isAction('textFriend')),
      obj('hang', 'Invite someone out', (ev) => ev.kind === 'npc' && ev.interactionId === 'inviteOut' && ev.success),
    ],
    rewards: { xp: 30, skills: { charisma: 8 } },
    unlocks: { flags: { socialQuestlineDone: true }, quests: ['creatorCh1'] },
  },
  {
    id: 'mainCharacter', title: 'Main Character Moment', type: 'lifestyle', chapter: 2,
    description: 'Live well: do 5 actions while your mood is above 70.',
    available: () => true,
    objectives: [
      obj('flow', 'Actions taken in a great mood', (ev, s) => ev.kind === 'action' && s.mood.score > 70, 5),
    ],
    rewards: { xp: 50, followers: 60, confidence: 12 },
    unlocks: {},
  },
  {
    id: 'creatorCh1', title: 'Creator Path — Chapter 1', type: 'career', chapter: 1,
    description: 'Start your creator journey: post content and grow to 100 followers.',
    available: (s) => s.flags.socialQuestlineDone,
    objectives: [
      obj('post', 'Post content 3 times', isAction('creator'), 3),
      obj('grow', 'Reach 100 followers', (ev, s) => s.player.followers >= 100),
    ],
    rewards: { xp: 60, money: 100 },
    unlocks: { flags: { creatorCh1: true }, worlds: ['fameDistrict'], packs: ['fame'] },
  },
  {
    id: 'selfCare', title: 'Treat Yourself', type: 'lifestyle', chapter: 1,
    description: 'Self-care isn\'t selfish. Do 3 relaxing things.',
    available: () => true,
    objectives: [ obj('care', 'Do 3 self-care activities', isAction('selfcare'), 3) ],
    rewards: { xp: 30, skills: {}, confidence: 10 },
    unlocks: { flags: { selfCareDone: true }, packs: ['wellness'] },
  },
  {
    id: 'sideHustle', title: 'Side Hustle', type: 'career', chapter: 1,
    description: 'Make your first real money moves. Earn $300 from gigs.',
    available: () => true,
    objectives: [
      obj('earn', 'Earn $300 total from work/gigs', (ev, s) => (s.flags.gigEarnings || 0) >= 300),
    ],
    rewards: { xp: 40, money: 50 },
    unlocks: { flags: { entrepreneurDone: true }, packs: ['business'] },
  },

  // --- Build & Buy / hobby questlines --------------------------------------
  {
    id: 'homeSweetHome', title: 'Home Sweet Home', type: 'lifestyle', chapter: 1,
    description: 'Make your place yours. Buy 3 things in Build & Buy.',
    available: () => true,
    objectives: [ obj('buy3', 'Buy 3 furniture or decor items', (ev) => ev.kind === 'buy', 3) ],
    rewards: { xp: 30, money: 60, confidence: 6 },
    unlocks: { quests: ['interiorDesigner'] },
  },
  {
    id: 'interiorDesigner', title: 'Interior Designer', type: 'lifestyle', chapter: 2,
    description: 'A beautiful space lifts your whole life. Reach 40 home ambiance.',
    available: (s) => s.quests.homeSweetHome?.completed,
    objectives: [ obj('amb', 'Reach 40 ambiance (buy decor)', (ev) => CCS.sim.home.ambiance() >= 40) ],
    rewards: { xp: 50, money: 120, confidence: 12 },
    unlocks: { flags: { homeDesigner: true } },
  },
  {
    id: 'gains', title: 'Making Gains', type: 'skill', chapter: 1,
    description: 'Get moving. Work out 5 times (buy a treadmill, pool or yoga mat).',
    available: () => true,
    objectives: [ obj('sweat', 'Work out 5 times', isAction('workout'), 5) ],
    rewards: { xp: 40, skills: { fitness: 12 }, confidence: 8 },
    unlocks: {},
  },
  {
    id: 'newHobby', title: 'Pick Up a Hobby', type: 'skill', chapter: 1,
    description: 'Try something creative. Do 3 art or music sessions at home.',
    available: () => true,
    objectives: [
      obj('create3', 'Do 3 art/music sessions', (ev) => ev.kind === 'action' && (ev.tag === 'art' || ev.tag === 'music'), 3),
    ],
    rewards: { xp: 40, skills: { creativity: 6, music: 4 } },
    unlocks: {},
  },
];
CCS.data.questById = Object.fromEntries(CCS.data.quests.map((q) => [q.id, q]));
