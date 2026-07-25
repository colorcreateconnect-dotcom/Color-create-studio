import { describe, it, expect } from 'vitest'
import {
  CONCIERGE_RATE, roundToIncrement, conciergeTimeCharge, conciergeVisitTotal,
  applyExtension, captureAmountFromLineItems, estimateResetHours, SERVICE_LINES,
} from './concierge'
import { assertClientSafe, stripForClient } from './privacy'
import { residentialQuote } from './pricing'
import { InstacartDeepLink } from './grocery'
import { canTransition } from './payments/state'

describe('Concierge money model', () => {
  it('is openly $70/hr, billed in 15-min increments', () => {
    expect(CONCIERGE_RATE).toBe(70)
    expect(roundToIncrement(70)).toBe(75)
    expect(roundToIncrement(7)).toBe(0)
    expect(conciergeTimeCharge(75)).toBe(87.5) // 1h15m
    expect(conciergeTimeCharge(120)).toBe(140)
  })

  it('splits time from pass-through and charges no markup on goods', () => {
    const t = conciergeVisitTotal({ minutes: 120, reimbursables: [
      { label: 'Groceries', amount: 42.5, hasReceipt: true },
      { label: 'Linens', amount: 60, hasReceipt: true },
    ] })
    expect(t.timeCharge).toBe(140)
    expect(t.reimbursed).toBe(102.5)
    expect(t.markup).toBe(0)
    expect(t.total).toBe(242.5)
  })

  it('refuses a reimbursable with no receipt (server rule)', () => {
    expect(() => conciergeVisitTotal({ minutes: 60, reimbursables: [{ label: 'Coffee', amount: 12, hasReceipt: false }] }))
      .toThrow(/no receipt/i)
  })

  it('owner can extend live time but NEVER reduce it', () => {
    expect(applyExtension(60, 30, 'owner')).toBe(90)
    expect(applyExtension(60, 15, 'owner')).toBe(75)
    expect(() => applyExtension(60, -15, 'owner')).toThrow(/only be extended/i)
    expect(applyExtension(60, -15, 'cleaner')).toBe(45) // cleaner correction allowed
  })

  it('capture = sum of non-tip line items; reimbursables need a receipt id', () => {
    expect(captureAmountFromLineItems([
      { kind: 'concierge_time', label: 'time', amount: 87.5 },
      { kind: 'reimbursable', label: 'groceries', amount: 42, receiptPhotoId: 'p1' },
      { kind: 'tip', label: 'tip', amount: 20 },
    ])).toBe(129.5)
    expect(() => captureAmountFromLineItems([{ kind: 'reimbursable', label: 'x', amount: 5 }])).toThrow(/receipt photo/i)
  })

  it('concierge capture-at-close is a legal payment transition', () => {
    expect(canTransition('captured', 'settled')).toBe(true)
    // cleaning still cannot skip its releases
    expect(canTransition('scheduled', 'deposit_released')).toBe(false)
  })

  it('reset/organization is slower per sq ft than cleaning', () => {
    expect(estimateResetHours(2000)).toBe(6.5) // vs cleaning ~4.5h for the same
    expect(estimateResetHours(2000)).toBeGreaterThan(residentialQuote(4.5).hours)
    expect(estimateResetHours(300)).toBe(2) // floor
  })

  it('models the whole catalogue as service lines incl. coaching', () => {
    const keys = SERVICE_LINES.map((s) => s.key)
    expect(keys).toContain('concierge')
    expect(keys).toContain('co_hosting')
    expect(keys).toContain('coaching')
    expect(keys).toContain('reset_organization')
    expect(SERVICE_LINES.find((s) => s.key === 'concierge')!.pricing).toBe('hourly')
  })
})

describe('Price privacy — concierge nuance', () => {
  it('lets the published concierge hourly rate + billed time through', () => {
    const conciergeReceipt = {
      visit: 'concierge', conciergeRate: 70, billedMinutes: 120, timeCharge: 140,
      reimbursedAmount: 42.5, clientAmount: 182.5,
    }
    expect(() => assertClientSafe(conciergeReceipt)).not.toThrow()
    expect((stripForClient(conciergeReceipt) as any).conciergeRate).toBe(70)
  })
  it('still strips the CLEANING derivation', () => {
    const cleaningInternal = { clientAmount: 170, rate: 50, hours: 3, base: 150 }
    expect(() => assertClientSafe(cleaningInternal)).toThrow(/leak/)
  })
})

describe('Grocery handoff (no Instacart partnership)', () => {
  it('builds a standard deep-link, ignoring zero-qty items', () => {
    const h = new InstacartDeepLink().buildHandoff([
      { name: 'Paper towels', brand: 'Bounty', quantity: 2 },
      { name: 'Trash bags', quantity: 0 },
    ])
    expect(h.provider).toBe('Instacart')
    expect(h.itemCount).toBe(1)
    expect(h.url).toContain('instacart.com')
    expect(h.url).toContain('Bounty')
  })
})
