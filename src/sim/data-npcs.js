// ============================================================================
// data-npcs.js — the cast (#4) and the interaction catalog (#4/#5).
//
// NPC *definitions* are static (who they are). Their live relationship numbers
// and memories live on CCS.state.npcs[id]. Interactions are data too: each one
// declares how it nudges the player and the NPC, plus the memory it can leave.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.data = CCS.data || {};

CCS.data.npcs = [
  {
    id: 'maya', name: 'Maya', emoji: '👩🏽', ageStage: 'youngAdult', role: 'best friend',
    homeWorld: 'home', personality: ['warm', 'loyal', 'chatty'],
    schedule: { period: 'any' }, seed: { friendship: 35, trust: 40 },
    bio: 'Your ride-or-die since forever. Always down to talk.',
  },
  {
    id: 'noah', name: 'Noah', emoji: '🧑🏻', ageStage: 'youngAdult', role: 'neighbor',
    homeWorld: 'home', personality: ['easygoing', 'private'],
    schedule: { period: 'evening' }, seed: { friendship: 10 },
    bio: 'The neighbor with the good playlists and better snacks.',
  },
  {
    id: 'jade', name: 'Jade', emoji: '👩🏻', ageStage: 'youngAdult', role: 'classmate',
    homeWorld: 'campus', personality: ['competitive', 'smart'],
    schedule: { period: 'day' }, seed: { friendship: 8 },
    bio: 'Top of the class and knows it. Could be a friend or a rival.',
  },
  {
    id: 'professorlee', name: 'Prof. Lee', emoji: '👨🏾‍🏫', ageStage: 'adult', role: 'mentor',
    homeWorld: 'campus', personality: ['wise', 'strict', 'kind'],
    schedule: { period: 'day' }, seed: { trust: 15 },
    bio: 'Tough grader, great advice. Wants to see you win.',
  },
  {
    id: 'dana', name: 'Dana', emoji: '👩🏾‍💼', ageStage: 'adult', role: 'coworker',
    homeWorld: 'careerDistrict', personality: ['ambitious', 'direct'],
    schedule: { period: 'day' }, seed: { friendship: 5 },
    bio: 'Sharp, busy, and secretly a great mentor if you keep up.',
  },
  {
    id: 'leo', name: 'Leo', emoji: '🧑🏽‍🎤', ageStage: 'youngAdult', role: 'crush',
    homeWorld: 'nightlife', personality: ['charming', 'flirty', 'mysterious'],
    schedule: { period: 'night' }, seed: { friendship: 12 },
    bio: 'That magnetic someone from the music scene.',
  },
  {
    id: 'coco', name: 'Coco', emoji: '💃🏻', ageStage: 'youngAdult', role: 'stylist',
    homeWorld: 'fashionDistrict', personality: ['bold', 'trendy'],
    schedule: { period: 'day' }, seed: { friendship: 6 },
    bio: 'Walking mood board. Will make you fashion.',
  },
  {
    id: 'brandi', name: 'Brandi', emoji: '👩🏼‍💻', ageStage: 'adult', role: 'brand rep',
    homeWorld: 'fameDistrict', personality: ['polished', 'transactional'],
    schedule: { period: 'day' }, seed: {},
    bio: 'Sends the brand deals — once you matter.',
  },
  {
    id: 'kai', name: 'Kai', emoji: '🧑🏿', ageStage: 'youngAdult', role: 'rival',
    homeWorld: 'fameDistrict', personality: ['sharp', 'competitive', 'petty'],
    schedule: { period: 'any' }, seed: { friendship: -5, jealousy: 20 },
    bio: 'Always one step behind you — or ahead. Keeps you sharp.',
  },
  {
    id: 'rex', name: 'Rex', emoji: '🧔🏻', ageStage: 'adult', role: 'pet lover',
    homeWorld: 'petPark', personality: ['gentle', 'goofy'],
    schedule: { period: 'any' }, seed: { friendship: 10 },
    bio: 'Runs the dog park. Knows every good boy by name.',
  },
  {
    id: 'zuri', name: 'Zuri', emoji: '💁🏾‍♀️', ageStage: 'youngAdult', role: 'party friend',
    homeWorld: 'nightlife', personality: ['fun', 'spontaneous'],
    schedule: { period: 'night' }, seed: { friendship: 14 },
    bio: 'Always knows where the party is. Chaotic good.',
  },
];
CCS.data.npcById = Object.fromEntries(CCS.data.npcs.map((n) => [n.id, n]));

// --- Interaction catalog ---------------------------------------------------
// deltas apply to the NPC relationship; `social`/`mood` apply to the player.
// `minFriend`/`minRomance` gate risky moves (flirting a stranger flops).
// `mem` is the memory left behind (sentiment steers future outcomes).
CCS.data.interactions = [
  { id: 'greet', label: 'Greet', emoji: '👋', social: 6, deltas: { friendship: 2 },
    mem: { text: 'said hi to me', sentiment: 1, tag: 'friendly' } },
  { id: 'compliment', label: 'Compliment', emoji: '💖', social: 8, mood: 3,
    deltas: { friendship: 5, trust: 2 }, mem: { text: 'made me feel good', sentiment: 3, tag: 'kind' } },
  { id: 'joke', label: 'Tell a joke', emoji: '😂', social: 9, mood: 4, fun: 6,
    deltas: { friendship: 4 }, risk: 0.15, mem: { text: 'made me laugh', sentiment: 2, tag: 'fun' } },
  { id: 'gossip', label: 'Gossip', emoji: '🫢', social: 7, deltas: { friendship: 3, trust: -3, jealousy: 2 },
    mem: { text: 'loves the tea (maybe too much)', sentiment: -1, tag: 'gossip' } },
  { id: 'vent', label: 'Vent', emoji: '😮‍💨', social: 5, stress: -8, deltas: { trust: 4, friendship: 2 },
    minFriend: 20, mem: { text: 'trusted me with real feelings', sentiment: 2, tag: 'deep' } },
  { id: 'askAdvice', label: 'Ask advice', emoji: '🧠', social: 6, confidence: 4,
    deltas: { trust: 5, friendship: 3 }, mem: { text: 'valued my opinion', sentiment: 2, tag: 'respect' } },
  { id: 'collaborate', label: 'Collaborate', emoji: '🤝', social: 8, deltas: { friendship: 6, trust: 4 },
    minFriend: 25, mem: { text: 'we made something together', sentiment: 3, tag: 'teamwork' } },
  { id: 'flirt', label: 'Flirt', emoji: '😏', social: 7, confidence: 5,
    deltas: { romance: 8, friendship: 2 }, minFriend: 30, risk: 0.25,
    mem: { text: 'there was a spark ✨', sentiment: 3, tag: 'romance' },
    memFail: { text: 'came on too strong', sentiment: -3, tag: 'awkward' } },
  { id: 'apologize', label: 'Apologize', emoji: '🙏', social: 4, deltas: { trust: 6, jealousy: -6, friendship: 3 },
    mem: { text: 'owned up and said sorry', sentiment: 2, tag: 'repair' } },
  { id: 'inviteOut', label: 'Invite out', emoji: '🎉', social: 10, fun: 8,
    deltas: { friendship: 7, romance: 2 }, minFriend: 20, risk: 0.2,
    mem: { text: 'we hung out and it was great', sentiment: 3, tag: 'plans' },
    memFail: { text: 'I was busy when they asked', sentiment: -1, tag: 'timing' } },
];
CCS.data.interactionById = Object.fromEntries(CCS.data.interactions.map((i) => [i.id, i]));
