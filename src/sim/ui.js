// ============================================================================
// ui.js — the tabbed, mobile-first interface (#14).
//
// The UI is a thin renderer over CCS.state. Every button carries a data-act +
// ids; a single delegated click handler turns those into engine calls. Nothing
// game-logical lives here — that keeps the sim testable and multiplayer-ready.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.ui = CCS.ui || {};

CCS.ui.state = { tab: 'home', modal: null, createTraits: ['Creative'], room: 'all' };

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'sim', label: 'Sim', icon: '🧍' },
  { id: 'world', label: 'World', icon: '🗺️' },
  { id: 'life', label: 'Life', icon: '💼' },
  { id: 'social', label: 'Social', icon: '💞' },
  { id: 'pets', label: 'Pets', icon: '🐾' },
  { id: 'quests', label: 'Quests', icon: '🗒️' },
  { id: 'feed', label: 'Feed', icon: '📰' },
];

// --- little helpers --------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (h) => (h >= 1 ? `${h % 1 ? h.toFixed(1) : h}h` : `${Math.round(h * 60)}m`);
const inputVal = (id) => (document.getElementById(id)?.value || '').trim();
const bar = (pct, color) => `<div class="bar"><div class="fill" style="width:${CCS.util.clamp(pct, 0, 100)}%;background:${color}"></div></div>`;
const actBtn = (a) => `<button class="act" data-act="action" data-id="${a.id}">${a.emoji} ${esc(a.label)} <em>${fmtTime(a.time || 1)}</em></button>`;

CCS.ui.init = function init() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div id="statusbar"></div>
    <div id="content"></div>
    <nav id="tabnav"></nav>
    <div id="modal-root"></div>
    <div id="toasts"></div>`;
  root.addEventListener('click', onClick);

  // Re-render on any state change.
  const rerender = () => CCS.ui.render();
  ['state-changed', 'feed-changed', 'quests-changed', 'worlds-changed', 'packs-changed', 'time-changed'].forEach((e) => CCS.events.on(e, rerender));

  CCS.ui.render();
};

CCS.ui.setTab = function (tab) { CCS.ui.state.tab = tab; CCS.ui.render(); };

CCS.ui.render = function render() {
  if (!CCS.state) return;
  document.getElementById('statusbar').innerHTML = statusBar();
  document.getElementById('content').innerHTML = (RENDER[CCS.ui.state.tab] || RENDER.home)();
  document.getElementById('tabnav').innerHTML = TABS.map((t) =>
    `<button class="tabbtn ${CCS.ui.state.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}">
      <span>${t.icon}</span><label>${t.label}</label></button>`).join('');
  renderModal();
};

// ===========================================================================
// Status bar
// ===========================================================================
function statusBar() {
  const p = CCS.state.player, m = CCS.state.mood;
  const md = CCS.data.moods[m.state] || { emoji: '🙂' };
  return `
    <div class="sb-row">
      <div class="sb-id">
        <span class="dot" style="background:${p.color}"></span>
        <b>${esc(p.name)}</b><span class="lv">Lv ${p.level}</span>
      </div>
      <button class="sb-menu" data-act="reset" title="Reset save">⋯</button>
    </div>
    <div class="sb-row sb-stats">
      <span>💰 $${Math.floor(p.money)}</span>
      <span>👥 ${p.followers}</span>
      <span>${CCS.sim.time.periodEmoji(CCS.state.time.hour)} ${CCS.sim.time.label()}</span>
      <span class="mood-chip">${md.emoji} ${m.state}</span>
    </div>`;
}

// ===========================================================================
// Tab renderers
// ===========================================================================
const RENDER = {};

RENDER.home = function () {
  const s = CCS.state, H = CCS.sim.home;
  const room = CCS.ui.state.room || 'all';

  const low = Object.entries(CCS.sim.NEEDS)
    .map(([k, d]) => ({ k, d, v: s.needs[k], bad: d.dir > 0 ? s.needs[k] < 30 : s.needs[k] > 70 }))
    .filter((x) => x.bad);
  const nudge = low.length
    ? `<div class="nudge">⚠️ ${low.map((x) => `${x.d.emoji} ${x.d.label}`).join(', ')} need attention.</div>`
    : `<div class="nudge good">✨ You're feeling balanced. Go live your life!</div>`;

  // Room filter chips
  const rooms = H.activeRooms();
  const chips = ['all', ...rooms.map((r) => r.id)].map((rid) => {
    const meta = rid === 'all' ? { emoji: '🏠', name: 'All' } : CCS.sim.ROOMS.find((r) => r.id === rid);
    return `<button class="rchip ${room === rid ? 'on' : ''}" data-act="roomFilter" data-room="${rid}">${meta.emoji} ${meta.name}</button>`;
  }).join('');

  // Little room "scene"
  const sceneItems = room === 'all' ? rooms.flatMap((r) => H.furnitureInRoom(r.id)) : H.furnitureInRoom(room);
  const tiles = sceneItems.slice(0, 14).map((f) => `<span class="tile">${f.emoji}</span>`).join('');
  const scene = `<div class="room-scene"><div class="floor">${tiles}
    <span class="tile me" style="background:${s.player.color}">${CCS.data.moods[s.mood.state]?.emoji || '🙂'}</span></div></div>`;

  // Furniture + actions (phone/anywhere always usable)
  const furniture = (room === 'all'
    ? rooms.flatMap((r) => H.furnitureInRoom(r.id))
    : H.furnitureInRoom(room)).concat(H.anywhere());
  const cards = furniture.map((f) => `
    <div class="card obj">
      <div class="obj-h">${f.emoji} <b>${esc(f.name)}</b>${f.catId ? '<small>✓ owned</small>' : ''}</div>
      <div class="acts">${f.actions.map(actBtn).join('')}</div>
    </div>`).join('');

  return `
    <section>
      <div class="home-head"><h2>🏠 Home</h2>
        <button class="pillbtn" data-act="openBuild">🛠️ Build &amp; Buy</button></div>
      ${nudge}
      <div class="amb">🪄 Ambiance <b>${H.ambiance()}</b>${bar(H.ambianceTarget(), '#a0e57a')}</div>
      ${scene}
      <div class="rfilter">${chips}</div>
      ${cards}
    </section>`;
};

RENDER.build = function () {
  const s = CCS.state, H = CCS.sim.home;
  const sections = CCS.data.catalogCategories.map((c) => {
    const items = CCS.data.catalog.filter((i) => i.cat === c.id);
    const cards = items.map((i) => {
      const owned = H.isOwned(i.id);
      const locked = i.unlock && !i.unlock(s);
      const afford = s.player.money >= i.price;
      const tag = catalogBlurbTag(i);
      const btn = owned
        ? `<span class="owned-badge">✓ Owned</span>`
        : locked ? `<span class="locked-badge">🔒 ${esc(i.req || 'Locked')}</span>`
        : `<button class="buybtn ${afford ? '' : 'poor'}" data-act="buy" data-id="${i.id}">$${i.price}</button>`;
      return `<div class="buy ${owned ? 'owned' : ''}">
        <div class="buy-emoji">${i.emoji}</div>
        <div class="buy-info"><b>${esc(i.name)}</b><small>${esc(i.desc || '')}</small>
          <div class="tagrow">${i.ambiance ? `<span class="tagpill">🪄 +${i.ambiance}</span>` : ''}${tag ? `<span class="tagpill">${tag}</span>` : ''}</div>
        </div>
        <div class="buy-act">${btn}</div>
      </div>`;
    }).join('');
    return `<h3 class="cat-h">${c.emoji} ${c.name}</h3>${cards}`;
  }).join('');

  const owned = H.ownedItems();
  const ownedList = owned.length
    ? owned.map((o) => `<div class="owned-row"><span>${o.def.emoji} ${esc(o.def.name)} <small>${roomName(o.room)}</small></span>
        <button class="sellbtn" data-act="sell" data-iid="${o.iid}">Sell $${Math.round(o.def.price * 0.5)}</button></div>`).join('')
    : '<p class="sub">Nothing bought yet — treat yourself!</p>';

  return `
    <section>
      <div class="home-head"><h2>🛠️ Build &amp; Buy</h2>
        <button class="pillbtn" data-act="backHome">← Home</button></div>
      <div class="amb">💰 <b>$${Math.floor(s.player.money)}</b> &nbsp;·&nbsp; 🪄 Ambiance <b>${H.ambiance()}</b></div>
      <p class="sub">Buy furniture for new activities, and decor to keep your Environment high.</p>
      ${sections}
      <h3 class="cat-h">📦 Your stuff (${owned.length})</h3>
      ${ownedList}
    </section>`;
};

RENDER.sim = function () {
  const s = CCS.state, p = s.player;
  const md = CCS.data.moods[s.mood.state] || { emoji: '🙂', blurb: '' };
  const xpNeed = CCS.sim.levelXp(p.level);
  const needs = Object.entries(CCS.sim.NEEDS).map(([k, d]) =>
    `<div class="need"><span>${d.emoji} ${d.label}</span>${bar(s.needs[k], d.color)}<em>${Math.round(s.needs[k])}</em></div>`).join('');
  const skills = CCS.sim.SKILLS.map((sk) =>
    `<div class="need sm"><span>${cap(sk)}</span>${bar((s.skills[sk] || 0), '#9d7bff')}<em>${Math.round(s.skills[sk] || 0)}</em></div>`).join('');
  const traits = p.traits.map((t) => `<span class="chip">${CCS.data.traitById[t]?.emoji || ''} ${t}</span>`).join('');
  const path = p.lifePath ? CCS.data.lifePathById[p.lifePath] : null;

  return `
    <section>
      <div class="sim-head">
        <div class="avatar" style="background:${p.color}">${md.emoji}</div>
        <div>
          <h2 style="margin:0">${esc(p.name)} <button class="mini" data-act="rename">✏️</button></h2>
          <div class="sub">${esc(p.pronouns)} · ${cap(p.ageStage)} · <b>${s.mood.state}</b> — ${md.blurb}</div>
          <div class="xpbar">${bar((p.xp / xpNeed) * 100, '#ffd76b')}<em>Lv ${p.level} · ${p.xp}/${xpNeed} XP</em></div>
        </div>
      </div>

      <div class="card">
        <div class="row-h">Life path ${path ? '' : '<button class="mini" data-act="openLifepath">Choose</button>'}</div>
        ${path ? `<div class="chip big">${path.emoji} ${path.name}</div>` : '<p class="sub">Pick who you want to be (also a quest!).</p>'}
        <div class="row-h" style="margin-top:10px">Traits</div><div class="chips">${traits}</div>
        <div class="row-h" style="margin-top:10px">Outfit</div>
        <div class="chip big">🧥 ${esc(p.outfit)}</div>
        ${p.savedLooks.length ? `<div class="sub" style="margin-top:6px">Lookbook: ${p.savedLooks.map((l) => esc(l.name)).slice(0, 5).join(' · ')}</div>` : ''}
      </div>

      <div class="card"><h3>Needs</h3>${needs}</div>
      <div class="card"><h3>Skills</h3>${skills}</div>
      <a class="classic-link" href="classic.html">🕹️ Play the classic walk-around mode →</a>
    </section>`;
};

RENDER.world = function () {
  const s = CCS.state;
  const cards = CCS.data.worlds.map((w) => {
    const unlocked = s.worlds[w.id]?.unlocked;
    const acts = (w.actions || []).map((id) => CCS.data.actionById[id]).filter(Boolean);
    const npcNames = (w.npcs || []).map((id) => CCS.data.npcById[id]?.name).filter(Boolean).join(', ');
    return `
      <div class="card world ${unlocked ? '' : 'locked'}">
        <div class="obj-h">${w.emoji} <b>${esc(w.name)}</b>${unlocked ? '' : ' <span class="lock">🔒</span>'}</div>
        <p class="sub">${esc(w.description)}</p>
        ${unlocked
          ? `${acts.length ? `<div class="acts">${acts.map(actBtn).join('')}</div>` : '<p class="sub">Explore its features around the app.</p>'}
             ${npcNames ? `<div class="sub">👥 ${esc(npcNames)}</div>` : ''}`
          : `<div class="req">🔓 ${esc(w.req)}</div>`}
      </div>`;
  }).join('');
  return `<section><h2>🗺️ Worlds</h2><p class="sub">New places open up as you grow. Locked cards show how to unlock them.</p>${cards}</section>`;
};

RENDER.life = function () {
  const s = CCS.state;
  // Career
  let career;
  if (!s.career) {
    career = `<div class="card"><h3>💼 Career</h3><p class="sub">You haven't picked a career yet.</p>
      <button class="btn" data-act="openCareer">Choose a career</button></div>`;
  } else {
    const c = CCS.data.careerById[s.career.id], tier = c.levels[s.career.level];
    const next = c.levels[s.career.level + 1];
    const promoNeed = tier.promoteXp;
    const ladder = c.levels.map((l, i) =>
      `<div class="tier ${i === s.career.level ? 'on' : ''} ${i < s.career.level ? 'done' : ''}">${i + 1}. ${esc(l.title)} <em>$${l.pay}</em></div>`).join('');
    career = `<div class="card"><h3>${c.emoji} ${c.name}</h3>
      <div class="sub">Level ${s.career.level + 1} · <b>${esc(tier.title)}</b> · $${tier.pay}/shift · ${c.schedule} hours</div>
      <div class="acts"><button class="act" data-act="action" data-id="work">💼 Go to work <em>4h</em></button></div>
      ${next ? `<div class="xpbar">${bar((s.career.xpInLevel / promoNeed) * 100, '#7cffa0')}<em>Promotion: ${s.career.xpInLevel}/${promoNeed}</em></div>` : '<div class="sub">🏆 Top of your field!</div>'}
      <div class="ladder">${ladder}</div></div>`;
  }
  // School
  let school;
  if (!s.school) {
    school = `<div class="card"><h3>🎓 School</h3><p class="sub">Not enrolled. School unlocks the Campus and new skills.</p>
      <button class="btn" data-act="openMajor">Enroll in school</button></div>`;
  } else {
    const m = CCS.data.majorById[s.school.major];
    school = `<div class="card"><h3>🎓 ${m.emoji} ${m.name} Major</h3>
      <div class="sub">Grade: <b>${Math.round(s.school.grade)}</b> · Exams passed: ${s.school.examsPassed} · Studied ${s.school.studyCount}×</div>
      <div class="acts">
        <button class="act" data-act="action" data-id="attendClass">📝 Class <em>3h</em></button>
        <button class="act" data-act="action" data-id="study">📚 Study <em>2h</em></button>
        <button class="act" data-act="action" data-id="exam">🧪 Exam <em>2h</em></button>
      </div></div>`;
  }
  return `<section><h2>💼 Career & School</h2>${career}${school}</section>`;
};

RENDER.social = function () {
  const s = CCS.state;
  // Who can we see? Discovered NPCs + anyone whose home world is unlocked.
  const visible = CCS.data.npcs.filter((d) =>
    s.npcs[d.id]?.discovered || s.worlds[d.homeWorld]?.unlocked);
  const cards = visible.map((d) => {
    const n = CCS.sim.npc.ensure(d.id);
    if (!n.discovered) {
      return `<div class="card npc">
        <div class="obj-h">${d.emoji} <b>${esc(d.name)}</b><small>${d.role}</small></div>
        <p class="sub">${esc(d.bio)}</p>
        <button class="act" data-act="meet" data-id="${d.id}">👋 Say hi</button></div>`;
    }
    const mem = n.memories[0];
    return `<div class="card npc">
      <div class="obj-h">${d.emoji} <b>${esc(d.name)}</b><small>${d.role}</small><span class="score">${CCS.sim.npc.friendLabel(n)}</span></div>
      <div class="rel"><span>💛 Friend</span>${bar(n.friendship, '#8bffcf')}<em>${Math.round(n.friendship)}</em></div>
      ${n.romance > 0 ? `<div class="rel"><span>${CCS.sim.npc.romanceLabel(n) || '💗 Romance'}</span>${bar(n.romance, '#ff8fd0')}<em>${Math.round(n.romance)}</em></div>` : ''}
      <div class="rel"><span>🤝 Trust</span>${bar(n.trust, '#9dd0ff')}<em>${Math.round(n.trust)}</em></div>
      ${mem ? `<div class="sub mem">🧠 “${esc(mem.text)}”</div>` : ''}
      <button class="btn sm" data-act="openInteract" data-id="${d.id}">💬 Interact</button></div>`;
  }).join('');
  return `<section><h2>💞 Relationships</h2><p class="sub">Build friendships and romance. NPCs remember how you treat them.</p>
    ${cards || '<p class="sub">Get out into the world to meet people!</p>'}</section>`;
};

RENDER.pets = function () {
  const s = CCS.state;
  if (!s.pets.length) {
    return `<section><h2>🐾 Pets</h2>
      <div class="card"><p class="sub">A companion improves your mood and social life, and unlocks Pet Park fun.</p>
      <button class="btn" data-act="openAdopt">🐶 Adopt a pet</button></div></section>`;
  }
  const cards = s.pets.map((pet) => {
    const nb = (k, c, e) => `<div class="need sm"><span>${e} ${cap(k)}</span>${bar(pet.needs[k], c)}<em>${Math.round(pet.needs[k])}</em></div>`;
    return `<div class="card pet">
      <div class="obj-h">${petEmoji(pet.type)} <b>${esc(pet.name)}</b><small>${pet.type}</small><span class="score">Bond ${Math.round(pet.bond)}</span></div>
      ${bar(pet.bond, '#ff9ecb')}
      ${nb('hunger', '#ff8f6b', '🍖')}${nb('energy', '#ffd76b', '⚡')}${nb('affection', '#ff9ecb', '💕')}${nb('cleanliness', '#6bd0ff', '🧼')}
      <div class="acts">
        ${['feed', 'play', 'walk', 'groom', 'nap'].map((a) => `<button class="act" data-act="petAction" data-pet="${pet.id}" data-a="${a}">${petActEmoji(a)} ${cap(a)}</button>`).join('')}
      </div></div>`;
  }).join('');
  return `<section><h2>🐾 Pets</h2>${cards}
    <button class="btn ghost" data-act="openAdopt">➕ Adopt another</button></section>`;
};

RENDER.quests = function () {
  const active = CCS.sim.quests.active();
  const done = CCS.data.quests.filter((q) => CCS.state.quests[q.id]?.completed);
  const cards = active.map((q) => {
    const rec = CCS.state.quests[q.id];
    const objs = q.objectives.map((o) => {
      const n = Math.min(o.count, rec?.progress[o.id] || 0);
      const ok = n >= o.count;
      return `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${esc(o.label)} ${o.count > 1 ? `(${n}/${o.count})` : ''}</li>`;
    }).join('');
    return `<div class="card quest">
      <div class="q-h"><b>${esc(q.title)}</b><span class="tag">${q.type}</span></div>
      <p class="sub">${esc(q.description)}</p>
      <ul class="objs">${objs}</ul>
      <div class="reward">🎁 ${rewardText(q.rewards, q.unlocks)}</div></div>`;
  }).join('');
  return `<section><h2>🗒️ Quests</h2>
    ${cards || '<p class="sub">No active quests right now — keep playing to unlock more!</p>'}
    ${done.length ? `<h3 class="done-h">✅ Completed (${done.length})</h3>
      ${done.map((q) => `<div class="card quest done"><b>${esc(q.title)}</b></div>`).join('')}` : ''}
  </section>`;
};

RENDER.feed = function () {
  const items = CCS.state.feed.map((f) => `<div class="feed-item"><span class="fi">${f.icon}</span><div><div>${esc(f.text)}</div><small>${esc(f.t)}</small></div></div>`).join('');
  return `<section><h2>📰 Activity</h2>${items || '<p class="sub">Your story will show up here.</p>'}</section>`;
}

// ===========================================================================
// Modals
// ===========================================================================
function renderModal() {
  const root = document.getElementById('modal-root');
  const m = CCS.ui.state.modal;
  if (!m) { root.innerHTML = ''; return; }
  root.innerHTML = `<div class="overlay" ${m.locked ? '' : 'data-act="overlayClose"'}>
    <div class="sheet">${MODAL[m.type](m)}</div></div>`;
}
CCS.ui.openModal = (type, data = {}) => { CCS.ui.state.modal = { type, ...data }; renderModal(); };
CCS.ui.closeModal = () => { CCS.ui.state.modal = null; renderModal(); };

const MODAL = {
  create() {
    const traits = CCS.data.traits.map((t) =>
      `<button class="pick ${CCS.ui.state.createTraits.includes(t.id) ? 'on' : ''}" data-act="toggleTrait" data-id="${t.id}">
        ${t.emoji} ${t.id}<small>${t.blurb}</small></button>`).join('');
    return `<h2>✨ Create your Sim</h2>
      <label class="fld">Name<input id="newName" maxlength="24" value="${esc(CCS.ui.state.createName != null ? CCS.ui.state.createName : CCS.state.player.name)}"/></label>
      <p class="sub">Pick up to 2 traits (${CCS.ui.state.createTraits.length}/2):</p>
      <div class="picks">${traits}</div>
      <button class="btn" data-act="newgameConfirm">Start my life →</button>`;
  },
  lifepath() {
    return `<h2>Choose your life path</h2>
      <div class="picks">${CCS.data.lifePaths.map((p) =>
        `<button class="pick" data-act="lifepath" data-id="${p.id}">${p.emoji} ${p.name}<small>${p.blurb}</small></button>`).join('')}</div>`;
  },
  career() {
    return `<h2>Choose a career</h2><div class="picks scroll">${CCS.data.careers.map((c) =>
      `<button class="pick" data-act="career" data-id="${c.id}">${c.emoji} ${c.name}<small>${c.description}</small></button>`).join('')}</div>`;
  },
  major() {
    return `<h2>Enroll — pick a major</h2><div class="picks">${CCS.data.majors.map((m) =>
      `<button class="pick" data-act="enroll" data-id="${m.id}">${m.emoji} ${m.name}</button>`).join('')}</div>`;
  },
  adopt() {
    return `<h2>🐾 Adopt a pet</h2>
      <label class="fld">Pet name<input id="petName" maxlength="16" value="Buddy"/></label>
      <div class="picks">${[['dog', '🐶'], ['cat', '🐱'], ['bunny', '🐰']].map(([t, e]) =>
        `<button class="pick" data-act="adopt" data-type="${t}">${e} ${cap(t)}</button>`).join('')}</div>`;
  },
  interact(m) {
    const d = CCS.data.npcById[m.id], n = CCS.sim.npc.ensure(m.id);
    const list = CCS.data.interactions.map((it) => {
      const gate = CCS.sim.npc.canInteract(m.id, it);
      return `<button class="pick ${gate.ok ? '' : 'dis'}" ${gate.ok ? `data-act="interact" data-id="${m.id}" data-int="${it.id}"` : ''}>
        ${it.emoji} ${it.label}${gate.ok ? '' : `<small>🔒 ${gate.hint}</small>`}</button>`;
    }).join('');
    return `<h2>${d.emoji} ${esc(d.name)} <small style="font-weight:400">${CCS.sim.npc.friendLabel(n)}</small></h2>
      <div class="sub">Mood: ${n.mood > 60 ? '🙂' : n.mood > 35 ? '😐' : '☹️'} · Trust ${Math.round(n.trust)}${n.romance ? ` · Romance ${Math.round(n.romance)}` : ''}</div>
      <div class="picks scroll">${list}</div>
      <button class="btn ghost" data-act="closeModal">Done</button>`;
  },
};

// ===========================================================================
// Click handling (single delegated listener)
// ===========================================================================
function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const d = el.dataset, act = d.act;
  if (!act) return;

  switch (act) {
    case 'tab': CCS.ui.setTab(d.tab); break;
    case 'action': CCS.sim.performAction(d.id); break;
    case 'travel': CCS.sim.worlds.travel(d.id); break;
    case 'petAction': CCS.sim.progression.petAction(d.pet, d.a); break;
    case 'meet': CCS.sim.npc.interact(d.id, 'greet'); break;
    case 'openInteract': CCS.ui.openModal('interact', { id: d.id }); break;
    case 'interact': CCS.sim.npc.interact(d.id, d.int); break; // modal re-renders via state-changed
    case 'openLifepath': CCS.ui.openModal('lifepath'); break;
    case 'openCareer': CCS.ui.openModal('career'); break;
    case 'openMajor': CCS.ui.openModal('major'); break;
    case 'openAdopt': CCS.ui.openModal('adopt'); break;
    case 'openBuild': CCS.ui.setTab('build'); break;
    case 'backHome': CCS.ui.setTab('home'); break;
    case 'buy': CCS.sim.home.buy(d.id); break;
    case 'sell': CCS.sim.home.sell(d.iid); break;
    case 'roomFilter': CCS.ui.state.room = d.room; CCS.ui.render(); break;
    case 'lifepath': CCS.sim.progression.chooseLifePath(d.id); CCS.ui.closeModal(); break;
    case 'career': CCS.sim.progression.chooseCareer(d.id); CCS.ui.closeModal(); break;
    case 'enroll': CCS.sim.progression.enrollSchool(d.id); CCS.ui.closeModal(); break;
    case 'adopt': CCS.sim.progression.adoptPet(d.type, inputVal('petName')); CCS.ui.closeModal(); break;
    case 'rename': { const nm = prompt('Name your Sim:', CCS.state.player.name); if (nm) { CCS.state.player.name = nm.slice(0, 24); CCS.sim.save(); CCS.ui.render(); } break; }
    case 'toggleTrait': toggleCreateTrait(d.id); break;
    case 'newgameConfirm': doCreate(); break;
    case 'closeModal': CCS.ui.closeModal(); break;
    case 'overlayClose': if (e.target === el) CCS.ui.closeModal(); break; // only backdrop clicks close
    case 'reset': if (confirm('Reset ALL progress and start over? This cannot be undone.')) { CCS.sim.reset(); location.reload(); } break;
  }
}

function toggleCreateTrait(id) {
  CCS.ui.state.createName = inputVal('newName'); // preserve typed name across re-render
  const t = CCS.ui.state.createTraits;
  const i = t.indexOf(id);
  if (i >= 0) t.splice(i, 1);
  else if (t.length < 2) t.push(id);
  renderModal();
}

function doCreate() {
  const name = inputVal('newName') || CCS.ui.state.createName || 'You';
  CCS.state.player.name = name.slice(0, 24);
  CCS.state.player.traits = CCS.ui.state.createTraits.length ? [...CCS.ui.state.createTraits] : ['Creative'];
  CCS.state.flags._created = true;
  CCS.sim.npc.discover('maya');
  CCS.sim.feed(`👋 Welcome, ${name}! Your story begins.`, '🎉');
  CCS.sim.save(true);
  CCS.ui.closeModal();
  CCS.ui.render();
}

// --- toast -----------------------------------------------------------------
CCS.ui.toast = function toast(msg) {
  const host = document.getElementById('toasts');
  if (!host) return;
  // Cap concurrent toasts so a burst of unlocks can't fill the screen.
  while (host.childElementCount >= 3) host.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
};

// --- misc helpers ----------------------------------------------------------
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function petEmoji(t) { return { dog: '🐶', cat: '🐱', bunny: '🐰' }[t] || '🐾'; }
function roomName(id) { return CCS.sim.ROOMS.find((r) => r.id === id)?.name || id; }
// A tiny "what does it do" tag for a catalog item.
function catalogBlurbTag(i) {
  const a = (i.actions || [])[0];
  if (!a) return '';
  if (a.effects?.skills) return `+${cap(Object.keys(a.effects.skills)[0])}`;
  if (a.effects?.needs) {
    const [k, v] = Object.entries(a.effects.needs).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
    return `${v > 0 ? '+' : ''}${cap(k)}`;
  }
  return '';
}
function petActEmoji(a) { return { feed: '🍖', play: '🎾', walk: '🦮', groom: '🛁', nap: '💤' }[a] || '🐾'; }
function rewardText(r = {}, u = {}) {
  const parts = [];
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.money) parts.push(`$${r.money}`);
  if (r.followers) parts.push(`${r.followers} followers`);
  if (r.confidence) parts.push(`+${r.confidence} confidence`);
  if (r.skills) for (const [k, v] of Object.entries(r.skills)) parts.push(`+${v} ${k}`);
  if (u.worlds) parts.push(`🗺️ ${u.worlds.map((w) => CCS.data.worldById[w]?.name).join(', ')}`);
  if (u.packs) parts.push(`📦 ${u.packs.map((p) => CCS.data.packById[p]?.name).join(', ')}`);
  return parts.join(' · ') || 'progress';
}
