/* Which views an account may look at.
 *
 * The app has four: the business side, a working day, a client's account, and
 * the signed-out public storefront. With no backend configured they are all
 * reachable — that build IS the design review, and switching between them on
 * seed data is the point.
 *
 * On a live deployment they are not interchangeable. What you see is decided by
 * who you are signed in as and nothing else: no role query parameter, no view
 * switcher offering someone else's account. The single exception is real rather
 * than a convenience — Ahleyia is both the business and the housekeeper, so an
 * org_admin genuinely has two views of one account, and only those two.
 *
 * Kept out of the store because it is the rule worth testing on its own. */

export type ViewKey = 'admin' | 'cleaner' | 'owner' | 'visitor'

export interface Viewer {
  /** Is a backend configured? (i.e. this is a real deployment, not the demo.) */
  liveApp: boolean
  signedIn: boolean
  /** The role on the signed-in account, from the database. */
  role?: 'org_admin' | 'cleaner' | 'owner' | null
}

const EVERY: ViewKey[] = ['admin', 'cleaner', 'owner', 'visitor']

export function viewsFor(v: Viewer): ViewKey[] {
  if (!v.liveApp) return EVERY.slice()
  if (!v.signedIn) return ['visitor']
  switch (v.role) {
    case 'org_admin': return ['admin', 'cleaner']
    case 'cleaner': return ['cleaner']
    case 'owner': return ['owner']
    // A signed-in account with no role yet (a self-signup that hasn't been
    // connected to the studio) gets the public view, not a guess.
    default: return ['visitor']
  }
}

/** Is there anything to switch between? Drives whether the account button is a
 *  chooser or just a profile. */
export function canSwitchViews(v: Viewer): boolean {
  return viewsFor(v).length > 1
}

/** May this account reach the studio's own side — billing, the client book,
 *  hiring, pricing? */
export function mayRunBusiness(v: Viewer): boolean {
  return viewsFor(v).indexOf('admin') >= 0
}
