/* Turning rows of job_steps into the checklist a cleaner sees.
 *
 * The Kee Method's phases are the shape of the working day, so the checklist
 * is grouped by phase — but the grouping has to survive real data: steps
 * created before the phase columns existed (null phase), a template that was
 * edited between two jobs, and rows arriving in any order.
 *
 * Kept here, out of the store, because this is the one piece of the checklist
 * that is worth testing on its own. */

export interface StepRow {
  id: string
  ord: number
  text: string
  photoRequired: boolean
  completed: boolean
  phaseTitle: string | null
  phaseOrd: number | null
}

export interface StepGroup<T = StepRow> {
  /** Phase number as the template defines it; null for un-phased rows. */
  ord: number | null
  title: string
  steps: T[]
  done: number
  total: number
}

/** Steps that predate the phase columns still have to render somewhere. */
export const UNPHASED_TITLE = 'The Kee Method™'

/** Group rows by phase, in phase order then step order. Un-phased rows collect
 *  into a single trailing group so nothing is ever silently dropped. */
export function groupSteps(rows: StepRow[]): StepGroup[] {
  const byKey = new Map<string, StepGroup>()
  for (const r of rows) {
    const key = r.phaseOrd == null ? '~' : String(r.phaseOrd)
    let g = byKey.get(key)
    if (!g) {
      g = { ord: r.phaseOrd, title: r.phaseTitle || UNPHASED_TITLE, steps: [], done: 0, total: 0 }
      byKey.set(key, g)
    }
    g.steps.push(r)
  }
  const groups = Array.from(byKey.values())
  // Un-phased last, everything else by phase number.
  groups.sort((a, b) => {
    if (a.ord == null) return b.ord == null ? 0 : 1
    if (b.ord == null) return -1
    return a.ord - b.ord
  })
  for (const g of groups) {
    g.steps.sort((a, b) => a.ord - b.ord)
    g.total = g.steps.length
    g.done = g.steps.filter((s) => s.completed).length
  }
  return groups
}

/** Overall progress across every phase — what the ring on the header shows. */
export function checklistProgress(rows: StepRow[]): { done: number; total: number; pct: number } {
  const total = rows.length
  const done = rows.filter((r) => r.completed).length
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 }
}
