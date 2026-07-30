/* Starting your own book.
 *
 * An independent contractor is not Ahleyia's employee and not her client. The
 * two rules that decide what happens when they sign up are here: who is allowed
 * to open a studio at all, and what it ends up called. */
import { describe, it, expect } from 'vitest'
import { mayStartOwnStudio, type Caller } from '../../netlify/functions/_shared/auth'
import { studioNameFor, MAX_STUDIO_NAME } from '../../netlify/functions/_shared/studio'

const fresh: Caller = { id: 'u1', role: 'owner', orgId: null }
const herCleaner: Caller = { id: 'u2', role: 'cleaner', orgId: 'org-1' }
const herClient: Caller = { id: 'u3', role: 'owner', orgId: 'org-1' }
const sheHerself: Caller = { id: 'u4', role: 'org_admin', orgId: 'org-1' }

describe('mayStartOwnStudio', () => {
  it('lets someone who belongs to no studio open one', () => {
    // Every signup lands here: role owner, no org (migration 0011).
    expect(mayStartOwnStudio(fresh)).toBe(true)
  })

  it('refuses a cleaner she already hired', () => {
    // Walking out this way would strand the jobs she assigned them.
    expect(mayStartOwnStudio(herCleaner)).toBe(false)
  })

  it('refuses a client who is already in her book', () => {
    expect(mayStartOwnStudio(herClient)).toBe(false)
  })

  it('refuses someone who already runs a studio — no second one', () => {
    expect(mayStartOwnStudio(sheHerself)).toBe(false)
  })

  it('refuses nobody at all', () => {
    expect(mayStartOwnStudio(null)).toBe(false)
  })
})

describe('studioNameFor', () => {
  it('uses the name they typed', () => {
    expect(studioNameFor('Hale & Co. Housekeeping', 'Marcus Hale')).toBe('Hale & Co. Housekeeping')
  })

  it('falls back to their own name, which is what most people leave it as', () => {
    expect(studioNameFor('', 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
    expect(studioNameFor(undefined, 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
  })

  it('never produces a blank or an "Untitled"', () => {
    expect(studioNameFor('', '')).toBe('My housekeeping')
    expect(studioNameFor(null, null)).toBe('My housekeeping')
    expect(studioNameFor('   ', '   ')).toBe('My housekeeping')
  })

  it('treats whitespace-only input as not typed', () => {
    expect(studioNameFor('   ', 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
    expect(studioNameFor('\n\t', 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
  })

  it('collapses runs of whitespace rather than storing them', () => {
    expect(studioNameFor('Hale    &   Co.', '')).toBe('Hale & Co.')
  })

  it('caps the length, and never leaves a trailing space behind the cut', () => {
    const long = 'A'.repeat(200)
    expect(studioNameFor(long, '').length).toBe(MAX_STUDIO_NAME)
    const cutMidSpace = 'B'.repeat(MAX_STUDIO_NAME - 1) + '   tail'
    expect(studioNameFor(cutMidSpace, '')).toBe('B'.repeat(MAX_STUDIO_NAME - 1))
  })

  it('does not mistake a number or an object for a name', () => {
    expect(studioNameFor(0, 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
    expect(studioNameFor(false, 'Marcus Hale')).toBe('Marcus Hale’s housekeeping')
  })
})
