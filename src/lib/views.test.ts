/* Views are not interchangeable on a live deployment.
 *
 * The switcher was built for the design review, where hopping between the
 * business, a working day, a client and the public storefront on seed data is
 * the whole point. On a real deployment that same control would let a cleaner
 * open the studio's books and a client open someone's working day, so the rule
 * is asserted here rather than left to whichever screen happens to render. */
import { describe, it, expect } from 'vitest'
import { viewsFor, canSwitchViews, mayRunBusiness } from './views'

const live = (role: any, signedIn = true) => ({ liveApp: true, signedIn, role })
const demo = { liveApp: false, signedIn: false, role: null }

describe('viewsFor — on a live deployment', () => {
  it('gives a cleaner exactly one view: their own working day', () => {
    expect(viewsFor(live('cleaner'))).toEqual(['cleaner'])
  })

  it('gives a client exactly one view: their own account', () => {
    expect(viewsFor(live('owner'))).toEqual(['owner'])
  })

  it('gives the owner her two real views, and nothing else', () => {
    // She is the business AND the housekeeper — that is one account with two
    // sides, not a switch into somebody else's.
    expect(viewsFor(live('org_admin'))).toEqual(['admin', 'cleaner'])
  })

  it('never offers a client account to anyone but that client', () => {
    expect(viewsFor(live('cleaner'))).not.toContain('owner')
    expect(viewsFor(live('org_admin'))).not.toContain('owner')
  })

  it('never offers the business side to a cleaner or a client', () => {
    expect(viewsFor(live('cleaner'))).not.toContain('admin')
    expect(viewsFor(live('owner'))).not.toContain('admin')
  })

  it('gives someone signed out only the public storefront', () => {
    expect(viewsFor(live(null, false))).toEqual(['visitor'])
    expect(viewsFor(live('org_admin', false))).toEqual(['visitor'])
  })

  it('gives an account with no role yet the public view, not a guess', () => {
    // A self-signup that the studio has not connected to anything.
    expect(viewsFor(live(null))).toEqual(['visitor'])
    expect(viewsFor(live(undefined))).toEqual(['visitor'])
    expect(viewsFor(live('something_else'))).toEqual(['visitor'])
  })
})

describe('viewsFor — with no backend (the design review build)', () => {
  it('offers all four, because switching on seed data is the point', () => {
    expect(viewsFor(demo).sort()).toEqual(['admin', 'cleaner', 'owner', 'visitor'])
  })

  it('does not depend on a signed-in role there', () => {
    expect(viewsFor({ liveApp: false, signedIn: true, role: 'cleaner' }).sort())
      .toEqual(['admin', 'cleaner', 'owner', 'visitor'])
  })

  it('returns a fresh array each time, so a caller cannot mutate the rule', () => {
    const a = viewsFor(demo)
    a.pop()
    expect(viewsFor(demo)).toHaveLength(4)
  })
})

describe('canSwitchViews', () => {
  it('is true only for the owner on a live deployment', () => {
    expect(canSwitchViews(live('org_admin'))).toBe(true)
    expect(canSwitchViews(live('cleaner'))).toBe(false)
    expect(canSwitchViews(live('owner'))).toBe(false)
    expect(canSwitchViews(live(null, false))).toBe(false)
  })

  it('is true in the design review build', () => {
    expect(canSwitchViews(demo)).toBe(true)
  })
})

describe('mayRunBusiness', () => {
  it('is the org admin, and nobody else who is signed in', () => {
    expect(mayRunBusiness(live('org_admin'))).toBe(true)
    expect(mayRunBusiness(live('cleaner'))).toBe(false)
    expect(mayRunBusiness(live('owner'))).toBe(false)
  })

  it('is false for someone signed out, whatever their role would be', () => {
    expect(mayRunBusiness(live('org_admin', false))).toBe(false)
  })

  it('agrees with the switcher — the menu and the screens read one rule', () => {
    for (const role of ['org_admin', 'cleaner', 'owner', null] as const) {
      const viewer = live(role)
      expect(mayRunBusiness(viewer)).toBe(viewsFor(viewer).includes('admin'))
    }
  })
})
