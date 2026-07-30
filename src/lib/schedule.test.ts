import { describe, it, expect } from 'vitest'
import { SLOTS, slotHours, windowFor, slotTaken } from './schedule'

describe('slotHours', () => {
  it('reads every window on her real day', () => {
    expect(SLOTS.map((s) => slotHours(s))).toEqual([
      { start: 8, end: 10 },
      { start: 10, end: 12 },
      { start: 12, end: 14 },
      { start: 14, end: 16 },
      { start: 16, end: 18 },
    ])
  })

  it('does not mistake the end meridiem for the start (the "8 – 10 AM" trap)', () => {
    // Reading the first AM/PM in the string gives 10 — which silently books
    // the clean two hours late and marks the wrong window as taken.
    expect(slotHours('8 – 10 AM').start).toBe(8)
  })

  it('keeps a window that crosses noon in the right half of the day', () => {
    expect(slotHours('11 – 1 PM')).toEqual({ start: 11, end: 13 })
    expect(slotHours('12 – 2 PM')).toEqual({ start: 12, end: 14 })
  })

  it('honours an explicit meridiem on both ends', () => {
    expect(slotHours('10 AM – 12 PM')).toEqual({ start: 10, end: 12 })
    expect(slotHours('9 PM – 11 PM')).toEqual({ start: 21, end: 23 })
  })

  it('accepts an en dash, an em dash or a hyphen', () => {
    expect(slotHours('2 – 4 PM').start).toBe(14)
    expect(slotHours('2 — 4 PM').start).toBe(14)
    expect(slotHours('2 - 4 PM').start).toBe(14)
  })

  it('returns nulls rather than a wrong hour for nonsense', () => {
    expect(slotHours('')).toEqual({ start: null, end: null })
    expect(slotHours('sometime')).toEqual({ start: null, end: null })
    expect(slotHours('25 – 30 AM')).toEqual({ start: null, end: null })
  })
})

describe('windowFor', () => {
  it('builds the real local timestamps for a booked window', () => {
    const { start, end } = windowFor(2026, 6, 30, '8 – 10 AM')
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(30)
    expect(start.getHours()).toBe(8)
    expect(end.getHours()).toBe(10)
  })

  it('always produces a window that ends after it starts', () => {
    for (const s of SLOTS) {
      const { start, end } = windowFor(2026, 6, 30, s)
      expect(end.getTime()).toBeGreaterThan(start.getTime())
    }
  })

  it('falls back to a sane two hours when the label is unreadable', () => {
    const { start, end } = windowFor(2026, 6, 30, 'whenever')
    expect(start.getHours()).toBe(10)
    expect(end.getHours()).toBe(12)
  })
})

describe('slotTaken', () => {
  const day = (h: number) => new Date(2026, 6, 30, h, 0, 0).toISOString()

  it('marks only the window a booking actually occupies', () => {
    const booked = [day(10)]
    expect(SLOTS.map((s) => slotTaken(s, booked))).toEqual([false, true, false, false, false])
  })

  it('leaves every window open on a day with nothing booked', () => {
    expect(SLOTS.filter((s) => slotTaken(s, []))).toEqual([])
  })

  it('fills the day when every window is booked', () => {
    const booked = [day(8), day(10), day(12), day(14), day(16)]
    expect(SLOTS.every((s) => slotTaken(s, booked))).toBe(true)
  })

  it('ignores bookings with no window set', () => {
    expect(slotTaken('10 AM – 12 PM', [undefined, ''])).toBe(false)
  })
})
