/* Caller authentication for the privileged functions.
 *
 * These functions hold the SERVICE-ROLE key, which bypasses Row-Level Security
 * entirely. Without verifying who is calling, a bare `jobId` in a request body
 * would be enough for anyone to trigger a card capture or release funds. So
 * every money-moving or record-creating endpoint must establish the caller's
 * identity here first, then authorize the specific action.
 *
 * The browser sends its Supabase access token (the same JWT the anon-key reads
 * carry). We verify it with GoTrue — a forged token fails there — and then load
 * the caller's app row (role + org) with the service key. */
import { sbSelect, json, configErrorResponse } from './db'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './runtime-config'

const URL = SUPABASE_URL
const SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = SUPABASE_ANON_KEY || SERVICE_KEY

export interface Caller {
  id: string
  role: 'owner' | 'cleaner' | 'org_admin'
  orgId: string | null
  email?: string
  phone?: string
}

/** Bearer token from the request, or null. */
export function bearer(event: any): string | null {
  const h = event?.headers || {}
  const raw = h.authorization || h.Authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(raw)
  return m ? m[1].trim() : null
}

/** Verify the caller's JWT with GoTrue and load their app user row.
 *  Returns null when the token is missing, invalid, expired, or has no app row. */
export async function getCaller(event: any): Promise<Caller | null> {
  const token = bearer(event)
  if (!token || !URL) return null
  let authUser: any
  try {
    const res = await fetch(`${URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    authUser = await res.json()
  } catch { return null }
  if (!authUser?.id) return null

  const [row] = await sbSelect('users', `id=eq.${authUser.id}&select=id,role,org_id,email,phone`)
  if (!row) return null
  return { id: row.id, role: row.role, orgId: row.org_id ?? null, email: row.email, phone: row.phone }
}

export const isStaff = (c: Caller | null) => !!c && (c.role === 'cleaner' || c.role === 'org_admin')

/** The business owner. Hiring, the client book and pricing are hers, not any
 *  cleaner's — a cleaner she takes on gets a working day, not the studio. The
 *  app's menu hides those destinations from a cleaner; this is the same rule
 *  enforced where it counts. */
export const isOwnerOfBusiness = (c: Caller | null) => !!c && c.role === 'org_admin' && !!c.orgId

/** May this account start a studio of its own?
 *
 *  Only someone who is in none. An independent contractor signing up is an
 *  `owner` with no org (the signup trigger allows nothing else — see migration
 *  0011), and promoting them creates a new organization. Anyone already in one
 *  is refused rather than moved: Ahleyia's cleaner walking out would strand the
 *  jobs she assigned them, and a contractor "starting again" would abandon
 *  their own client book. Leaving a studio is a separate act with consequences,
 *  so it does not happen as a side effect of tapping a sign-up button. */
export const mayStartOwnStudio = (c: Caller | null) => !!c && !c.orgId

/** 401 response for an unauthenticated caller. */
export const unauthorized = () => json(401, { error: 'Sign in to continue', code: 'UNAUTHENTICATED' })
/** 403 response when the caller is known but not allowed to do this. */
export const forbidden = (msg = 'You don’t have access to that') => json(403, { error: msg, code: 'FORBIDDEN' })

/** Require a signed-in caller; returns the Caller or an error response to return.
 *
 *  Checks the deployment's own configuration first. Without SUPABASE_URL the
 *  caller lookup can't even be attempted, and reporting that as "Sign in to
 *  continue" blames the person for a missing environment variable — which is
 *  precisely the wrong place to go looking. */
export async function requireCaller(event: any): Promise<{ caller: Caller } | { error: any }> {
  const badConfig = configErrorResponse()
  if (badConfig) return { error: badConfig }
  const caller = await getCaller(event)
  if (!caller) return { error: unauthorized() }
  return { caller }
}

/** Require that the caller may act on this job: the job's owner, the assigned
 *  cleaner, or staff in the job's org. */
export function canActOnJob(caller: Caller, job: { owner_id: string; cleaner_id?: string | null; org_id: string }): boolean {
  if (caller.id === job.owner_id) return true
  if (caller.id === job.cleaner_id) return true
  return isStaff(caller) && !!caller.orgId && caller.orgId === job.org_id
}
