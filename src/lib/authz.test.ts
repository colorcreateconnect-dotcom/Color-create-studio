/* Authorization rules for the privileged Netlify Functions.
 *
 * These functions run with the SERVICE-ROLE key, which bypasses Row-Level
 * Security — so the rule enforced in code IS the only thing standing between a
 * request and someone else's money. They are asserted here directly. */
import { describe, it, expect } from 'vitest'
import { canActOnJob, isStaff, type Caller } from '../../netlify/functions/_shared/auth'

const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const owner: Caller = { id: 'owner-1', role: 'owner', orgId: ORG }
const otherOwner: Caller = { id: 'owner-2', role: 'owner', orgId: ORG }
const cleaner: Caller = { id: 'cleaner-1', role: 'cleaner', orgId: ORG }
const otherCleaner: Caller = { id: 'cleaner-2', role: 'cleaner', orgId: ORG }
const admin: Caller = { id: 'admin-1', role: 'org_admin', orgId: ORG }
const foreignAdmin: Caller = { id: 'admin-9', role: 'org_admin', orgId: OTHER_ORG }

const job = { owner_id: 'owner-1', cleaner_id: 'cleaner-1', org_id: ORG }

describe('isStaff', () => {
  it('counts cleaners and org admins as staff, never clients', () => {
    expect(isStaff(cleaner)).toBe(true)
    expect(isStaff(admin)).toBe(true)
    expect(isStaff(owner)).toBe(false)
    expect(isStaff(null)).toBe(false)
  })
})

describe('canActOnJob', () => {
  it('allows the job’s own owner, its assigned cleaner, and staff in the same org', () => {
    expect(canActOnJob(owner, job)).toBe(true)
    expect(canActOnJob(cleaner, job)).toBe(true)
    expect(canActOnJob(admin, job)).toBe(true)
  })

  it('DENIES a different client — the core isolation guarantee', () => {
    expect(canActOnJob(otherOwner, job)).toBe(false)
  })

  it('DENIES staff from another organization', () => {
    expect(canActOnJob(foreignAdmin, job)).toBe(false)
  })

  it('allows another cleaner only via their org staff role, not job assignment', () => {
    // otherCleaner is staff in the same org, so support access is intended…
    expect(canActOnJob(otherCleaner, job)).toBe(true)
    // …but a cleaner with no org cannot reach a job they aren't assigned to.
    const orphan: Caller = { id: 'cleaner-3', role: 'cleaner', orgId: null }
    expect(canActOnJob(orphan, job)).toBe(false)
  })

  it('does not treat a null cleaner_id as a match for a caller with no id match', () => {
    const unassigned = { owner_id: 'owner-1', cleaner_id: null, org_id: ORG }
    expect(canActOnJob(otherOwner, unassigned)).toBe(false)
  })
})
