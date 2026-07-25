import { describe, it, expect, afterEach, vi } from 'vitest'
import { isSupabaseConfigured, isSquareConfigured, squareSdkSrc } from './config'
import { normalizePhone } from './supabase'
import { _mappers } from './data'
import { ApiError } from './api'
import { parseTip, errMsg } from '../app/backend'

// Under Vitest, config.env() reads process.env (not import.meta.env), and
// vite.config's test.env blanks the VITE_* vars — so a developer's real
// .env.local can't leak in. Value tests set their own via vi.stubEnv.
afterEach(() => vi.unstubAllEnvs())

describe('config detection — the demo/live switch', () => {
  it('Supabase is OFF with no env (the sandbox stays on seed data)', () => {
    expect(isSupabaseConfigured()).toBe(false)
  })
  it('Supabase is ON only when BOTH url and anon key are present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
    expect(isSupabaseConfigured()).toBe(false) // anon key still missing
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    expect(isSupabaseConfigured()).toBe(true)
  })
  it('Square is ON only when app id AND location id are present', () => {
    vi.stubEnv('VITE_SQUARE_APP_ID', 'sandbox-sq0idb-x')
    expect(isSquareConfigured()).toBe(false)
    vi.stubEnv('VITE_SQUARE_LOCATION_ID', 'LOC1')
    expect(isSquareConfigured()).toBe(true)
  })
  it('picks the sandbox vs production Square SDK host by app-id prefix', () => {
    vi.stubEnv('VITE_SQUARE_APP_ID', 'sandbox-sq0idb-x')
    expect(squareSdkSrc()).toContain('sandbox.web.squarecdn.com')
    vi.stubEnv('VITE_SQUARE_APP_ID', 'sq0idp-live')
    expect(squareSdkSrc()).toBe('https://web.squarecdn.com/v1/square.js')
  })
})

describe('normalizePhone → E.164', () => {
  it('formats a 10-digit US number', () => expect(normalizePhone('(404) 555-0134')).toBe('+14045550134'))
  it('keeps an existing +country prefix', () => expect(normalizePhone('+447911123456')).toBe('+447911123456'))
  it('handles a leading 1', () => expect(normalizePhone('1 404 555 0134')).toBe('+14045550134'))
})

describe('parseTip — label → dollars', () => {
  it('returns undefined for no tip', () => {
    expect(parseTip('No tip', 220)).toBeUndefined()
    expect(parseTip(undefined, 220)).toBeUndefined()
  })
  it('reads a dollar tip', () => expect(parseTip('$20', 220)).toBe(20))
  it('computes a percentage tip off the base', () => expect(parseTip('20%', 220)).toBe(44))
})

describe('row mappers — snake_case PostgREST → camelCase domain', () => {
  it('maps a job, coercing numeric amount and dropping null cleaner', () => {
    const job = _mappers.mapJob({
      id: 'j1', property_id: 'p1', owner_id: 'o1', cleaner_id: null,
      type: 'turnover', status: 'scheduled', payment_state: 'scheduled',
      client_amount: '220.00', eco_finish: true, window_start: 't0',
    })
    expect(job).toMatchObject({ id: 'j1', propertyId: 'p1', ownerId: 'o1', clientAmount: 220, ecoFinish: true })
    expect(job.cleanerId).toBeUndefined()
  })
  it('maps a property with geofence default and array photos', () => {
    const prop = _mappers.mapProperty({
      id: 'p1', org_id: 'g1', owner_id: 'o1', name: 'Loft', type: 'airbnb',
      lat: '33.7', lng: '-84.3', reference_photos: ['a', 'b'],
      product_preference: 'eco_non_toxic', signature_scent: 'citrus',
      base_edition: 'vacation_rental', geofence_radius_m: null,
    })
    expect(prop).toMatchObject({ orgId: 'g1', ownerId: 'o1', lat: 33.7, lng: -84.3, geofenceRadiusM: 150 })
    expect(prop.referencePhotos).toEqual(['a', 'b'])
  })
  it('maps a payment method to the client-safe shape (no consent/token leak)', () => {
    const pm = _mappers.mapPaymentMethod({
      id: 'pm1', brand: 'VISA', last4: '4242', card_type: 'CREDIT',
      processor_token: 'SECRET', consent_text: 'x',
    })
    expect(pm).toEqual({ id: 'pm1', brand: 'VISA', last4: '4242', cardType: 'CREDIT' })
    expect((pm as any).processor_token).toBeUndefined()
  })
})

describe('ApiError carries the server code', () => {
  it('exposes message, status, and code', () => {
    const e = new ApiError('That card is not a credit card', 422, 'CARD_REJECTED')
    expect(e.message).toBe('That card is not a credit card')
    expect(e.status).toBe(422)
    expect(e.code).toBe('CARD_REJECTED')
    expect(errMsg(e)).toBe('That card is not a credit card')
  })
})
