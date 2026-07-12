// ============================================================================
// net.js — the online multiplayer client (the "GTA Online" part).
//
// Connects to the game server over WebSocket, joins a room, and keeps your
// Sim's position/mood in sync with everyone else in the same room. If there's
// no server, the game just runs single-player — nothing breaks.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.net = (() => {
  let ws = null;
  let connected = false;
  let myId = null;
  let room = 'lobby';
  let sendTimer = 0;

  // Other players in the room: id -> a lightweight Sim-like object to draw.
  const remotePlayers = {};

  function url() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}`;
  }

  function connect(roomName) {
    room = (roomName || 'lobby').trim() || 'lobby';
    try { ws = new WebSocket(url()); }
    catch { setStatus('offline'); return; }

    setStatus('connecting');

    ws.onopen = () => {
      const p = CCS.player;
      send({
        type: 'join', room,
        name: p.name, color: p.color, x: p.x, y: p.y,
        mood: p.moodInfo().emoji,
      });
    };

    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      handle(msg);
    };

    ws.onclose = () => { connected = false; setStatus('offline'); clearRemotes(); };
    ws.onerror = () => { setStatus('offline'); };
  }

  function disconnect() {
    if (ws) { ws.close(); ws = null; }
    connected = false;
    clearRemotes();
    setStatus('offline');
  }

  function handle(msg) {
    switch (msg.type) {
      case 'welcome':
        myId = msg.id; connected = true; room = msg.room;
        setStatus('online');
        for (const s of msg.players) if (s.id !== myId) upsertRemote(s);
        CCS.ui?.toast(`🌐 Joined room "${room}"`);
        break;
      case 'player-joined':
        upsertRemote(msg.player);
        CCS.ui?.chatLog(`— ${msg.player.name} joined —`, 'system');
        break;
      case 'player-moved':
        upsertRemote(msg.player);
        break;
      case 'player-left': {
        const gone = remotePlayers[msg.id];
        if (gone) CCS.ui?.chatLog(`— ${gone.name} left —`, 'system');
        delete remotePlayers[msg.id];
        break;
      }
      case 'chat':
        CCS.ui?.chatLog(`${msg.name}: ${msg.text}`, msg.id === myId ? 'me' : 'them');
        break;
    }
  }

  // Create/update the drawable shell for a remote player, smoothing position.
  function upsertRemote(s) {
    if (s.id === myId) return;
    let rp = remotePlayers[s.id];
    if (!rp) {
      rp = remotePlayers[s.id] = {
        id: s.id, name: s.name, color: s.color,
        x: s.x, y: s.y, tx: s.x, ty: s.y,
        mood: s.mood, action: s.action || '',
      };
    }
    rp.name = s.name; rp.color = s.color;
    rp.tx = s.x; rp.ty = s.y;              // target (we lerp toward it)
    if (s.mood) rp.mood = s.mood;
    rp.action = s.action || '';
  }

  function clearRemotes() { for (const k of Object.keys(remotePlayers)) delete remotePlayers[k]; }

  // Smoothly interpolate remote players toward their latest known position.
  function update(dt) {
    for (const rp of Object.values(remotePlayers)) {
      rp.x = CCS.util.lerp(rp.x, rp.tx, Math.min(1, dt * 12));
      rp.y = CCS.util.lerp(rp.y, rp.ty, Math.min(1, dt * 12));
    }

    // Throttle how often we tell the server our state (~12x/sec).
    if (!connected) return;
    sendTimer += dt;
    if (sendTimer >= 0.08) {
      sendTimer = 0;
      const p = CCS.player;
      send({
        type: 'state',
        x: Math.round(p.x), y: Math.round(p.y),
        mood: p.moodInfo().emoji,
        action: p.activity?.verb || '',
      });
    }
  }

  function sendChat(text) {
    text = String(text || '').trim();
    if (!text) return;
    if (!connected) { CCS.ui?.chatLog('(offline — start the server to chat)', 'system'); return; }
    send({ type: 'chat', text });
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function setStatus(s) { CCS.events.emit('net-status', s); }

  return {
    connect, disconnect, update, sendChat,
    get remotePlayers() { return remotePlayers; },
    get connected() { return connected; },
    get room() { return room; },
  };
})();
