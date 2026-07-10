// ============================================================================
// progression.js — worlds, careers, school, pets, life paths, random events.
//
// This is the "what unlocks what" brain. It registers special-action handlers
// (work/study/exam/…) into the engine, re-checks world & pack unlocks after
// every action, and rolls random life events.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};
CCS.sim.handlers = CCS.sim.handlers || {};

// ---------------------------------------------------------------------------
// Worlds
// ---------------------------------------------------------------------------
CCS.sim.worlds = {
  ensureAll() {
    for (const w of CCS.data.worlds) {
      if (!CCS.state.worlds[w.id]) CCS.state.worlds[w.id] = { unlocked: !!w.default, discovered: !!w.default };
    }
  },
  isUnlocked(id) { return !!CCS.state.worlds[id]?.unlocked; },
  unlock(id, reason = '') {
    this.ensureAll();
    const rec = CCS.state.worlds[id];
    const def = CCS.data.worldById[id];
    if (!rec || !def || rec.unlocked) return;
    rec.unlocked = true; rec.discovered = true;
    CCS.sim.feed(`🗺️ New area unlocked: ${def.name}! (${reason})`, def.emoji);
    CCS.ui?.toast?.(`🗺️ Unlocked ${def.name}!`);
    CCS.events.emit('worlds-changed');
  },
  travel(id) {
    if (!this.isUnlocked(id)) { CCS.ui?.toast?.('That area is still locked.'); return; }
    CCS.state.location = id;
    CCS.sim.save?.(); CCS.events.emit('state-changed');
  },
};

// ---------------------------------------------------------------------------
// Progression brain
// ---------------------------------------------------------------------------
CCS.sim.progression = {
  afterAction() {
    this.checkUnlocks();
    CCS.sim.events.maybeFire();
  },

  // Re-evaluate every auto-unlock predicate.
  checkUnlocks() {
    CCS.sim.worlds.ensureAll();
    for (const w of CCS.data.worlds) {
      if (!CCS.state.worlds[w.id]?.unlocked && w.unlock) {
        try { if (w.unlock(CCS.state)) CCS.sim.worlds.unlock(w.id, w.req); } catch {}
      }
    }
    for (const p of CCS.data.packs) {
      if (!CCS.state.packs[p.id]?.unlocked) {
        const should = p.default || (p.unlock && safe(p.unlock));
        if (should) this.unlockPack(p.id, p.req);
      }
    }
  },

  unlockPack(id, reason = '') {
    if (!CCS.state.packs[id]) CCS.state.packs[id] = { unlocked: false };
    if (CCS.state.packs[id].unlocked) return;
    CCS.state.packs[id].unlocked = true;
    const def = CCS.data.packById[id];
    if (def && !def.default) {
      CCS.sim.feed(`📦 Expansion unlocked: ${def.name}!`, def.emoji);
      CCS.ui?.toast?.(`📦 ${def.name} unlocked!`);
    }
    CCS.events.emit('packs-changed');
  },

  // --- Life path / career / school choices ---------------------------------
  chooseLifePath(pathId) {
    const path = CCS.data.lifePathById[pathId];
    if (!path) return;
    CCS.state.player.lifePath = pathId;
    CCS.sim.addSkill(path.skill, 5);
    CCS.sim.feed(`${path.emoji} You chose the ${path.name} path.`, path.emoji);
    CCS.sim.emitEvent({ kind: 'lifepath', path: pathId });
    CCS.sim.mood.recompute(); CCS.sim.save?.(); CCS.events.emit('state-changed');
  },

  chooseCareer(careerId) {
    const def = CCS.data.careerById[careerId];
    if (!def) return;
    CCS.state.career = { id: careerId, level: 0, xpInLevel: 0, shiftsWorked: 0 };
    CCS.sim.worlds.unlock('careerDistrict', 'started a career');
    this.unlockPack('career', 'chose a career');
    CCS.sim.feed(`💼 You started a career as a ${def.levels[0].title}.`, def.emoji);
    CCS.ui?.toast?.(`💼 New career: ${def.name}`);
    CCS.sim.emitEvent({ kind: 'career', careerId });
    this.checkUnlocks(); CCS.sim.save?.(); CCS.events.emit('state-changed');
  },

  enrollSchool(majorId) {
    const m = CCS.data.majorById[majorId];
    if (!m) return;
    CCS.state.school = { major: majorId, grade: 72, homeworkDone: 0, studyCount: 0, examsPassed: 0 };
    CCS.sim.worlds.unlock('campus', 'enrolled in school');
    this.unlockPack('school', 'enrolled in school');
    CCS.sim.npc.discover('jade'); CCS.sim.npc.discover('professorlee');
    CCS.sim.feed(`🎓 You enrolled in the ${m.name} program.`, m.emoji);
    CCS.ui?.toast?.(`🎓 Enrolled: ${m.name}`);
    CCS.sim.emitEvent({ kind: 'enroll', major: majorId });
    this.checkUnlocks(); CCS.sim.save?.(); CCS.events.emit('state-changed');
  },

  // --- Pets ----------------------------------------------------------------
  adoptPet(type, name) {
    const pet = {
      id: 'pet_' + CCS.util.randId(), type, name: name || 'Buddy',
      needs: { hunger: 70, energy: 75, affection: 65, cleanliness: 75 }, bond: 6,
    };
    CCS.state.pets.push(pet);
    CCS.sim.worlds.unlock('petPark', 'adopted a pet');
    CCS.sim.feed(`🐾 You adopted ${pet.name} the ${type}! Welcome home.`, petEmoji(type));
    CCS.ui?.toast?.(`🐾 Welcome home, ${pet.name}!`);
    CCS.sim.emitEvent({ kind: 'pet-adopt' });
    CCS.sim.mood.recompute(); CCS.sim.save?.(); CCS.events.emit('state-changed');
    return pet;
  },

  petAction(petId, action) {
    const pet = CCS.state.pets.find((p) => p.id === petId) || CCS.state.pets[0];
    if (!pet) return;
    const P = {
      feed:  { pet: { hunger: +55, cleanliness: -5 }, you: { social: +4 }, bond: 3, time: 0.5, verb: 'fed' },
      play:  { pet: { affection: +26, energy: -12 }, you: { fun: +15, social: +8, stress: -8 }, bond: 6, time: 0.5, verb: 'played with' },
      walk:  { pet: { affection: +18, energy: -10, hunger: -8, cleanliness: -6 }, you: { fun: +12, energy: -8, social: +6, stress: -10 }, bond: 5, time: 1, verb: 'walked' },
      groom: { pet: { cleanliness: +45, affection: +10 }, you: { social: +2 }, bond: 3, time: 0.5, verb: 'groomed' },
      nap:   { pet: { energy: +40, affection: +8 }, you: { energy: +14, stress: -12 }, bond: 4, time: 1, verb: 'napped with' },
    }[action];
    if (!P) return;

    // Walks are better in the morning/evening.
    const period = CCS.sim.time.periodOf(CCS.state.time.hour);
    const bonus = (action === 'walk' && (period === 'morning' || period === 'evening')) ? 1.3 : 1;

    for (const [k, v] of Object.entries(P.pet)) pet.needs[k] = CCS.util.clamp((pet.needs[k] ?? 70) + v * bonus, 0, 100);
    for (const [k, v] of Object.entries(P.you)) CCS.state.needs[k] = CCS.util.clamp(CCS.state.needs[k] + v * bonus, 0, 100);
    pet.bond = CCS.util.clamp(pet.bond + P.bond * bonus, 0, 100);

    CCS.sim.feed(`${petEmoji(pet.type)} You ${P.verb} ${pet.name}.`, petEmoji(pet.type));
    CCS.sim.time.advance(P.time);
    CCS.state.stats.totalActions += 1; CCS.state.stats.actionsToday += 1;
    CCS.sim.emitEvent({ kind: 'pet-action', petAction: action, petId: pet.id });
    this.afterAction();
    CCS.sim.mood.recompute(); CCS.sim.save?.(); CCS.events.emit('state-changed');

    // Cute event when your bond is strong.
    if (pet.bond > 40 && Math.random() < 0.25) {
      const cute = CCS.util.pick([
        `${pet.name} brought you a "gift" 🎁`, `${pet.name} did a happy zoomie! 🌀`,
        `${pet.name} gave you the biggest cuddle 🤗`, `${pet.name} learned a new trick! 🌟`,
      ]);
      CCS.state.needs.confidence = CCS.util.clamp(CCS.state.needs.confidence + 4, 0, 100);
      CCS.sim.feed(cute, '💞'); CCS.ui?.toast?.(cute);
    }
  },
};

function safe(fn) { try { return fn(CCS.state); } catch { return false; } }
function petEmoji(type) { return { dog: '🐶', cat: '🐱', bunny: '🐰' }[type] || '🐾'; }

// ---------------------------------------------------------------------------
// Random events
// ---------------------------------------------------------------------------
CCS.sim.events = {
  maybeFire() {
    if (Math.random() > 0.3) return;
    const s = CCS.state;
    s.flags._evtCd = s.flags._evtCd || {};
    const eligible = CCS.data.events.filter((e) => {
      if ((s.flags._evtCd[e.id] || -99) === s.time.day) return false; // once/day
      try { return e.trigger(s); } catch { return false; }
    });
    if (!eligible.length) return;

    const total = eligible.reduce((a, e) => a + (e.weight || 1), 0);
    let roll = Math.random() * total, ev = eligible[0];
    for (const e of eligible) { roll -= e.weight || 1; if (roll <= 0) { ev = e; break; } }

    s.flags._evtCd[ev.id] = s.time.day;

    // {npc} placeholder -> a known NPC's name.
    let text = ev.text;
    if (text.includes('{npc}')) {
      const known = Object.keys(s.npcs).filter((id) => s.npcs[id].discovered);
      const who = known.length ? CCS.data.npcById[CCS.util.pick(known)].name : 'A friend';
      text = text.replace('{npc}', who);
    }

    if (ev.effects) {
      CCS.sim.applyEffects(ev.effects, {});
      if (ev.effects.npcMood) {
        const known = Object.values(s.npcs).filter((n) => n.discovered);
        if (known.length) known[0].mood = CCS.util.clamp(known[0].mood + ev.effects.npcMood, 0, 100);
      }
      if (ev.effects.feed) CCS.sim.feed(ev.effects.feed, ev.icon);
    }
    CCS.sim.feed(text, ev.icon);
    CCS.ui?.toast?.(`${ev.icon} ${text}`);
    CCS.events.emit('feed-changed');
  },
};

// ---------------------------------------------------------------------------
// Special action handlers (registered into the engine)
// ---------------------------------------------------------------------------
CCS.sim.handlers.work = function (def) {
  const s = CCS.state;
  if (!s.career) return { abort: true, reason: 'Choose a career first (Career/School tab).' };
  const cdef = CCS.data.careerById[s.career.id];
  const tier = cdef.levels[s.career.level];

  const windows = { day: [9, 17], morning: [6, 12], evening: [17, 23], flexible: [0, 24] };
  const [a, b] = windows[cdef.schedule] || [0, 24];
  if (!CCS.sim.time.inWindow(s.time.hour, a === 0 ? null : a, b === 24 ? null : b))
    return { abort: true, reason: `Your ${cdef.name} shift is ${a}:00–${b}:00.` };

  s.career.xpInLevel += 22 + s.career.level * 6;
  s.career.shiftsWorked += 1;

  const eff = {
    money: tier.pay, xp: 6, needs: { energy: -14, fun: -6, stress: +9 },
    skills: { [cdef.skill]: 3 },
  };
  if (cdef.followersPerShift) eff.followers = cdef.followersPerShift;

  // Promotion?
  let promoted = '';
  if (s.career.level < cdef.levels.length - 1 && s.career.xpInLevel >= tier.promoteXp) {
    const skillsOk = Object.entries(tier.promoteSkills || {}).every(([k, v]) => (s.skills[k] || 0) >= v);
    if (skillsOk) {
      s.career.level += 1; s.career.xpInLevel = 0;
      promoted = cdef.levels[s.career.level].title;
    }
  }
  const fb = promoted
    ? `💼 Shift done — and you got promoted to ${promoted}! (+$${tier.pay})`
    : `💼 Worked a shift as ${tier.title}. (+$${tier.pay})`;
  if (promoted) { CCS.ui?.toast?.(`🎉 Promoted: ${promoted}!`); CCS.sim.emitEvent({ kind: 'promotion', careerId: s.career.id }); }
  return { addEffects: eff, feed: fb };
};

CCS.sim.handlers.study = function (def) {
  const s = CCS.state;
  const eff = { needs: { energy: -10, fun: -6 }, skills: { academics: 6 }, xp: 4 };
  if (s.school) {
    const m = CCS.data.majorById[s.school.major];
    for (const sk of m.skills) eff.skills[sk] = (eff.skills[sk] || 0) + 3;
    s.school.studyCount += 1;
    s.school.grade = CCS.util.clamp(s.school.grade + 1.5, 0, 100);
  }
  return { addEffects: eff, feed: '📚 You hit the books.' };
};

CCS.sim.handlers.attendClass = function (def) {
  const s = CCS.state;
  if (!s.school) return { abort: true, reason: 'Enroll in school first.' };
  s.school.grade = CCS.util.clamp(s.school.grade + 2, 0, 100);
  CCS.sim.npc.discover('jade');
  const m = CCS.data.majorById[s.school.major];
  const eff = { needs: { energy: -10, social: +8, fun: -4 }, skills: { academics: 5 }, xp: 5 };
  for (const sk of m.skills) eff.skills[sk] = (eff.skills[sk] || 0) + 2;
  return { addEffects: eff, feed: '📝 You attended class and took notes.' };
};

CCS.sim.handlers.exam = function (def) {
  const s = CCS.state;
  if (!s.school) return { abort: true, reason: 'Enroll in school first.' };
  const skill = s.skills.academics || 0;
  const passChance = CCS.util.clamp(0.3 + s.school.grade / 200 + skill / 160, 0.1, 0.97);
  const passed = Math.random() < passChance;
  if (passed) {
    s.school.examsPassed += 1;
    s.school.grade = CCS.util.clamp(s.school.grade + 6, 0, 100);
    return { addEffects: { xp: 20, needs: { confidence: +12, stress: +6 }, money: +50 }, feed: '🧪 You passed the exam! 🎉' };
  }
  s.school.grade = CCS.util.clamp(s.school.grade - 5, 0, 100);
  return { addEffects: { needs: { confidence: -8, stress: +14 } }, feed: '🧪 The exam did not go great. Study more!' };
};

CCS.sim.handlers.changeOutfit = function (def) {
  const looks = ['Everyday Casual', 'Street Chic', 'Cozy Mode', 'Business Slay', 'Y2K Revival', 'Soft Glam', 'Athleisure', 'Night Out Fit'];
  CCS.state.player.outfit = CCS.util.pick(looks.filter((l) => l !== CCS.state.player.outfit));
  return { feed: `🧥 You changed into a "${CCS.state.player.outfit}" fit.` };
};

CCS.sim.handlers.saveLook = function (def) {
  CCS.state.player.savedLooks.unshift({ name: CCS.state.player.outfit, day: CCS.state.time.day });
  if (CCS.state.player.savedLooks.length > 12) CCS.state.player.savedLooks.length = 12;
  return { feed: `📸 Saved the "${CCS.state.player.outfit}" look to your lookbook.` };
};

CCS.sim.handlers.feedPet = function (def) {
  if (!CCS.state.pets.length) return { abort: true, reason: 'Adopt a pet first!' };
  return {}; // generic petNeeds effects handle the rest
};

CCS.sim.handlers.walkPet = function (def) {
  if (!CCS.state.pets.length) return { abort: true, reason: 'Adopt a pet first!' };
  return {};
};

CCS.sim.handlers.planWedding = function (def) {
  const partnerId = Object.entries(CCS.state.npcs).sort((a, b) => (b[1].romance || 0) - (a[1].romance || 0))[0]?.[0];
  const partner = partnerId ? CCS.data.npcById[partnerId] : null;
  if (!partner || CCS.state.npcs[partnerId].romance < 80)
    return { abort: true, reason: 'You need a partner (romance 80+) to plan a wedding.' };
  CCS.state.flags.married = partnerId;
  return { addEffects: { needs: { confidence: +25, fun: +25, stress: -20 } }, feed: `💒 You planned your wedding with ${partner.name}! 💍` };
};
