/* When a contractor is free.
 *
 * This decides whether a second clean can be booked on top of one they already
 * have. Getting it wrong means someone is expected in two homes at once, so the
 * boundary cases are pinned here: touching windows, a job with no end recorded,
 * a cancelled job, and time off with no job behind it. */
import { describe, it, expect } from 'vitest'
import {
  busyWindows, overlaps, isFree, conflictIn, mergeBusy,
  busyMinutesBetween, dayAvailability, dayIsFull,
} from './availability'
import { SLOTS, slotHours } from './schedule'

const at = (h: number, d = 3) => new Date(2026, 7, d, h, 0, 0, 0)
const iso = (h: number, d = 3) => at(h, d).toISOString()
const win = (h1: number, h2: number, d = 3) => ({ start: at(h1, d).getTime(), end: at(h2, d).getTime() })

const job = (id: string, h1: number, h2: number | null, extra: any = {}) => ({
  id, windowStart: iso(h1), windowEnd: h2 == null ? null : iso(h2), ...extra,
})

describe('busyWindows', () => {
  it('turns a booked clean into a busy window', () => {
    const b = busyWindows([job('j1', 10, 12, { propertyName: 'Ridgeview Home' })])
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ kind: 'job', jobId: 'j1', reason: 'Booked · Ridgeview Home' })
    expect(new Date(b[0].start).getHours()).toBe(10)
    expect(new Date(b[0].end).getHours()).toBe(12)
  })

  it('gives a job with no end recorded a two-hour window, not a zero-length one', () => {
    // Zero-length would let a second clean be booked right on top of it.
    const b = busyWindows([job('j1', 10, null)])
    expect(new Date(b[0].end).getHours()).toBe(12)
    expect(isFree(win(10, 12), b)).toBe(false)
  })

  it('ignores a cancelled clean — it holds no window', () => {
    expect(busyWindows([job('j1', 10, 12, { status: 'cancelled' })])).toEqual([])
  })

  it('ignores work with no window set at all', () => {
    expect(busyWindows([{ id: 'j1', windowStart: null, windowEnd: null }])).toEqual([])
    expect(busyWindows([{ id: 'j2', windowStart: 'not a date', windowEnd: null }])).toEqual([])
  })

  it('includes time off that has no job behind it', () => {
    const b = busyWindows([], [{ id: 'b1', startsAt: iso(9), endsAt: iso(17), reason: 'Time off' }])
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ kind: 'block', reason: 'Time off' })
  })

  it('names a block with no reason honestly', () => {
    const b = busyWindows([], [{ id: 'b1', startsAt: iso(9), endsAt: iso(10) }])
    expect(b[0].reason).toBe('Unavailable')
  })

  it('drops a block that ends before it starts', () => {
    expect(busyWindows([], [{ id: 'b1', startsAt: iso(12), endsAt: iso(10) }])).toEqual([])
    expect(busyWindows([], [{ id: 'b2', startsAt: iso(12), endsAt: iso(12) }])).toEqual([])
  })

  it('returns both sources in time order', () => {
    const b = busyWindows(
      [job('j1', 14, 16)],
      [{ id: 'b1', startsAt: iso(8), endsAt: iso(9) }],
    )
    expect(b.map((x) => x.kind)).toEqual(['block', 'job'])
  })
})

describe('overlaps — the boundary that matters', () => {
  it('a clean ending at 12 does not collide with one starting at 12', () => {
    expect(overlaps(win(10, 12), win(12, 14))).toBe(false)
    expect(overlaps(win(12, 14), win(10, 12))).toBe(false)
  })

  it('one minute of shared time is a collision', () => {
    const a = win(10, 12)
    const b = { start: at(11).getTime() + 59 * 60000, end: at(14).getTime() }
    expect(overlaps(a, b)).toBe(true)
  })

  it('a window fully inside another collides', () => {
    expect(overlaps(win(10, 16), win(12, 13))).toBe(true)
    expect(overlaps(win(12, 13), win(10, 16))).toBe(true)
  })

  it('different days do not collide', () => {
    expect(overlaps(win(10, 12, 3), win(10, 12, 4))).toBe(false)
  })
})

describe('isFree / conflictIn', () => {
  const busy = busyWindows([job('j1', 10, 12, { propertyName: 'Skyline Loft 12B' })])

  it('is free before and after, busy during', () => {
    expect(isFree(win(8, 10), busy)).toBe(true)
    expect(isFree(win(10, 12), busy)).toBe(false)
    expect(isFree(win(12, 14), busy)).toBe(true)
  })

  it('says what the conflict is, so the app can explain it', () => {
    expect(conflictIn(win(11, 13), busy)?.reason).toBe('Booked · Skyline Loft 12B')
    expect(conflictIn(win(14, 16), busy)).toBeNull()
  })

  it('is free when nothing is booked', () => {
    expect(isFree(win(10, 12), [])).toBe(true)
  })
})

describe('mergeBusy', () => {
  it('runs two back-to-back cleans together', () => {
    const b = busyWindows([job('j1', 10, 12), job('j2', 12, 14)])
    const merged = mergeBusy(b)
    expect(merged).toHaveLength(1)
    expect(new Date(merged[0].start).getHours()).toBe(10)
    expect(new Date(merged[0].end).getHours()).toBe(14)
  })

  it('keeps a gap as two intervals', () => {
    const b = busyWindows([job('j1', 8, 10), job('j2', 14, 16)])
    expect(mergeBusy(b)).toHaveLength(2)
  })

  it('absorbs a block that sits inside a job', () => {
    const b = busyWindows([job('j1', 8, 18)], [{ id: 'b1', startsAt: iso(12), endsAt: iso(13) }])
    expect(mergeBusy(b)).toHaveLength(1)
  })
})

describe('busyMinutesBetween', () => {
  it('counts committed time without double-counting an overlap', () => {
    const b = busyWindows([job('j1', 10, 12), job('j2', 11, 14)])
    const from = at(0).getTime(), to = at(23).getTime()
    expect(busyMinutesBetween(b, from, to)).toBe(240)   // 10–14, not 2h + 3h
  })

  it('clips to the day asked about', () => {
    const b = busyWindows([], [{ id: 'b1', startsAt: iso(20, 3), endsAt: iso(4, 4) }])
    const from = at(0, 4).getTime(), to = at(24, 4).getTime()
    expect(busyMinutesBetween(b, from, to)).toBe(240)   // only the 4 hours on the 4th
  })

  it('is zero on a clear day', () => {
    expect(busyMinutesBetween([], at(0).getTime(), at(24).getTime())).toBe(0)
  })
})

describe('dayAvailability — the five arrival windows', () => {
  const hours = (label: string) => slotHours(label)

  it('opens every window on a clear day', () => {
    const d = dayAvailability(2026, 7, 3, SLOTS, hours, [])
    expect(d.map((w) => w.free)).toEqual([true, true, true, true, true])
    expect(dayIsFull(d)).toBe(false)
  })

  it('closes exactly the window a clean occupies', () => {
    const busy = busyWindows([job('j1', 10, 12, { propertyName: 'Ridgeview Home' })])
    const d = dayAvailability(2026, 7, 3, SLOTS, hours, busy)
    expect(d.map((w) => w.free)).toEqual([true, false, true, true, true])
    expect(d[1].conflict?.reason).toBe('Booked · Ridgeview Home')
  })

  it('closes two windows when a clean straddles them', () => {
    const busy = busyWindows([job('j1', 11, 13)])
    const d = dayAvailability(2026, 7, 3, SLOTS, hours, busy)
    // 10–12 and 12–2 both share time with 11–1.
    expect(d.map((w) => w.free)).toEqual([true, false, false, true, true])
  })

  it('a day off closes the whole day', () => {
    const busy = busyWindows([], [{ id: 'b1', startsAt: iso(0), endsAt: iso(24), reason: 'Time off' }])
    const d = dayAvailability(2026, 7, 3, SLOTS, hours, busy)
    expect(dayIsFull(d)).toBe(true)
    expect(d.every((w) => w.conflict?.reason === 'Time off')).toBe(true)
  })

  it('leaves the next day alone', () => {
    const busy = busyWindows([job('j1', 10, 12)])   // the 3rd
    const d = dayAvailability(2026, 7, 4, SLOTS, hours, busy)
    expect(d.every((w) => w.free)).toBe(true)
  })

  it('a job the studio assigned blocks the contractor the same as their own', () => {
    // The whole point: their own client and Ahleyia's client compete for the
    // same hours, because it is one person.
    const mine = busyWindows([job('own', 10, 12)])
    const theirs = busyWindows([job('assigned', 10, 12)])
    const both = busyWindows([job('own', 8, 10), job('assigned', 10, 12)])
    expect(dayAvailability(2026, 7, 3, SLOTS, hours, mine)[1].free).toBe(false)
    expect(dayAvailability(2026, 7, 3, SLOTS, hours, theirs)[1].free).toBe(false)
    expect(dayAvailability(2026, 7, 3, SLOTS, hours, both).map((w) => w.free))
      .toEqual([false, false, true, true, true])
  })
})
