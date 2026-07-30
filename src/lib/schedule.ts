/* Two-hour arrival windows.
 *
 * The windows are written the way a person says them — "8 – 10 AM", "12 – 2 PM"
 * — so the meridiem is often only on the END of the range. Reading the first
 * AM/PM in the string gets "8 – 10 AM" wrong (it lands on 10 AM), which both
 * mis-marks a day as booked and books the clean at the wrong hour. So the
 * parser reads the range, not the first thing that looks like a time. */

/** Her day: five two-hour windows. */
export const SLOTS = ['8 – 10 AM', '10 AM – 12 PM', '12 – 2 PM', '2 – 4 PM', '4 – 6 PM']

const DASH = /[–—-]/

function hour(txt: string, assume: 'AM' | 'PM' | null): number | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec((txt || '').trim())
  if (!m) return null
  const raw = parseInt(m[1], 10)
  if (raw < 1 || raw > 12) return null
  const mer = ((m[3] || assume || '') as string).toUpperCase()
  const h = raw % 12
  return mer === 'PM' ? h + 12 : h
}

/** Start and end hour (0–23) of a window label, or nulls if it can't be read. */
export function slotHours(label: string): { start: number | null; end: number | null } {
  const parts = String(label || '').split(DASH).map((x) => x.trim())
  const endMer = (/(AM|PM)/i.exec(parts[1] || '')?.[1]?.toUpperCase() as 'AM' | 'PM' | undefined) ?? null
  const end = hour(parts[1] || '', endMer)
  const startHasMer = /(AM|PM)/i.test(parts[0] || '')
  if (startHasMer || end == null) return { start: hour(parts[0] || '', null), end }
  // No meridiem on the start — it takes the end's, unless that would make the
  // window run backwards ("11 – 1 PM" starts in the morning).
  const sameHalf = hour(parts[0], endMer)
  if (sameHalf != null && sameHalf < end) return { start: sameHalf, end }
  return { start: hour(parts[0], endMer === 'PM' ? 'AM' : 'PM'), end }
}

/** The real timestamps for a window on a given day, in the browser's timezone.
 *  A window that can't be read falls back to two hours from 10 AM. */
export function windowFor(year: number, month: number, day: number, label: string): { start: Date; end: Date } {
  const { start, end } = slotHours(label)
  const h0 = start ?? 10
  const h1 = end != null && end > h0 ? end : h0 + 2
  return {
    start: new Date(year, month, day, h0, 0, 0, 0),
    end: new Date(year, month, day, h1, 0, 0, 0),
  }
}

/** Is this window already taken by one of the day's bookings? Matched on the
 *  start hour, which is what a two-hour window is identified by. */
export function slotTaken(label: string, bookedStarts: Array<string | Date | undefined>): boolean {
  const { start } = slotHours(label)
  if (start == null) return false
  return bookedStarts.some((iso) => {
    if (!iso) return false
    const d = iso instanceof Date ? iso : new Date(iso)
    return !isNaN(d.getTime()) && d.getHours() === start
  })
}
