// ============================================================================
// ui.js — the on-screen interface: needs bars, money/clock, the mods panel,
// multiplayer controls, chat, and toast messages.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.ui = (() => {
  const $ = (id) => document.getElementById(id);
  let els = {};

  function init() {
    els = {
      needs: $('needs'),
      money: $('money'),
      clock: $('clock'),
      day: $('day'),
      moodFace: $('mood-face'),
      moodLabel: $('mood-label'),
      modsList: $('mods-list'),
      toasts: $('toasts'),
      netStatus: $('net-status'),
      netDot: $('net-dot'),
      playerCount: $('player-count'),
      chatLog: $('chat-log'),
      chatInput: $('chat-input'),
      nameInput: $('name-input'),
      roomInput: $('room-input'),
      connectBtn: $('connect-btn'),
    };

    buildNeedsBars();

    // Rebuild bars if a mod adds/removes a need.
    CCS.events.on('needs-def-changed', buildNeedsBars);

    // Mods panel reacts to registrations + toggles.
    CCS.events.on('mod-registered', renderMods);
    CCS.events.on('mod-toggled', renderMods);
    CCS.events.on('mods-loaded', renderMods);

    // Network status indicator + player count.
    CCS.events.on('net-status', (s) => {
      const map = { online: ['#7cffa0', 'Online'], connecting: ['#ffd76b', 'Connecting…'], offline: ['#ff8f6b', 'Offline'] };
      const [color, label] = map[s] || map.offline;
      els.netDot.style.background = color;
      els.netStatus.textContent = label;
      els.connectBtn.textContent = s === 'online' ? 'Leave' : 'Go Online';
    });

    // Chat send on Enter.
    els.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        CCS.net.sendChat(els.chatInput.value);
        els.chatInput.value = '';
      }
    });

    // Connect / disconnect.
    els.connectBtn.addEventListener('click', () => {
      if (CCS.net.connected) { CCS.net.disconnect(); return; }
      const name = (els.nameInput.value || 'Sim').trim().slice(0, 24);
      CCS.player.name = name;
      CCS.net.connect(els.roomInput.value || 'lobby');
    });

    // Collapsible panels.
    document.querySelectorAll('[data-collapse]').forEach((h) => {
      h.addEventListener('click', () => {
        const target = document.getElementById(h.dataset.collapse);
        target.classList.toggle('collapsed');
        h.classList.toggle('collapsed');
      });
    });

    renderMods();
  }

  function buildNeedsBars() {
    if (!els.needs) return;
    els.needs.innerHTML = '';
    for (const [key, def] of Object.entries(CCS.needsDef)) {
      const row = document.createElement('div');
      row.className = 'need';
      row.innerHTML = `
        <span class="need-emoji">${def.emoji}</span>
        <div class="need-body">
          <div class="need-top"><span>${def.label}</span><span id="need-val-${key}">80</span></div>
          <div class="need-bar"><div class="need-fill" id="need-fill-${key}" style="background:${def.color}"></div></div>
        </div>`;
      els.needs.appendChild(row);
    }
  }

  // Called every frame with the current player to refresh the HUD.
  function updateHud(player, clock) {
    for (const [key, def] of Object.entries(CCS.needsDef)) {
      const v = CCS.util.clamp(player.needs[key] ?? 80, 0, 100);
      const fill = document.getElementById(`need-fill-${key}`);
      const val = document.getElementById(`need-val-${key}`);
      if (fill) {
        fill.style.width = `${v}%`;
        fill.style.filter = v < 20 ? 'saturate(1.4) brightness(1.1)' : 'none';
      }
      if (val) val.textContent = Math.round(v);
    }
    els.money.textContent = `$${Math.floor(player.money)}`;
    const mood = player.moodInfo();
    els.moodFace.textContent = mood.emoji;
    els.moodLabel.textContent = mood.label;

    els.clock.textContent = clock.timeString;
    els.day.textContent = `Day ${clock.day}`;

    const remoteCount = Object.keys(CCS.net.remotePlayers).length;
    els.playerCount.textContent = CCS.net.connected ? `${remoteCount + 1} online` : '';
  }

  function renderMods() {
    if (!els.modsList) return;
    const mods = CCS.modManager.list();
    if (mods.length === 0) {
      els.modsList.innerHTML = `<p class="hint">No mods loaded yet. Add files to the <code>/mods</code> folder and list them in <code>manifest.json</code>.</p>`;
      return;
    }
    els.modsList.innerHTML = '';
    for (const mod of mods) {
      const on = CCS.modManager.isEnabled(mod.id);
      const card = document.createElement('div');
      card.className = 'mod' + (on ? ' on' : '');
      card.innerHTML = `
        <div class="mod-info">
          <div class="mod-name">${mod.icon || '🔧'} ${mod.name} <span class="mod-ver">v${mod.version}</span></div>
          <div class="mod-desc">${mod.description || ''}</div>
          ${mod.author ? `<div class="mod-author">by ${mod.author}</div>` : ''}
        </div>
        <button class="switch ${on ? 'on' : ''}" aria-label="toggle"><span></span></button>`;
      card.querySelector('.switch').addEventListener('click', () => CCS.modManager.toggle(mod.id));
      els.modsList.appendChild(card);
    }
  }

  // --- Toasts (little popup messages) --------------------------------------
  function toast(msg) {
    if (!els.toasts) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    els.toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  // --- Chat ----------------------------------------------------------------
  function chatLog(text, kind = 'them') {
    if (!els.chatLog) return;
    const line = document.createElement('div');
    line.className = `chat-line ${kind}`;
    line.textContent = text;
    els.chatLog.appendChild(line);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
    while (els.chatLog.childElementCount > 80) els.chatLog.firstChild.remove();
  }

  return { init, updateHud, toast, chatLog, renderMods };
})();
