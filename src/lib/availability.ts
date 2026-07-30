/* When a contractor is free.
 *
 * Availability is mostly not typed in — it is implied. A clean you are booked
 * on is a window you cannot take another one in, whether it is your own client
 * or one the studio gave you. On top of that a contractor can block hours with
 * no job behind them: another commitment, a school run, a day off.
 *
 * So there is one list of busy windows from two sources, and everything else —
 * "is this window free", "which of today's five windows can I still take",
 * "can Ahleyia assign me this" — is a question about that list.
 *
 * Windows are half-open: [start, end). A clean ending at 12:00 does not
 * collide with one starting at 12:00, because it doesn't. */

export interface Window {
  start: number   // epoch ms
  end: number     // epoch ms
}

export interface BusyWindow extends Window {
  /** Why they're busy — shown when a window can't be taken. */
  reason: string
  /** The job this came from, when it came from a job. */
  jobId?: string
  kind: 'job' | 'block'
}

export interface JobLike {
  id: string
  windowStart?: string | null
  windowEnd?: string | null
  status?: string | null
  propertyName?: string | null
}

export interface BlockLike {
  id: string
  startsAt: string
  endsAt: string
  reason?: string | null
}

const ms = (iso?: string | null): number | null => {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return isNaN(t) ? null : t
}

/** Two hours, the length of an arrival window, used when a job has a start but
 *  no end recorded. Better than treating it as instantaneous, which would let
 *  a second clean be booked on top of it. */
const DEFAULT_JOB_MS = 2 * 60 * 60 * 1000

/** Every window this person is unavailable in, from both sources.
 *  Cancelled jobs don't hold a window; nothing else about them matters here. */
export function busyWindows(jobs: JobLike[], blocks: BlockLike[] = []): BusyWindow[] {
  const out: BusyWindow[] = []
  for (const j of jobs) {
    if (j.status === 'cancelled') continue
    const start = ms(j.windowStart)
    if (start == null) continue          // unscheduled work blocks nothing
    const end = ms(j.windowEnd)
    out.push({
      start,
      end: end != null && end > start ? end : start + DEFAULT_JOB_MS,
      reason: j.propertyName ? `Booked · ${j.propertyName}` : 'Booked',
      jobId: j.id,
      kind: 'job',
    })
  }
  for (const b of blocks) {
    const start = ms(b.startsAt)
    const end = ms(b.endsAt)
    if (start == null || end == null || end <= start) continue
    out.push({ start, end, reason: b.reason || 'Unavailable', kind: 'block' })
  }
  return out.sort((a, b) => a.start - b.start)
}

/** Do two windows collide? Half-open, so touching endpoints do not. */
export function overlaps(a: Window, b: Window): boolean {
  return a.start < b.end && b.start < a.end
}

/** What makes this window unavailable, or null if it's free. */
export function conflictIn(window: Window, busy: BusyWindow[]): BusyWindow | null {
  if (window.end <= window.start) return null
  for (const b of busy) if (overlaps(window, b)) return b
  return null
}

/** Is this person free for the whole of this window? */
export function isFree(window: Window, busy: BusyWindow[]): boolean {
  return conflictIn(window, busy) == null
}

/** Merge overlapping and touching busy windows into the fewest intervals — how
 *  a day reads to a person ("booked 10–4", not three separate rows). */
export function mergeBusy(busy: BusyWindow[]): Window[] {
  const sorted = busy.slice().sort((a, b) => a.start - b.start)
  const out: Window[] = []
  for (const w of sorted) {
    const last = out[out.length - 1]
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end)
    else out.push({ start: w.start, end: w.end })
  }
  return out
}

/** Total minutes committed inside a day — the number on "4h booked". */
export function busyMinutesBetween(busy: BusyWindow[], from: number, to: number): number {
  let total = 0
  for (const w of mergeBusy(busy)) {
    const start = Math.max(w.start, from)
    const end = Math.min(w.end, to)
    if (end > start) total += (end - start) / 60000
  }
  return Math.round(total)
}

export interface DayWindow {
  /** The label as the app writes it, e.g. '10 AM – 12 PM'. */
  label: string
  start: number
  end: number
  free: boolean
  /** Why not, when not. */
  conflict: BusyWindow | null
}

/** Which of a day's arrival windows this person can still take.
 *  `hoursFor` turns a label into its start/end hour — src/lib/schedule owns
 *  that, and is passed in so this module stays about availability only. */
export function dayAvailability(
  year: number, month: number, day: number,
  labels: string[],
  hoursFor: (label: string) => { start: number | null; end: number | null },
  busy: BusyWindow[],
): DayWindow[] {
  return labels.map((label) => {
    const { start, end } = hoursFor(label)
    const s = new Date(year, month, day, start ?? 10, 0, 0, 0).getTime()
    const e = new Date(year, month, day, end != null && end > (start ?? 10) ? end : (start ?? 10) + 2, 0, 0, 0).getTime()
    const conflict = conflictIn({ start: s, end: e }, busy)
    return { label, start: s, end: e, free: conflict == null, conflict }
  })
}

/** Is the whole day committed? Drives the dimmed days on the calendar. */
export function dayIsFull(windows: DayWindow[]): boolean {
  return windows.length > 0 && windows.every((w) => !w.free)
}
