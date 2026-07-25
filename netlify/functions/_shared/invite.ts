/* Invitation tokens + Supabase admin-user helpers.
 *
 * The token is generated once, returned to Ahleyia to send, and never stored —
 * only its SHA-256 hash goes in the database, so a leaked backup cannot be used
 * to claim anyone's account. Lookups hash the incoming token and match on that. */
import { createHash, randomBytes } from 'node:crypto'

const URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** 32 random bytes, url-safe. Long enough that guessing is not a threat. */
export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Default invitation lifetime. Long enough to be convenient, short enough to matter. */
export const INVITE_TTL_DAYS = 14

export function expiryFromNow(days = INVITE_TTL_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export type InviteState = 'valid' | 'not_found' | 'claimed' | 'revoked' | 'expired'

/** Why an invite can (or cannot) be used. Pure, so it is unit-tested directly. */
export function inviteState(
  row: { claimed_at?: string | null; revoked_at?: string | null; expires_at: string } | null | undefined,
  now: Date = new Date(),
): InviteState {
  if (!row) return 'not_found'
  if (row.revoked_at) return 'revoked'
  if (row.claimed_at) return 'claimed'
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  return 'valid'
}

export const INVITE_MESSAGE: Record<Exclude<InviteState, 'valid'>, string> = {
  not_found: 'That link isn’t valid. Ask Ahleyia to send you a fresh one.',
  claimed: 'This link has already been used. Sign in with your email and password instead.',
  revoked: 'That link was cancelled. Ask Ahleyia to send you a fresh one.',
  expired: 'That link has expired. Ask Ahleyia to send you a fresh one.',
}

/* ------------------------------------------------- Supabase admin (users) -- */
async function admin<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.msg || data?.error_description || data?.error || `admin ${path} ${res.status}`)
  return data as T
}

/** Create the auth account for a client Ahleyia already works with. They set
 *  their own password later by claiming the invitation. */
export function createAuthUser(input: { email?: string; phone?: string; fullName?: string }): Promise<{ id: string }> {
  const body: any = {
    password: randomBytes(24).toString('base64url'), // replaced when they claim
    user_metadata: { role: 'owner', full_name: input.fullName || null, provisioned_by_studio: true },
  }
  if (input.email) { body.email = input.email; body.email_confirm = true }
  if (input.phone) { body.phone = input.phone; body.phone_confirm = true }
  return admin<{ id: string }>('users', { method: 'POST', body: JSON.stringify(body) })
}

/** Set the client's real email + chosen password when they claim the invite. */
export function updateAuthUser(id: string, patch: { email?: string; password?: string }): Promise<unknown> {
  const body: any = { ...patch }
  if (patch.email) body.email_confirm = true
  return admin(`users/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

/** Remove an auth user — used to roll back a half-created client. */
export function deleteAuthUser(id: string): Promise<unknown> {
  return admin(`users/${id}`, { method: 'DELETE' })
}

/** Password rule for a client setting up their login. */
export function passwordProblem(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Use at least 8 characters.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use letters and at least one number.'
  return null
}

/** Loose email sanity check — the real verification is the confirmation itself. */
export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || '').trim())
}
