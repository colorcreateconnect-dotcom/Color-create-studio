// ============================================================================
// state.js — the single source of truth for the whole simulation.
//
// EVERYTHING that makes up a save lives on CCS.state. It is plain, serializable
// data (no functions), so the entire game can be saved to localStorage and,
// later, sent over a network for multiplayer. Static definitions (what a world
// or quest *is*) live in the data-*.js files; only live progress lives here.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.SAVE_VERSION = 3;

// Config knobs for the simulation layer (kept separate from the classic canvas).
CCS.sim.config = {
  needFloorWarn: 20,       // needs below this nag you
  autosave: true,
  hoursPerDay: 24,
};

// The eight deepened needs. `dir` marks whether high is good (+1) or bad (-1,
// e.g. stress). `hourly` is the signed change applied every in-game hour.
CCS.sim.NEEDS = {
  hunger:      { label: 'Hunger',      emoji: '🍔', dir: +1, hourly: -4.0, color: '#ff8f6b' },
  energy:      { label: 'Energy',      emoji: '⚡', dir: +1, hourly: -3.5, color: '#ffd76b' },
  hygiene:     { label: 'Hygiene',     emoji: '🧼', dir: +1, hourly: -3.0, color: '#6bd0ff' },
  fun:         { label: 'Fun',         emoji: '🎉', dir: +1, hourly: -3.0, color: '#e08bff' },
  social:      { label: 'Social',      emoji: '💬', dir: +1, hourly: -2.5, color: '#8bffcf' },
  environment: { label: 'Environment', emoji: '🏠', dir: +1, hourly: -0.6, color: '#a0e57a' },
  confidence:  { label: 'Confidence',  emoji: '✨', dir: +1, hourly: -0.7, color: '#ffd0f0' },
  stress:      { label: 'Stress',      emoji: '🌀', dir: -1, hourly: +2.2, color: '#ff6b9d' },
};

CCS.sim.SKILLS = ['creativity', 'charisma', 'fitness', 'cooking', 'music', 'style', 'academics', 'business'];

CCS.sim.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// XP needed to reach the next player level (index = current level).
CCS.sim.levelXp = (level) => 80 + level * 40;

// ---------------------------------------------------------------------------
// Fresh-save factory
// ---------------------------------------------------------------------------
CCS.sim.newState = function newState(opts = {}) {
  const needs = {};
  for (const k of Object.keys(CCS.sim.NEEDS)) needs[k] = k === 'stress' ? 20 : 78;

  const skills = {};
  for (const s of CCS.sim.SKILLS) skills[s] = 0;

  return {
    version: CCS.sim.SAVE_VERSION,
    createdAt: Date.now(),

    player: {
      name: opts.name || 'You',
      pronouns: opts.pronouns || 'they/them',
      color: opts.color || '#e08bff',
      ageStage: 'youngAdult',            // teen | youngAdult | adult
      lifePath: null,                     // set by "First Day Energy" quest
      traits: opts.traits || ['Creative'],
      level: 1,
      xp: 0,
      money: 200,
      followers: 0,
      outfit: 'Pretty & Paid',
      savedLooks: [],
      pos: null,          // world coords {x,y,z} — set from lot spawn at boot
      avatar: { skin: 'mocha', hairStyle: 'ponytail', hairColor: 'noir', outfit: 'prettyPaid' },
    },

    needs,
    mood: { state: 'Happy', score: 70 },
    skills,

    career: null,   // { id, level, xpInLevel, shiftsWorked }
    school: null,   // { major, grade, homeworkDone, studyCount, examsPassed }

    time: { day: 1, dow: 0, hour: 8, minute: 0 },

    worlds: {},     // id -> { unlocked:bool, discovered:bool }
    packs: {},      // id -> { unlocked:bool }
    quests: {},     // id -> { active, completed, progress:{objId:n} }
    pets: [],       // [{ id, type, name, needs:{}, bond }]
    npcs: {},       // id -> relationship state (see data-npcs / npc.js)
    inventory: [],  // [{ id, name, emoji }]
    home: { theme: 'cozy' },  // legacy shell; ownership now lives in lots[].placed
    lots: {},                 // lotId -> { owned, placed:[instances], roomStyles } (lots.js)
    currentLotId: 'home_lot',
    reservations: {},         // interaction-slot reservations (slots.js)
    flags: {},      // arbitrary progression flags

    stats: {
      actionsToday: 0,
      goodMoodActionsToday: 0,
      totalActions: 0,
      daysLived: 1,
    },

    feed: [],       // activity log: [{ t, text, icon }]
    location: 'home',
  };
};

// The live state (loaded or created at boot by save.js/boot.js).
CCS.state = null;

// Convenience getters used all over the codebase.
CCS.sim.get = () => CCS.state;
CCS.sim.player = () => CCS.state.player;
