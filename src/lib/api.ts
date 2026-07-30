/* Browser → Netlify Functions client for the money path. These endpoints hold
 * the service-role key and do the actual charging/releasing; the browser only
 * ever sends intent (a card token, a jobId, GPS) and shows the result. Every
 * call is a POST that returns a typed result or throws an ApiError carrying the
 * function's own message + code (so the UI can show, e.g., CARD_REJECTED). */

import { accessToken } from './supabase'

export class ApiError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code
  }
}

const FN_BASE = '/.netlify/functions'

async function post<T>(fn: string, body: unknown): Promise<T> {
  let res: Response
  try {
    // The functions hold the service-role key, so they verify WHO is calling
    // before acting. Send the signed-in user's token with every request.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const tok = accessToken()
    if (tok) headers.Authorization = `Bearer ${tok}`
    res = await fetch(`${FN_BASE}/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (e: any) {
    throw new ApiError(e?.message || 'Network error', 0)
  }
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data?.error || `${fn} failed (${res.status})`, res.status, data?.code)
  return data as T
}

/* ---- save a card on file (CREDIT only; consent required) ---- */
export interface SaveCardResult { ok: true; id: string; brand: string; last4: string }
export function saveCard(input: {
  ownerId: string; orgId: string; cardToken: string; consentAgreedAt: string
}): Promise<SaveCardResult> {
  return post('save-card', input)
}

/* ---- geofenced check-in: one full capture + arrival 50% release ---- */
export interface CheckInResult { ok: true; captured: number; arrivalReleased: number; paymentState: string }
export function checkIn(input: {
  jobId: string; device: { lat: number; lng: number }
}): Promise<CheckInResult> {
  return post('checkin', input)
}

/* ---- owner approval: release final 50% (+ optional separate tip charge) ---- */
export interface ApproveResult { ok: true; finalReleased: number; tipCharged: number; paymentState: string }
export function approve(input: { jobId: string; tip?: number }): Promise<ApproveResult> {
  return post('approve', input)
}

/* ---- concierge: add a reimbursable expense (receipt REQUIRED) ---- */
export interface AddExpenseResult { ok: true; lineItemId: string; receiptPhotoId: string; amount: number }
export function addConciergeExpense(input: {
  jobId: string; label: string; amount: number
  receipt: { storageKey: string; capturedAt?: string; lat?: number; lng?: number }
  orgId?: string; propertyId?: string; ownerId?: string
}): Promise<AddExpenseResult> {
  return post('concierge-add-expense', input)
}

/* ---- add a client Ahleyia already works with (staff only) ---- */
export interface CreateClientResult {
  ok: true; clientId: string; propertyId: string; quoteId: string | null
  inviteToken: string; inviteUrl: string; expiresAt: string
}
export function createClient(input: {
  fullName: string; phone?: string; email?: string
  propertyName: string; address?: string; neighborhood?: string
  propertyType?: 'airbnb' | 'residential' | 'loved_one'
  beds?: number; baths?: number
  agreedPrice?: number; cadence?: string; notes?: string
  smsConsent?: boolean
}): Promise<CreateClientResult> {
  return post('create-client', input)
}

/* ---- add someone to the team (business owner only) ---- */
export interface CreateStaffResult {
  ok: true; staffId: string; inviteToken: string; inviteUrl: string; expiresAt: string
}
export function createStaff(input: {
  fullName: string; phone?: string; email?: string; smsConsent?: boolean
}): Promise<CreateStaffResult> {
  return post('create-staff', input)
}

/* ---- text a client their invitation link (staff only; server picks recipient) ---- */
export interface SendInviteResult {
  ok: true; inviteUrl: string; expiresAt: string
  texted: boolean; smsReason: string | null; smsConfigured: boolean
}
export function sendInvite(clientId: string): Promise<SendInviteResult> {
  return post('send-invite', { clientId })
}

/* ---- the invitation a client opens (no sign-in: the token is the credential) ---- */
export interface InvitePreview {
  ok: true
  /** 'client' = a homeowner claiming their account; 'staff' = joining the team. */
  kind?: 'client' | 'staff'
  studio: string; fullName: string | null; email: string | null; phone: string | null
  properties: { name: string; neighborhood: string | null; type: string; beds: number | null; baths: number | null }[]
  agreedPrice: number | null; cadence: string | null
}
export function invitePreview(token: string): Promise<InvitePreview> {
  return post('invite-preview', { token })
}

export interface ClaimInviteResult { ok: true; email: string; message: string }
export function claimInvite(input: { token: string; email: string; password: string }): Promise<ClaimInviteResult> {
  return post('claim-invite', input)
}

/* ---- book a clean: creates the job + its Kee Method checklist (no charge) ---- */
export interface BookCleanResult { ok: true; jobId: string; clientAmount: number; type: string; steps: number; charged: false }
export function bookClean(input: {
  propertyId: string
  windowStart?: string; windowEnd?: string
  type?: 'turnover' | 'residential' | 'deep'
  staging?: 'light' | 'standard' | 'heavy'
  hours?: number; ecoFinish?: boolean; cleanerId?: string
}): Promise<BookCleanResult> {
  return post('book-clean', input)
}

/* ---- concierge: close the visit and capture (sum of non-tip line items) ---- */
export interface CloseVisitResult { ok: true; timeCharge: number; reimbursed: number; total: number; paymentState: string }
export function closeConciergeVisit(input: { jobId: string; minutes: number }): Promise<CloseVisitResult> {
  return post('concierge-close', input)
}

/* ---- notifications ----------------------------------------------------- */

/** What this deployment can do. Cheap enough to call on load; the app uses it
 *  to decide whether to offer "turn on notifications" at all. */
export interface PushConfig { pushConfigured: boolean; publicKey: string }
export async function pushConfig(): Promise<PushConfig> {
  try {
    const res = await fetch(`${FN_BASE}/notify`, { method: 'GET' })
    if (!res.ok) return { pushConfigured: false, publicKey: '' }
    return await res.json()
  } catch { return { pushConfigured: false, publicKey: '' } }
}

/** Register this device. The endpoint + keys come from src/lib/push. */
export function registerPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<{ ok: true; pushConfigured: boolean }> {
  return post('notify', { action: 'subscribe', subscription })
}

/** Stop pushing to this device. */
export function unregisterPush(endpoint: string): Promise<{ ok: true }> {
  return post('notify', { action: 'unsubscribe', endpoint })
}

/** Staff-only: send one of the studio's notices about a job. The wording is
 *  the server's, not ours — see netlify/functions/_shared/notify.ts. */
export type SendableNotice = 'on_the_way' | 'report_ready' | 'approval_due' | 'quote_ready' | 'message' | 'supplies'
export interface SendNoticeResult { ok: true; stored: boolean; pushed: number; skipped?: string }
export function sendNotice(input: { jobId: string; kind: SendableNotice }): Promise<SendNoticeResult> {
  return post('notify', { action: 'send', ...input })
}
