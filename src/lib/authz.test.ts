/* Authorization rules for the privileged Netlify Functions.
 *
 * These functions run with the SERVICE-ROLE key, which bypasses Row-Level
 * Security — so the rule enforced in code IS the only thing standing between a
 * request and someone else's money. They are asserted here directly. */
import { describe, it, expect } from 'vitest'
import { canActOnJob, isStaff, isOwnerOfBusiness, type Caller } from '../../netlify/functions/_shared/auth'

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

describe('isOwnerOfBusiness — hiring, the client book and pricing', () => {
  it('is the org admin, and only the org admin', () => {
    expect(isOwnerOfBusiness(admin)).toBe(true)
    expect(isOwnerOfBusiness(cleaner)).toBe(false)
    expect(isOwnerOfBusiness(owner)).toBe(false)
    expect(isOwnerOfBusiness(null)).toBe(false)
  })

  it('DENIES a cleaner she hired — they get a working day, not the studio', () => {
    // The app hides the Business menu from a cleaner; this is the same rule
    // where it counts, so hiding the button is not the only thing stopping it.
    expect(isOwnerOfBusiness(otherCleaner)).toBe(false)
  })

  it('DENIES an admin with no organization', () => {
    expect(isOwnerOfBusiness({ id: 'a', role: 'org_admin', orgId: null })).toBe(false)
  })

  it('does not weaken isStaff — a cleaner still works jobs', () => {
    expect(isStaff(cleaner)).toBe(true)
    expect(canActOnJob(cleaner, job)).toBe(true)
  })
})

describe('contractor books — who may book which home', () => {
  const ORG = 'org-1'
  // The rule as book-clean applies it, asserted directly so the three ways in
  // stay three. A contractor booking against somebody else's client would be
  // booking against somebody else's price and arrangement.
  const mayBook = (
    c: { id: string; role: string; orgId: string | null } | null,
    prop: { org_id: string; owner_id: string; managed_by: string | null },
  ) => {
    if (!c) return false
    const ownsIt = c.id === prop.owner_id
    const adminHere = c.role === 'org_admin' && !!c.orgId && c.orgId === prop.org_id
    const managesIt = (c.role === 'cleaner' || c.role === 'org_admin') && prop.managed_by === c.id
    return ownsIt || adminHere || managesIt
  }

  const admin = { id: 'ahleyia', role: 'org_admin', orgId: ORG }
  const tiana = { id: 'tiana', role: 'cleaner', orgId: ORG }
  const marcus = { id: 'marcus', role: 'cleaner', orgId: ORG }
  const client = { id: 'client-1', role: 'owner', orgId: ORG }

  const studioHome = { org_id: ORG, owner_id: 'client-1', managed_by: null }
  const tianaHome = { org_id: ORG, owner_id: 'client-2', managed_by: 'tiana' }

  it('a client books their own home', () => {
    expect(mayBook(client, studioHome)).toBe(true)
  })

  it('the studio owner books anything in her organization', () => {
    expect(mayBook(admin, studioHome)).toBe(true)
    expect(mayBook(admin, tianaHome)).toBe(true)
  })

  it('a contractor books a home in their own book', () => {
    expect(mayBook(tiana, tianaHome)).toBe(true)
  })

  it('DENIES a contractor booking the studio’s client', () => {
    expect(mayBook(tiana, studioHome)).toBe(false)
  })

  it('DENIES a contractor booking another contractor’s client', () => {
    expect(mayBook(marcus, tianaHome)).toBe(false)
  })

  it('DENIES a client booking somebody else’s home', () => {
    expect(mayBook(client, tianaHome)).toBe(false)
  })

  it('DENIES an admin from a different organization', () => {
    expect(mayBook({ id: 'x', role: 'org_admin', orgId: 'org-2' }, studioHome)).toBe(false)
  })
})
