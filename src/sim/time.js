// ============================================================================
// time.js — the clock and schedule (#7).
//
// Time advances when you DO things (each action costs hours). Every hour that
// passes drains needs and pet needs. Period labels + schedules gate content.
// ============================================================================

/* CCS is the shared global from core.js */
CCS.sim = CCS.sim || {};

CCS.sim.time = {
  periodOf(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  },

  periodEmoji(hour) {
    return { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' }[this.periodOf(hour)];
  },

  label() {
    const t = CCS.state.time;
    const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
    const ampm = t.hour < 12 ? 'AM' : 'PM';
    return `${CCS.sim.DAYS[t.dow]} ${h}:${String(Math.floor(t.minute)).padStart(2, '0')} ${ampm}`;
  },

  // Trait-adjusted per-hour need change.
  hourlyDelta(key) {
    const def = CCS.sim.NEEDS[key];
    let d = def.hourly;
    const traits = CCS.state.player.traits;
    if (key === 'energy' && traits.includes('Athletic')) d *= 0.6;
    if ((key === 'hygiene' || key === 'environment') && traits.includes('Neat')) d *= 0.6;
    if (key === 'stress' && traits.includes('Chill')) d *= 0.6;
    if (key === 'social' && traits.includes('Extrovert')) d *= 1.25;
    return d;
  },

  decayNeeds(hours) {
    const n = CCS.state.needs;
    for (const key of Object.keys(CCS.sim.NEEDS)) {
      // Environment drifts toward your home's ambiance (decor keeps it high).
      if (key === 'environment' && CCS.sim.home) {
        const target = CCS.sim.home.ambianceTarget();
        n.environment = CCS.util.clamp(n.environment + (target - n.environment) * Math.min(1, 0.09 * hours), 0, 100);
        continue;
      }
      n[key] = CCS.util.clamp((n[key] ?? 70) + this.hourlyDelta(key) * hours, 0, 100);
    }
    // Pets get hungry and miss you too.
    for (const pet of CCS.state.pets) {
      pet.needs.hunger = CCS.util.clamp(pet.needs.hunger - 3 * hours, 0, 100);
      pet.needs.energy = CCS.util.clamp(pet.needs.energy - 1.5 * hours, 0, 100);
      pet.needs.affection = CCS.util.clamp(pet.needs.affection - 1.8 * hours, 0, 100);
      pet.needs.cleanliness = CCS.util.clamp(pet.needs.cleanliness - 1.5 * hours, 0, 100);
    }
  },

  // Advance the clock by `hours` (may be fractional), draining needs each step.
  advance(hours) {
    const t = CCS.state.time;
    this.decayNeeds(hours);

    let remaining = hours;
    while (remaining > 0) {
      const step = Math.min(remaining, 1);
      t.minute += step * 60;
      while (t.minute >= 60) {
        t.minute -= 60;
        t.hour += 1;
        if (t.hour >= 24) {
          t.hour -= 24;
          t.day += 1;
          t.dow = (t.dow + 1) % 7;
          CCS.sim.onNewDay?.();
        }
      }
      remaining -= step;
    }
    CCS.events.emit('time-changed', t);
  },

  // Is `hour` within [after, before)? Handles overnight windows too.
  inWindow(hour, after, before) {
    if (after == null && before == null) return true;
    if (after != null && before != null) {
      return after <= before ? (hour >= after && hour < before) : (hour >= after || hour < before);
    }
    if (after != null) return hour >= after;
    return hour < before;
  },
};

// New-day bookkeeping: reset daily counters, small "fresh day" nudge.
CCS.sim.onNewDay = function onNewDay() {
  const s = CCS.state;
  s.stats.daysLived += 1;
  s.stats.actionsToday = 0;
  s.stats.goodMoodActionsToday = 0;
  s.flags._recentQuestWins = 0;
  CCS.sim.feed?.(`🌅 A new day begins — ${CCS.sim.DAYS[s.time.dow]}, day ${s.time.day}.`, '🌅');
};
