/* Send a notice about a job, and register/unregister this device for push.
 *
 * Two things live here because they share one rule: the VAPID private key
 * never leaves the server, so a push can only ever be sent by a function.
 *
 * POST { action: 'send', jobId, kind }
 *   Staff only, and only about a job in their own org. The caller does NOT
 *   supply the wording — `kind` selects it from the studio's own copy in
 *   _shared/notify. That is what stops this from being a way to put arbitrary
 *   text on a client's lock screen under Ahleyia's name.
 *
 * POST { action: 'subscribe', subscription }  /  { action: 'unsubscribe', endpoint }
 *   Any signed-in caller, for themselves only. The row is keyed by endpoint, so
 *   re-registering the same browser updates rather than duplicates.
 *
 * GET  → { pushConfigured, publicKey }
 *   Lets the app decide whether to offer the "turn on notifications" prompt at
 *   all, and hands it the VAPID public key (which is public by design). */
import { sbSelect, sbInsert, sbUpdate, sbDelete, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'
import { sendNotice, pushConfigured, canSendNotice, STAFF_KINDS, type NoticeKind } from './_shared/notify'

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''

export const handler = async (event: any) => {
  if (event.httpMethod === 'GET') {
    return json(200, { pushConfigured: pushConfigured(), publicKey: PUBLIC_KEY })
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }

  /* ---------------------------------------------- register this device -- */
  if (body.action === 'subscribe') {
    const sub = body.subscription || {}
    const endpoint = String(sub.endpoint || '')
    const p256dh = String(sub.keys?.p256dh || '')
    const authSecret = String(sub.keys?.auth || '')
    if (!endpoint || !p256dh || !authSecret) return json(400, { error: 'Incomplete subscription' })

    // Same browser re-registering: move the endpoint to whoever is signed in
    // now, so a shared device doesn't keep pushing to the previous account.
    const existing = await sbSelect('push_subscriptions', `endpoint=eq.${encodeURIComponent(endpoint)}&select=id`)
    const row = {
      user_id: caller.id, endpoint, p256dh, auth_secret: authSecret,
      user_agent: (event.headers?.['user-agent'] || '').slice(0, 300),
      last_seen_at: new Date().toISOString(),
    }
    if (existing.length) await sbUpdate('push_subscriptions', `id=eq.${existing[0].id}`, row)
    else await sbInsert('push_subscriptions', [row])
    return json(200, { ok: true, pushConfigured: pushConfigured() })
  }

  if (body.action === 'unsubscribe') {
    const endpoint = String(body.endpoint || '')
    if (!endpoint) return json(400, { error: 'endpoint is required' })
    const rows = await sbSelect('push_subscriptions', `endpoint=eq.${encodeURIComponent(endpoint)}&select=id,user_id`)
    // Only your own device — an endpoint is not a credential.
    const mine = rows.filter((r: any) => r.user_id === caller.id)
    if (mine.length) await sbDelete('push_subscriptions', `id=eq.${mine[0].id}`)
    return json(200, { ok: true })
  }

  /* ------------------------------------------------------ send a notice -- */
  if (body.action !== 'send') return json(400, { error: 'Unknown action' })
  if (!isStaff(caller)) return json(403, { error: 'Only the studio sends notices', code: 'FORBIDDEN' })

  const kind = body.kind as NoticeKind
  if (STAFF_KINDS.indexOf(kind) < 0) return json(400, { error: 'Unknown notice' })

  const jobId = body.jobId
  if (!jobId) return json(400, { error: 'jobId is required' })
  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=id,org_id,owner_id,property_id`)
  if (!job) return json(404, { error: 'Job not found' })
  // The one authorization decision, asserted directly in src/lib/notify.test.ts.
  if (!canSendNotice(caller, kind, job)) {
    return json(403, { error: 'That job isn’t yours', code: 'FORBIDDEN' })
  }

  const [prop] = await sbSelect('properties', `id=eq.${job.property_id}&select=name`)
  const res = await sendNotice(kind, { orgId: job.org_id, userId: job.owner_id }, {
    subject: prop?.name,
    link: kind === 'report_ready' || kind === 'approval_due' ? 'report' : 'schedule',
    jobId: job.id,
  })
  return json(200, { ok: true, ...res })
}
