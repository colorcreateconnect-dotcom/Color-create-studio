import { describe, it, expect } from 'vitest'
import { airbnbQuote, tierForBeds, residentialQuote, assistantSplit, requiresSecondLinenSet, ECO_FINISH_PRICE } from './pricing'
import { haversineMeters, evaluateGeofence, DEFAULT_GEOFENCE_RADIUS_M } from './geofence'
import { canTransition, transition, IllegalPaymentTransition, releaseAmounts, shouldAutoRelease } from './payments/state'
import { evaluateCard } from './payments/cards'
import { stripForClient, assertClientSafe } from './privacy'
import { makeConsent, consentIsValid, CONSENT_VERSION } from './consent'

describe('Airbnb pricing tiers', () => {
  it('maps bedroom counts to the right tier', () => {
    expect(tierForBeds(0).key).toBe('studio_1')
    expect(tierForBeds(1).key).toBe('studio_1')
    expect(tierForBeds(2).key).toBe('br2')
    expect(tierForBeds(3).key).toBe('br3')
    expect(tierForBeds(6).key).toBe('br4')
  })

  it('2BR staging Light/Standard/Heavy = 125/142/160 (ships verbatim)', () => {
    expect(airbnbQuote(2, 'light').clientNumber).toBe(125)
    expect(airbnbQuote(2, 'standard').clientNumber).toBe(142)
    expect(airbnbQuote(2, 'heavy').clientNumber).toBe(160)
  })

  it('defaults to Standard (mid) and labels ranges correctly', () => {
    expect(airbnbQuote(2).clientNumber).toBe(142)
    expect(airbnbQuote(2).rangeLabel).toBe('$125–160')
    expect(airbnbQuote(3).rangeLabel).toBe('$160–185')
    expect(airbnbQuote(5).rangeLabel).toBe('from $185')
    expect(airbnbQuote(5, 'heavy').clientNumber).toBe(185) // open tier
  })

  it('same-day turnover needs a second linen set', () => {
    expect(requiresSecondLinenSet(true)).toBe(true)
    expect(requiresSecondLinenSet(false)).toBe(false)
  })
})

describe('Residential comfort round-up', () => {
  it('3h × $50 = 150 → $170 (spec example)', () => {
    const q = residentialQuote(3)
    expect(q.base).toBe(150)
    expect(q.final).toBe(170)
    expect(q.clientNumber).toBe(170)
  })

  it('never suggests below hours × rate, applies +$10 minimum', () => {
    const q = residentialQuote(1) // base 50 → 1.12×=56 → round5=55, but +10 min = 60
    expect(q.final).toBe(60)
    expect(q.final).toBeGreaterThanOrEqual(q.base + 10)
  })

  it('deep clean uses $65/hr', () => {
    expect(residentialQuote(4, { deep: true }).base).toBe(260)
  })

  it('assistant split = max(40%, $50 floor)', () => {
    // final for 4h standard: base 200 → 224 → round5 225
    const q = residentialQuote(4, { assistant: true })
    expect(q.final).toBe(225)
    expect(q.assistant!.pay).toBe(90) // 40% of 225 = 90
    expect(q.assistant!.businessKeeps).toBe(135)
    // small job hits the $50 floor
    expect(assistantSplit(100).pay).toBe(50)
    expect(assistantSplit(200).pay).toBe(80)
  })

  it('eco finish is a transparent +$8', () => {
    expect(ECO_FINISH_PRICE).toBe(8)
  })
})

describe('Geofence', () => {
  const property = { lat: 33.8484, lng: -84.3781 } // ~Buckhead
  it('haversine ~0 for identical points, grows with distance', () => {
    expect(haversineMeters(property, property)).toBeCloseTo(0, 5)
    const oneKm = haversineMeters(property, { lat: 33.8574, lng: -84.3781 })
    expect(oneKm).toBeGreaterThan(900)
    expect(oneKm).toBeLessThan(1100)
  })

  it('permits check-in inside the fence, rejects outside', () => {
    const near = { lat: 33.8485, lng: -84.3782, accuracy: 10 }
    const far = { lat: 33.8600, lng: -84.3900, accuracy: 10 }
    expect(evaluateGeofence(property, near).withinFence).toBe(true)
    expect(evaluateGeofence(property, far).withinFence).toBe(false)
  })

  it('rejects wildly imprecise readings even if nominally close', () => {
    const imprecise = { lat: 33.8484, lng: -84.3781, accuracy: DEFAULT_GEOFENCE_RADIUS_M * 3 }
    expect(evaluateGeofence(property, imprecise).withinFence).toBe(false)
  })
})

describe('Payment state machine', () => {
  it('captures once then releases in two milestones', () => {
    let s = transition('scheduled', 'captured')
    s = transition(s, 'deposit_released')
    s = transition(s, 'awaiting_approval')
    s = transition(s, 'approved')
    s = transition(s, 'final_released')
    s = transition(s, 'settled')
    expect(s).toBe('settled')
  })

  it('forbids releasing before capture (no double/loose charges)', () => {
    expect(canTransition('scheduled', 'deposit_released')).toBe(false)
    expect(() => transition('scheduled', 'final_released')).toThrow(IllegalPaymentTransition)
  })

  it('capture_failed holds the job before the clean proceeds, allows retry', () => {
    expect(canTransition('scheduled', 'capture_failed')).toBe(true)
    expect(canTransition('capture_failed', 'captured')).toBe(true)
    expect(canTransition('capture_failed', 'deposit_released')).toBe(false)
  })

  it('splits a captured amount into two equal releases', () => {
    expect(releaseAmounts(220)).toEqual({ arrival: 110, final: 110 })
    expect(releaseAmounts(225)).toEqual({ arrival: 112.5, final: 112.5 })
  })

  it('auto-releases at 48h unless a dispute is open', () => {
    const submitted = 1_000_000
    const h = 3600_000
    expect(shouldAutoRelease(submitted, submitted + 47 * h, false)).toBe(false)
    expect(shouldAutoRelease(submitted, submitted + 48 * h, false)).toBe(true)
    expect(shouldAutoRelease(submitted, submitted + 72 * h, true)).toBe(false) // dispute pauses it
  })
})

describe('Card acceptance (CREDIT only)', () => {
  it('accepts a major credit card', () => {
    expect(evaluateCard({ brand: 'VISA', last4: '4242', cardType: 'CREDIT' }).accepted).toBe(true)
  })
  it('rejects debit, prepaid and unknown', () => {
    expect(evaluateCard({ brand: 'VISA', last4: '0000', cardType: 'DEBIT' }).accepted).toBe(false)
    expect(evaluateCard({ brand: 'VISA', last4: '0000', cardType: 'CREDIT', prepaidType: 'PREPAID' }).accepted).toBe(false)
    expect(evaluateCard({ brand: 'VISA', last4: '0000', cardType: 'UNKNOWN' }).accepted).toBe(false)
  })
  it('rejects unsupported brands', () => {
    expect(evaluateCard({ brand: 'JCB', last4: '0000', cardType: 'CREDIT' }).accepted).toBe(false)
  })
})

describe('Price privacy', () => {
  const internalQuote = {
    id: 'q1', clientNumber: 170, rate: 50, hours: 3, base: 150,
    assistant: { pay: 68, businessKeeps: 102 }, durationMinutes: 185,
    property: { name: 'Ridgeview', beds: 4, timeGuide: '3–4h' },
  }
  it('strips every private field, keeps the client number', () => {
    const clean = stripForClient(internalQuote) as any
    expect(clean.clientNumber).toBe(170)
    expect(clean.rate).toBeUndefined()
    expect(clean.hours).toBeUndefined()
    expect(clean.base).toBeUndefined()
    expect(clean.assistant).toBeUndefined()
    expect(clean.durationMinutes).toBeUndefined()
    expect(clean.property.timeGuide).toBeUndefined()
    expect(clean.property.name).toBe('Ridgeview')
  })
  it('assertClientSafe throws on a leak, passes on clean output', () => {
    expect(() => assertClientSafe(internalQuote)).toThrow(/leak/)
    expect(() => assertClientSafe(stripForClient(internalQuote))).not.toThrow()
  })
})

describe('Consent', () => {
  it('records versioned, timestamped authorization', () => {
    const c = makeConsent('2026-07-25T15:00:00.000Z')
    expect(c.version).toBe(CONSENT_VERSION)
    expect(c.text).toContain('full service amount on arrival')
    expect(c.text).toContain('48 hours')
    expect(c.text).toContain('Tips are charged separately')
    expect(consentIsValid(c)).toBe(true)
    expect(consentIsValid(null)).toBe(false)
    expect(consentIsValid({ ...c, agreed: false })).toBe(false)
  })
})
