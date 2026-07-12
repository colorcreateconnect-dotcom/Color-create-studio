// ============================================================================
// game.js — boots the game and runs the main loop.
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.game = (() => {
  let last = 0;
  const clock = {
    minutes: 8 * 60,   // start at 08:00
    day: 1,
    get timeString() {
      const h = Math.floor(this.minutes / 60) % 24;
      const m = Math.floor(this.minutes % 60);
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12 = ((h + 11) % 12) + 1;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    },
  };

  function start() {
    const canvas = document.getElementById('game');
    CCS.render.init(canvas);
    CCS.input.init();
    CCS.ui.init();

    // Create the player the person controls.
    const savedName = localStorage.getItem('ccs.name') || 'You';
    CCS.player = CCS.createPlayer({ name: savedName, x: 400, y: 300 });

    // Interact key: start using the nearby object, or cancel the current one.
    CCS.events.on('key-interact', () => {
      if (CCS.player.activity) { CCS.player.cancelActivity(); return; }
      const obj = CCS.world.nearestUsable(CCS.player.x, CCS.player.y);
      if (obj) CCS.player.startActivity(obj);
    });

    // Load mods, then begin the loop.
    CCS.modManager.loadFromManifest().finally(() => {
      last = performance.now();
      requestAnimationFrame(loop);
    });
  }

  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.1); // clamp big jumps (e.g. after tab switch)

    step(dt);
    requestAnimationFrame(loop);
  }

  function step(dt) {
    const p = CCS.player;

    // --- Advance the in-game clock ---
    const gameMinutes = dt * CCS.config.gameMinutesPerSecond;
    clock.minutes += gameMinutes;
    while (clock.minutes >= 1440) { clock.minutes -= 1440; clock.day++; }

    // --- Movement ---
    const ax = CCS.input.axis();
    if (ax.x || ax.y) {
      p.tryMove(ax.x * CCS.config.playerSpeed * dt, ax.y * CCS.config.playerSpeed * dt);
    }

    // --- Needs drain + activity progress ---
    CCS.needs.decay(p.needs, gameMinutes);
    p.update(dt);

    // Let mods run periodic logic.
    CCS.events.emit('tick', { dt, gameMinutes, clock });

    // --- Networking ---
    CCS.net.update(dt);

    // --- Draw + HUD ---
    const usable = p.activity ? null : CCS.world.nearestUsable(p.x, p.y);
    CCS.render.frame({ player: p, remotePlayers: CCS.net.remotePlayers, usable });
    CCS.ui.updateHud(p, clock);
  }

  return { start, clock };
})();

window.addEventListener('DOMContentLoaded', () => CCS.game.start());
