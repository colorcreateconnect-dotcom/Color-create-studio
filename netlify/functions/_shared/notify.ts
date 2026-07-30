/* Telling someone something happened.
 *
 * Two layers, deliberately:
 *
 *   1. A row in `notifications`. This is the record of record. It is written
 *      first, and a push failure never loses it — the person sees the notice
 *      the next time they open the app, on any device, whether or not they ever
 *      granted notification permission.
 *
 *   2. A Web Push to each of their registered devices, best-effort. Web Push
 *      needs no provider and costs nothing per message: the browser's own push
 *      service delivers it, and the only credential is a VAPID keypair we
 *      generate once. With no keypair configured this layer is simply skipped,
 *      exactly like the SMS and Square adapters.
 *
 * The copy lives here rather than in the caller so the same event always reads
 * the same way, and so nothing a browser sends can become the text of a notice
 * that appears to come from the studio.
 *
 * What NEVER goes in a notification body: an amount the recipient shouldn't
 * see, an address, or anything from the internal pricing tables. A push payload
 * is delivered by a third-party push service and may sit on the lock screen of
 * a phone somebody else is holding. */
import { sbSelect, sbInsert, sbDelete } from './db'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:ahleyia@atlluxurycleaning.com'

/** Is Web Push wired? Without a keypair, notices are in-app only. */
export const pushConfigured = () => !!VAPID_PUBLIC && !!VAPID_PRIVATE

export type NoticeKind =
  | 'on_the_way' | 'arrived' | 'report_ready' | 'approval_due'
  | 'booked' | 'quote_ready' | 'message' | 'invite_claimed'
  | 'payout' | 'supplies' | 'card_declined'

/** The preference key each kind is filed under, so one toggle covers a family
 *  of related notices (arrival + on-the-way are both "cleaning"). */
const PREF_KEY: Record<NoticeKind, string> = {
  on_the_way: 'cleaning',
  arrived: 'cleaning',
  report_ready: 'reports',
  approval_due: 'approvals',
  booked: 'bookings',
  quote_ready: 'quotes',
  message: 'messages',
  invite_claimed: 'clients',
  payout: 'payouts',
  supplies: 'supplies',
  // Deliberately its own key, and nothing in the settings screen turns it off:
  // a client whose card failed has to hear about it or their clean doesn't
  // happen. `wants()` returns true for any key nobody can set to false.
  card_declined: 'card_declined',
}

export interface Notice {
  orgId: string
  userId: string
  kind: NoticeKind
  title: string
  body?: string
  /** A route key the app understands ('report', 'schedule', 'job:<id>'). */
  link?: string
  jobId?: string
}

/** Fill in the studio's wording for a known event. `subject` is a home or a
 *  person — never an amount and never an address. */
export function noticeText(kind: NoticeKind, subject?: string): { title: string; body?: string } {
  const at = subject ? ` at ${subject}` : ''
  const of = subject ? ` for ${subject}` : ''
  switch (kind) {
    case 'on_the_way': return { title: 'Ahleyia is on her way', body: `She’ll be${at || ' with you'} shortly.` }
    case 'arrived': return { title: 'Ahleyia has arrived', body: `She’s on site${at} and starting now.` }
    case 'report_ready': return { title: subject ? `${subject} is ready ✨` : 'Your home is ready ✨', body: 'Your proof photos and report are inside.' }
    case 'approval_due': return { title: 'Approve today’s clean', body: 'Her final half releases on its own in 48 hours.' }
    case 'booked': return { title: 'Your clean is booked', body: `Confirmed${of}. Nothing is charged until she arrives.` }
    case 'quote_ready': return { title: 'Your quote is ready', body: 'Tailored to the spaces you chose. Tap to see it.' }
    case 'message': return { title: 'New message', body: subject ? `From ${subject}.` : 'Tap to read it.' }
    case 'invite_claimed': return { title: subject ? `${subject} finished setting up` : 'A client finished setting up', body: 'Their account is live and connected to you.' }
    case 'payout': return { title: 'Payout on its way', body: 'The details are in your payouts.' }
    case 'supplies': return { title: 'Supplies update', body: 'Tap to see what changed.' }
    case 'card_declined': return { title: 'Your card needs updating', body: `Nothing was charged${of ? ' for' + of.slice(3) : ''}. Update your card and she can start.` }
  }
}

/** The notices a staff member may fire by hand. Everything else is raised by
 *  the function that owns the event (check-in, booking, approval), so the
 *  browser can never announce something that didn't happen. */
export const STAFF_KINDS: NoticeKind[] = [
  'on_the_way', 'report_ready', 'approval_due', 'quote_ready', 'message', 'supplies',
]

/** May this caller send this notice about this job?
 *
 *  Three separate conditions, and all of them matter:
 *   - staff only — a client sending notices would be a way to impersonate the
 *     studio on someone else's lock screen;
 *   - the kind must be one of the by-hand set — a fixed list is what stops the
 *     endpoint from becoming "put arbitrary words under Ahleyia's name";
 *   - the job must be in the caller's own organization. */
export function canSendNotice(
  caller: { role: string; orgId: string | null } | null,
  kind: string,
  job: { org_id: string } | null,
): boolean {
  if (!caller) return false
  if (caller.role !== 'cleaner' && caller.role !== 'org_admin') return false
  if (STAFF_KINDS.indexOf(kind as NoticeKind) < 0) return false
  if (!job) return false
  return !!caller.orgId && caller.orgId === job.org_id
}

/** Does this person want this kind of notice? Absent means yes, so a new kind
 *  of notice reaches people instead of being withheld until they find a toggle. */
export function wants(prefs: Record<string, unknown> | null | undefined, kind: NoticeKind): boolean {
  if (!prefs) return true
  return prefs[PREF_KEY[kind]] !== false
}

/** Write the notice, then try to push it. Never throws: a notification failing
 *  must not fail the booking, the check-in, or the payment that caused it. */
export async function notifyUser(n: Notice): Promise<{ stored: boolean; pushed: number; skipped?: string }> {
  try {
    const [user] = await sbSelect('users', `id=eq.${n.userId}&select=id,notify_prefs`)
    if (!user) return { stored: false, pushed: 0, skipped: 'no_such_user' }
    if (!wants(user.notify_prefs, n.kind)) return { stored: false, pushed: 0, skipped: 'opted_out' }

    await sbInsert('notifications', [{
      org_id: n.orgId, user_id: n.userId, kind: n.kind,
      title: n.title, body: n.body ?? null, link: n.link ?? null, job_id: n.jobId ?? null,
    }])

    const pushed = await pushToUser(n.userId, {
      title: n.title, body: n.body || '', link: n.link || '', kind: n.kind,
    })
    return { stored: true, pushed }
  } catch {
    // Swallowed on purpose — see the note above.
    return { stored: false, pushed: 0, skipped: 'error' }
  }
}

/** Send one payload to every device this person has registered. Endpoints the
 *  push service reports as gone (404/410) are deleted: a stale subscription
 *  otherwise fails forever on every future notice. */
async function pushToUser(userId: string, payload: Record<string, unknown>): Promise<number> {
  if (!pushConfigured()) return 0
  let webpush: any
  try {
    // Imported lazily so a function that never notifies anyone doesn't pay for
    // loading it, and so a missing module can't break the caller.
    webpush = (await import('web-push')).default
  } catch { return 0 }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const subs = await sbSelect('push_subscriptions', `user_id=eq.${userId}&select=id,endpoint,p256dh,auth_secret`)
  if (!subs.length) return 0

  const body = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0
  await Promise.all(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_secret } },
        body,
        { TTL: 3600, urgency: 'normal' },
      )
      sent += 1
    } catch (e: any) {
      const code = e?.statusCode
      if (code === 404 || code === 410) dead.push(s.id)
    }
  }))
  if (dead.length) await deleteSubs(dead)
  return sent
}

async function deleteSubs(ids: string[]) {
  const list = ids.map((i) => `"${i}"`).join(',')
  try { await sbDelete('push_subscriptions', `id=in.(${list})`) }
  catch { /* it'll be retried on the next send */ }
}

/** Send a notice using the studio's own wording for a known event. */
export function sendNotice(kind: NoticeKind, to: { orgId: string; userId: string }, opts: { subject?: string; link?: string; jobId?: string } = {}) {
  const { title, body } = noticeText(kind, opts.subject)
  return notifyUser({ orgId: to.orgId, userId: to.userId, kind, title, body, link: opts.link, jobId: opts.jobId })
}
