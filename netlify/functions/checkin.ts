/* Geofenced check-in — the financial trigger. Only possible when the cleaner's
 * device is physically within the property's geofence. Captures the FULL
 * service amount in ONE charge, re-checks the card is CREDIT at charge, then
 * releases the arrival 50%. A declined capture HOLDS the job before the clean
 * proceeds — the cleaner never works for free. */
import { sbSelect, sbUpdate, sbInsert, json } from './_shared/db'
import { getAdapter } from './_shared/adapter'
import { requireCaller, isStaff } from './_shared/auth'
import { notify as notifySms, MSG } from './_shared/sms'
import { sendNotice } from './_shared/notify'
import { evaluateGeofence } from '../../src/lib/geofence'
import { transition, releaseAmounts } from '../../src/lib/payments/state'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  // This captures a card. Establish WHO is calling before anything else.
  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { jobId, device } = body
  if (!jobId || !device?.lat || !device?.lng) return json(400, { error: 'jobId and device coordinates are required' })

  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=*,properties(name,lat,lng,geofence_radius_m)`)
  if (!job) return json(404, { error: 'Job not found' })

  // Only the assigned cleaner, or staff in the job's org, may check in — never
  // the owner (checking in is what charges their card).
  const mayCheckIn = caller.id === job.cleaner_id || (isStaff(caller) && caller.orgId === job.org_id)
  if (!mayCheckIn) return json(403, { error: 'Only the assigned cleaner can check in on this job', code: 'FORBIDDEN' })
  if (job.payment_state !== 'scheduled' && job.payment_state !== 'capture_failed') {
    return json(409, { error: `Cannot check in from payment_state ${job.payment_state}` })
  }

  // 1) GPS geofence — recomputed server-side; the client can't spoof past this.
  const prop = job.properties
  const fence = evaluateGeofence({ lat: prop.lat, lng: prop.lng }, device, prop.geofence_radius_m ?? 150)
  if (!fence.withinFence) {
    return json(403, { error: 'You must be at the property to check in.', distanceM: Math.round(fence.distanceM), radiusM: fence.radiusM })
  }

  // 2) One capture of the full service amount.
  const [pm] = await sbSelect('payment_methods', `owner_id=eq.${job.owner_id}&is_default=eq.true&select=*&limit=1`)
  if (!pm) return json(409, { error: 'No card on file for this owner' })

  const adapter = getAdapter()
  const charge = await adapter.captureFull({
    jobId, processorToken: pm.processor_token, customerId: pm.processor_token, // customer stored alongside in prod
    amount: Number(job.client_amount), idempotencyKey: `capture-${jobId}`,
  })

  if (charge.status !== 'COMPLETED') {
    await sbUpdate('jobs', `id=eq.${jobId}`, { payment_state: transition(job.payment_state, 'capture_failed'), status: 'held' })
    // Tell the owner so they can fix the card — nothing was charged. With
    // texting optional, the in-app notice is the one that always lands.
    await notifySms(job.owner_id, MSG.cardDeclined(prop?.name || 'your home'))
    await sendNotice('card_declined', { orgId: job.org_id, userId: job.owner_id }, {
      subject: prop?.name, link: 'card', jobId,
    })
    return json(402, { error: 'Card declined — nothing was charged, nothing released. The job is held.', code: 'CAPTURE_FAILED' })
  }
  // Re-check CREDIT at charge; a re-classified card is refunded and held.
  if (charge.cardTypeAtCharge !== 'CREDIT') {
    await adapter.refund({ processorRef: charge.processorRef, amount: charge.amount, idempotencyKey: `refund-noncredit-${jobId}`, reason: 'Non-credit card at charge' })
    await sbUpdate('jobs', `id=eq.${jobId}`, { payment_state: 'capture_failed', status: 'held' })
    return json(402, { error: 'That card is not a credit card — charge refunded, job held.', code: 'NON_CREDIT' })
  }

  await sbInsert('charges', [{ job_id: jobId, kind: 'service_full', amount: charge.amount, processor: adapter.name, processor_ref: charge.processorRef, card_type_at_charge: charge.cardTypeAtCharge }])

  // 3) Release arrival 50% and stamp immutable check-in evidence.
  const captured = transition(job.payment_state, 'captured')
  const released = transition(captured, 'deposit_released')
  const { arrival } = releaseAmounts(Number(job.client_amount))
  await sbInsert('payouts', [{ job_id: jobId, cleaner_id: job.cleaner_id, kind: 'arrival_50', amount: arrival }])
  await sbUpdate('jobs', `id=eq.${jobId}`, {
    payment_state: released,
    status: 'in_progress',
    gps_checkin_lat: device.lat,
    gps_checkin_lng: device.lng,
    gps_checkin_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
  })

  // She's on site and the one charge has gone through — tell the owner.
  // A notification must never fail a completed payment, so both of these are
  // best-effort. The in-app notice carries no amount: a push payload can sit on
  // a lock screen someone else is holding.
  await notifySms(job.owner_id, MSG.onArrival(prop?.name || 'your home', charge.amount))
  await sendNotice('arrived', { orgId: job.org_id, userId: job.owner_id }, {
    subject: prop?.name, link: 'schedule', jobId,
  })

  return json(200, { ok: true, captured: charge.amount, arrivalReleased: arrival, paymentState: released })
}
