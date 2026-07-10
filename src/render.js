// ============================================================================
// render.js — draws everything onto the canvas each frame.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.render = (() => {
  let ctx, canvas;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    const t = CCS.config.tileSize;
    canvas.width = CCS.config.cols * t;
    canvas.height = CCS.config.rows * t;
  }

  function drawFloor() {
    const t = CCS.config.tileSize;
    for (let row = 0; row < CCS.config.rows; row++) {
      for (let col = 0; col < CCS.config.cols; col++) {
        const wall = CCS.world.isWall(col, row);
        if (wall) {
          ctx.fillStyle = '#3a3550';
        } else {
          // Checkerboard floor tiles
          ctx.fillStyle = (col + row) % 2 === 0 ? '#f3ead9' : '#eadfc8';
        }
        ctx.fillRect(col * t, row * t, t, t);
        if (wall) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(col * t, row * t, t, 4);
        }
      }
    }
  }

  function drawObjects() {
    const t = CCS.config.tileSize;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const obj of CCS.world.objects) {
      const w = (obj.w || 1) * t;
      const h = (obj.h || 1) * t;
      const x = obj.col * t;
      const y = obj.row * t;
      // soft shadow pad
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      roundRect(x + 3, y + 5, w - 6, h - 6, 8);
      ctx.fill();
      ctx.fillStyle = obj.tint || 'rgba(255,255,255,0.55)';
      roundRect(x + 3, y + 3, w - 6, h - 6, 8);
      ctx.fill();
      ctx.font = `${Math.min(w, h) * 0.62}px system-ui, sans-serif`;
      ctx.fillText(obj.emoji || '📦', x + w / 2, y + h / 2 + 1);
    }
  }

  // Draw a Sim (used for both the local player and remote players).
  function drawSim(p, isSelf) {
    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = isSelf ? 3 : 2;
    ctx.strokeStyle = isSelf ? '#ffffff' : 'rgba(255,255,255,0.55)';
    ctx.stroke();

    // face (mood emoji)
    const mood = p.moodInfo ? p.moodInfo().emoji : (p.mood || '🙂');
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mood, p.x, p.y + 1);

    // name tag
    ctx.font = '600 12px system-ui, sans-serif';
    const name = p.name || 'Sim';
    const w = ctx.measureText(name).width + 12;
    ctx.fillStyle = 'rgba(20,18,32,0.78)';
    roundRect(p.x - w / 2, p.y - 34, w, 17, 8);
    ctx.fill();
    ctx.fillStyle = isSelf ? '#ffe27a' : '#ffffff';
    ctx.fillText(name, p.x, p.y - 25);

    // activity bubble
    const verb = p.activity?.verb || (p.action || '');
    if (verb) {
      ctx.font = '11px system-ui, sans-serif';
      const bw = ctx.measureText(verb).width + 14;
      ctx.fillStyle = 'rgba(124,198,255,0.95)';
      roundRect(p.x - bw / 2, p.y - 54, bw, 17, 8);
      ctx.fill();
      ctx.fillStyle = '#10131c';
      ctx.fillText(verb, p.x, p.y - 45);
    }
    ctx.restore();
  }

  // Highlight the object you're standing next to.
  function drawUsableHint(obj) {
    if (!obj) return;
    const t = CCS.config.tileSize;
    const x = obj.col * t, y = obj.row * t;
    const w = (obj.w || 1) * t, h = (obj.h || 1) * t;
    ctx.save();
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    roundRect(x + 2, y + 2, w - 4, h - 4, 8);
    ctx.stroke();
    ctx.restore();

    // "Press E — Label" prompt
    const label = `Press E · ${obj.action.label}`;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bw = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(20,18,32,0.9)';
    roundRect(x + w / 2 - bw / 2, y - 22, bw, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(label, x + w / 2, y - 13);
  }

  function drawActivityBar(p) {
    if (!p.activity) return;
    const pct = 1 - p.activity.timeLeft / p.activity.duration;
    const bw = 60, bh = 8;
    const x = p.x - bw / 2, y = p.y - 70;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(x, y, bw, bh, 4); ctx.fill();
    ctx.fillStyle = '#7cffa0';
    roundRect(x, y, bw * pct, bh, 4); ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function frame(state) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFloor();
    drawObjects();

    // Remote players first (so your Sim draws on top)
    for (const rp of Object.values(state.remotePlayers)) drawSim(rp, false);

    drawUsableHint(state.usable);
    drawSim(state.player, true);
    drawActivityBar(state.player);

    CCS.events.emit('render', ctx); // let mods draw extra stuff
  }

  return { init, frame };
})();
