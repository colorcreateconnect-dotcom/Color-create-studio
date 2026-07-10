// ============================================================================
// Color Create Studio — game server
//
// Does two jobs at once:
//   1. Serves the game files (index.html, /src, /mods) over http://localhost:3000
//   2. Runs the realtime multiplayer world over WebSockets (the "GTA Online" part)
//
// Run it with:   npm install   then   npm start
// Then open:     http://localhost:3000
// ============================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Resolve inside ROOT only (block path traversal)
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  } catch {
    res.writeHead(500).end('Server error');
  }
});

// ---------------------------------------------------------------------------
// Multiplayer world (rooms of players who share the same lot in real time)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server });

/** rooms: Map<roomName, Map<playerId, {ws, state}>> */
const rooms = new Map();
let nextId = 1;

function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, new Map());
  return rooms.get(name);
}

function broadcast(room, msg, exceptId = null) {
  const data = JSON.stringify(msg);
  for (const [id, player] of room) {
    if (id === exceptId) continue;
    if (player.ws.readyState === player.ws.OPEN) player.ws.send(data);
  }
}

wss.on('connection', (ws) => {
  const id = String(nextId++);
  let roomName = null;
  let room = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join': {
        roomName = String(msg.room || 'lobby').slice(0, 40);
        room = getRoom(roomName);

        const state = {
          id,
          name: String(msg.name || 'Sim').slice(0, 24),
          color: msg.color || '#7cc6ff',
          x: msg.x || 400,
          y: msg.y || 300,
          mood: msg.mood || '🙂',
          action: '',
        };
        room.set(id, { ws, state });

        // Tell the newcomer who they are + who's already here
        ws.send(JSON.stringify({
          type: 'welcome',
          id,
          room: roomName,
          players: [...room.values()].map((p) => p.state),
        }));

        // Tell everyone else someone joined
        broadcast(room, { type: 'player-joined', player: state }, id);
        break;
      }

      case 'state': {
        if (!room || !room.has(id)) break;
        const p = room.get(id);
        // Only accept known fields
        if (typeof msg.x === 'number') p.state.x = msg.x;
        if (typeof msg.y === 'number') p.state.y = msg.y;
        if (typeof msg.mood === 'string') p.state.mood = msg.mood.slice(0, 8);
        if (typeof msg.action === 'string') p.state.action = msg.action.slice(0, 40);
        broadcast(room, { type: 'player-moved', player: p.state }, id);
        break;
      }

      case 'chat': {
        if (!room || !room.has(id)) break;
        const p = room.get(id);
        broadcast(room, {
          type: 'chat',
          id,
          name: p.state.name,
          text: String(msg.text || '').slice(0, 240),
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (room && room.has(id)) {
      room.delete(id);
      broadcast(room, { type: 'player-left', id });
      if (room.size === 0 && roomName) rooms.delete(roomName);
    }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🎮  Color Create Studio is running!');
  console.log('  ─────────────────────────────────────');
  console.log(`  ▶  Play here:  http://localhost:${PORT}`);
  console.log('  ▶  Share your local network address with friends on the same');
  console.log('     Wi-Fi to play together, or deploy this server online.');
  console.log('');
});
