/* Outbound SMS via Twilio.
 *
 * Dependency-free, like the rest of the server code: Twilio's Messages API is a
 * form-encoded POST with basic auth, so no SDK is needed.
 *
 * Two rules are enforced here rather than at each call site, so no future
 * endpoint can forget them:
 *   1. Nobody is texted without recorded consent, and an opt-out (STOP) always
 *      wins — permanently.
 *   2. With no Twilio credentials configured, sending is a no-op that reports
 *      'not_configured'. Notifications must never break a booking or a payment.
 *
 * There is deliberately no "send arbitrary text" endpoint: every message is
 * composed here from a domain event, and the recipient is looked up server-side
 * from the database. A public sender would be an open relay. */
import { sbSelect } from './db'

const SID = process.env.TWILIO_ACCOUNT_SID || ''
const TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const FROM = process.env.TWILIO_FROM || ''
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || ''

export const smsConfigured = () => !!SID && !!TOKEN && (!!FROM || !!MESSAGING_SERVICE_SID)

export type SmsOutcome =
  | { sent: true; sid: string }
  | { sent: false; reason: 'not_configured' | 'no_consent' | 'opted_out' | 'no_number' | 'failed'; detail?: string }

/** E.164-ish: strip formatting, assume US when a bare 10-digit number is given. */
export function toE164(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null
  if (raw.startsWith('+')) {
    const d = '+' + raw.slice(1).replace(/\D/g, '')
    return d.length >= 8 ? d : null
  }
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return d.length >= 8 ? `+${d}` : null
}

/** May this person be texted right now? Opt-out always beats consent. */
export function mayText(u: { sms_consent?: boolean; sms_opted_out?: boolean; phone?: string | null } | null | undefined):
  { ok: true } | { ok: false; reason: 'no_consent' | 'opted_out' | 'no_number' } {
  if (!u) return { ok: false, reason: 'no_consent' }
  if (u.sms_opted_out) return { ok: false, reason: 'opted_out' }
  if (!u.sms_consent) return { ok: false, reason: 'no_consent' }
  if (!u.phone || !toE164(u.phone)) return { ok: false, reason: 'no_number' }
  return { ok: true }
}

/** Send to an explicit number. Callers should prefer notify(), which checks consent. */
async function sendRaw(to: string, body: string): Promise<SmsOutcome> {
  if (!smsConfigured()) return { sent: false, reason: 'not_configured' }
  const e164 = toE164(to)
  if (!e164) return { sent: false, reason: 'no_number' }

  const form = new URLSearchParams({ To: e164, Body: body })
  if (MESSAGING_SERVICE_SID) form.set('MessagingServiceSid', MESSAGING_SERVICE_SID)
  else form.set('From', FROM)

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) return { sent: false, reason: 'failed', detail: data?.message || `HTTP ${res.status}` }
    return { sent: true, sid: data.sid }
  } catch (e: any) {
    return { sent: false, reason: 'failed', detail: e?.message }
  }
}

/** Text a user by id, honouring their consent and opt-out. Never throws — a
 *  notification failing must not fail the action that triggered it. */
export async function notify(userId: string | null | undefined, body: string): Promise<SmsOutcome> {
  if (!userId) return { sent: false, reason: 'no_number' }
  if (!smsConfigured()) return { sent: false, reason: 'not_configured' }
  try {
    const [u] = await sbSelect('users', `id=eq.${userId}&select=phone,sms_consent,sms_opted_out`)
    const gate = mayText(u)
    if (!gate.ok) return { sent: false, reason: gate.reason }
    return await sendRaw(u.phone, body)
  } catch (e: any) {
    return { sent: false, reason: 'failed', detail: e?.message }
  }
}

/** Text an explicit number after checking that person's consent row. */
export async function notifyNumber(userId: string, phone: string, body: string): Promise<SmsOutcome> {
  if (!smsConfigured()) return { sent: false, reason: 'not_configured' }
  try {
    const [u] = await sbSelect('users', `id=eq.${userId}&select=phone,sms_consent,sms_opted_out`)
    const gate = mayText({ ...u, phone })
    if (!gate.ok) return { sent: false, reason: gate.reason }
    return await sendRaw(phone, body)
  } catch (e: any) {
    return { sent: false, reason: 'failed', detail: e?.message }
  }
}

/* ------------------------------------------------------------- messages -- */
/* Short, warm, and never jargon — the same voice as the app's notifications.
 * Every message says who it is from, because a text from an unknown number is
 * a text people ignore. */

const STUDIO = 'She’s Maid In ATL'
const money = (n: number) => '$' + Number(n).toFixed(2)

export const MSG = {
  invite: (name: string, url: string) =>
    `Hi ${name || 'there'} — it’s Ahleyia at ${STUDIO}. Your account is ready: set your sign-in here ${url} (link works once). Reply STOP to opt out.`,

  onArrival: (propertyName: string, amount: number) =>
    `${STUDIO}: Ahleyia has arrived at ${propertyName} and started your clean. Your card was charged ${money(amount)} — one charge, as agreed. Reply STOP to opt out.`,

  cardDeclined: (propertyName: string) =>
    `${STUDIO}: your card was declined for today’s clean at ${propertyName}, so nothing was charged and the job is on hold. Update your card in the app and Ahleyia will pick straight back up. Reply STOP to opt out.`,

  finalReleased: (propertyName: string, amount: number) =>
    `${STUDIO}: your final ${money(amount)} for ${propertyName} has been released. Reply STOP to opt out.`,

  tipReceived: (amount: number) =>
    `${STUDIO}: a ${money(amount)} tip just came through — 100% yours. Reply STOP to opt out.`,

  autoReleasedOwner: (propertyName: string) =>
    `${STUDIO}: the balance for your clean at ${propertyName} released automatically after 48 hours, as set out when you signed up. Your photo report is in the app. Reply STOP to opt out.`,

  autoReleasedCleaner: (amount: number) =>
    `${STUDIO}: ${money(amount)} auto-released after 48 hours with no response. Reply STOP to opt out.`,
}
