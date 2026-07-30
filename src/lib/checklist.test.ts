import { describe, it, expect } from 'vitest'
import { groupSteps, checklistProgress, UNPHASED_TITLE, type StepRow } from './checklist'

const row = (p: Partial<StepRow> & { id: string; ord: number }): StepRow => ({
  text: 'step ' + p.id, photoRequired: false, completed: false,
  phaseTitle: null, phaseOrd: null, ...p,
})

describe('groupSteps', () => {
  it('groups by phase and orders phases by their number', () => {
    const g = groupSteps([
      row({ id: 'c', ord: 12, phaseOrd: 3, phaseTitle: 'Cleaning Order' }),
      row({ id: 'a', ord: 1, phaseOrd: 1, phaseTitle: 'Pre-Clean Walkthrough' }),
      row({ id: 'b', ord: 7, phaseOrd: 2, phaseTitle: 'Laundry Process' }),
    ])
    expect(g.map((x) => x.title)).toEqual(['Pre-Clean Walkthrough', 'Laundry Process', 'Cleaning Order'])
    expect(g.map((x) => x.ord)).toEqual([1, 2, 3])
  })

  it('orders the steps inside a phase by ord, not by arrival', () => {
    const g = groupSteps([
      row({ id: 'z', ord: 5, phaseOrd: 1, phaseTitle: 'P1' }),
      row({ id: 'y', ord: 2, phaseOrd: 1, phaseTitle: 'P1' }),
      row({ id: 'x', ord: 4, phaseOrd: 1, phaseTitle: 'P1' }),
    ])
    expect(g[0].steps.map((s) => s.ord)).toEqual([2, 4, 5])
  })

  it('counts done and total per phase', () => {
    const g = groupSteps([
      row({ id: 'a', ord: 1, phaseOrd: 1, phaseTitle: 'P1', completed: true }),
      row({ id: 'b', ord: 2, phaseOrd: 1, phaseTitle: 'P1' }),
      row({ id: 'c', ord: 3, phaseOrd: 2, phaseTitle: 'P2', completed: true }),
    ])
    expect(g[0]).toMatchObject({ done: 1, total: 2 })
    expect(g[1]).toMatchObject({ done: 1, total: 1 })
  })

  it('puts steps with no phase in one trailing group and drops nothing', () => {
    const g = groupSteps([
      row({ id: 'n1', ord: 2 }),
      row({ id: 'p', ord: 1, phaseOrd: 4, phaseTitle: 'Restocking' }),
      row({ id: 'n2', ord: 1 }),
    ])
    expect(g).toHaveLength(2)
    expect(g[0].title).toBe('Restocking')
    expect(g[1].title).toBe(UNPHASED_TITLE)
    expect(g[1].steps.map((s) => s.id)).toEqual(['n2', 'n1'])
    // every input row survives the grouping
    expect(g.reduce((n, x) => n + x.total, 0)).toBe(3)
  })

  it('falls back to the Kee Method title when a phase has no title', () => {
    const g = groupSteps([row({ id: 'a', ord: 1, phaseOrd: 2, phaseTitle: null })])
    expect(g[0].title).toBe(UNPHASED_TITLE)
    expect(g[0].ord).toBe(2)
  })

  it('handles an empty checklist', () => {
    expect(groupSteps([])).toEqual([])
  })
})

describe('checklistProgress', () => {
  it('is 0% on a job nobody has started', () => {
    const rows = [row({ id: 'a', ord: 1 }), row({ id: 'b', ord: 2 })]
    expect(checklistProgress(rows)).toEqual({ done: 0, total: 2, pct: 0 })
  })

  it('rounds the way the progress ring reads it', () => {
    const rows = Array.from({ length: 26 }, (_, i) => row({ id: 'k' + i, ord: i + 1, completed: i < 13 }))
    expect(checklistProgress(rows)).toEqual({ done: 13, total: 26, pct: 50 })
  })

  it('is 100% only when every step is ticked', () => {
    const rows = Array.from({ length: 3 }, (_, i) => row({ id: 'k' + i, ord: i + 1, completed: true }))
    expect(checklistProgress(rows).pct).toBe(100)
  })

  it('never divides by zero on a job with no checklist yet', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, pct: 0 })
  })
})
