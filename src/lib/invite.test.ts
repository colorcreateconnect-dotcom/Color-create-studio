/* Invitation rules. The link Ahleyia sends is the only credential standing
 * between a stranger and a client's account, so the token handling and the
 * validity rules are asserted directly. */
import { describe, it, expect } from 'vitest'
import {
  newToken, hashToken, inviteState, expiryFromNow, INVITE_TTL_DAYS,
  passwordProblem, emailLooksValid,
} from '../../netlify/functions/_shared/invite'

describe('invitation tokens', () => {
  it('are long, url-safe and unique per call', () => {
    const a = newToken(), b = newToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/) // safe in a URL without escaping
  })

  it('are stored only as a hash — the token itself never appears in the hash', () => {
    const t = newToken()
    const h = hashToken(t)
    expect(h).toMatch(/^[a-f0-9]{64}$/)
    expect(h).not.toContain(t)
    expect(hashToken(t)).toBe(h)          // stable, so lookups work
    expect(hashToken(newToken())).not.toBe(h)
  })

  it('expire in the future by default', () => {
    const ms = new Date(expiryFromNow()).getTime() - Date.now()
    const days = ms / 86_400_000
    expect(days).toBeGreaterThan(INVITE_TTL_DAYS - 0.01)
    expect(days).toBeLessThan(INVITE_TTL_DAYS + 0.01)
  })
})

describe('inviteState — when a link may be used', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString()
  const past = new Date(Date.now() - 86_400_000).toISOString()

  it('accepts a fresh, unclaimed link', () => {
    expect(inviteState({ expires_at: future })).toBe('valid')
  })
  it('rejects a link that does not exist', () => {
    expect(inviteState(null)).toBe('not_found')
    expect(inviteState(undefined)).toBe('not_found')
  })
  it('rejects a link that was already used — single use', () => {
    expect(inviteState({ expires_at: future, claimed_at: past })).toBe('claimed')
  })
  it('rejects a link she cancelled', () => {
    expect(inviteState({ expires_at: future, revoked_at: past })).toBe('revoked')
  })
  it('rejects an expired link', () => {
    expect(inviteState({ expires_at: past })).toBe('expired')
  })
  it('treats the exact expiry moment as expired, not valid', () => {
    const now = new Date('2026-07-25T12:00:00Z')
    expect(inviteState({ expires_at: now.toISOString() }, now)).toBe('expired')
  })
  it('prefers the strongest reason: revoked beats claimed beats expired', () => {
    expect(inviteState({ expires_at: past, claimed_at: past, revoked_at: past })).toBe('revoked')
    expect(inviteState({ expires_at: past, claimed_at: past })).toBe('claimed')
  })
})

describe('what the client must supply', () => {
  it('requires a real-looking email', () => {
    expect(emailLooksValid('someone@example.com')).toBe(true)
    expect(emailLooksValid('nope')).toBe(false)
    expect(emailLooksValid('no@domain')).toBe(false)
    expect(emailLooksValid('')).toBe(false)
  })

  it('requires a password of at least 8 chars with letters and a number', () => {
    expect(passwordProblem('Password1234')).toBeNull()
    expect(passwordProblem('short1')).toMatch(/8 characters/)
    expect(passwordProblem('alllettershere')).toMatch(/number/)
    expect(passwordProblem('12345678')).toMatch(/letters/)
    expect(passwordProblem('')).toMatch(/8 characters/)
  })
})
