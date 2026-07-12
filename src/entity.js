// ============================================================================
// entity.js — the Sim you control (and the shell used for other online players).
// ============================================================================

/* `CCS` is the shared global created in core.js (loaded first). */

CCS.createPlayer = function createPlayer(opts = {}) {
  return {
    id: opts.id || CCS.util.randId(),
    name: opts.name || 'You',
    color: opts.color || CCS.util.randColor(),
    x: opts.x ?? 400,
    y: opts.y ?? 300,
    dir: 'down',
    moving: false,
    money: opts.money ?? 200,

    needs: CCS.needs.fresh(),

    // Current timed action (sleeping, eating...). null when free to move.
    activity: null, // { obj, timeLeft, duration, verb }

    // Try to move by (dx, dy) this frame, sliding along walls.
    tryMove(dx, dy) {
      if (this.activity) return; // busy doing something
      const r = 11; // collision radius
      // Move on each axis separately so we slide along walls instead of sticking.
      if (dx !== 0) {
        const nx = this.x + dx;
        if (!CCS.world.isBlocked(nx - r, this.y) && !CCS.world.isBlocked(nx + r, this.y) &&
            !CCS.world.isBlocked(nx - r, this.y - r) && !CCS.world.isBlocked(nx + r, this.y + r)) {
          this.x = nx;
        }
      }
      if (dy !== 0) {
        const ny = this.y + dy;
        if (!CCS.world.isBlocked(this.x, ny - r) && !CCS.world.isBlocked(this.x, ny + r) &&
            !CCS.world.isBlocked(this.x - r, ny - r) && !CCS.world.isBlocked(this.x + r, ny + r)) {
          this.y = ny;
        }
      }
      if (dx < 0) this.dir = 'left';
      else if (dx > 0) this.dir = 'right';
      else if (dy < 0) this.dir = 'up';
      else if (dy > 0) this.dir = 'down';
    },

    // Begin using an object.
    startActivity(obj) {
      if (this.activity || !obj?.action) return;
      const a = obj.action;
      if (a.cost && this.money < a.cost) {
        CCS.ui?.toast(`You can't afford ${a.label} ($${a.cost}).`);
        return;
      }
      this.activity = {
        obj,
        verb: a.verb || a.label.toLowerCase(),
        duration: a.duration,
        timeLeft: a.duration,
      };
      CCS.events.emit('interact-start', { player: this, obj });
    },

    cancelActivity() {
      if (this.activity) {
        CCS.events.emit('interact-cancel', { player: this, obj: this.activity.obj });
        this.activity = null;
      }
    },

    // Called every frame with real seconds elapsed.
    update(dt) {
      if (!this.activity) return;
      this.activity.timeLeft -= dt;
      if (this.activity.timeLeft <= 0) {
        this.finishActivity();
      }
    },

    finishActivity() {
      const { obj } = this.activity;
      const a = obj.action;
      for (const [need, delta] of Object.entries(a.effects || {})) {
        if (this.needs[need] == null) this.needs[need] = 80;
        this.needs[need] = CCS.util.clamp(this.needs[need] + delta, 0, 100);
      }
      if (a.cost) this.money -= a.cost;
      if (a.earn) this.money += a.earn;
      CCS.events.emit('interact-finish', { player: this, obj });
      if (a.earn) CCS.ui?.toast(`💰 Earned $${a.earn}!`);
      this.activity = null;
    },

    moodInfo() { return CCS.needs.mood(this.needs); },
  };
};
