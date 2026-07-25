/* Browser → Netlify Functions client for the money path. These endpoints hold
 * the service-role key and do the actual charging/releasing; the browser only
 * ever sends intent (a card token, a jobId, GPS) and shows the result. Every
 * call is a POST that returns a typed result or throws an ApiError carrying the
 * function's own message + code (so the UI can show, e.g., CARD_REJECTED). */

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
    res = await fetch(`${FN_BASE}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

/* ---- concierge: close the visit and capture (sum of non-tip line items) ---- */
export interface CloseVisitResult { ok: true; timeCharge: number; reimbursed: number; total: number; paymentState: string }
export function closeConciergeVisit(input: { jobId: string; minutes: number }): Promise<CloseVisitResult> {
  return post('concierge-close', input)
}
