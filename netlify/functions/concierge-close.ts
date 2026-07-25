/* Close a concierge visit and capture. Concierge captures WHEN THE VISIT CLOSES
 * (the amount isn't knowable until the clock stops and receipts are in) — a
 * genuine second capture shape alongside the cleaning arrival capture, but still
 * ONE charge per visit. The capture amount IS the sum of the job's non-tip line
 * items (her time + reimbursables passed through at cost), never a stored total. */
import { sbSelect, sbUpdate, sbInsert, json } from './_shared/db'
import { getAdapter } from './_shared/adapter'
import { requireCaller, isStaff } from './_shared/auth'
import { transition } from '../../src/lib/payments/state'
import { conciergeTimeCharge, captureAmountFromLineItems, roundToIncrement, type LineItem } from '../../src/lib/concierge'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  // This captures a card at close. Verify the caller first.
  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { jobId, minutes } = body
  if (!jobId || minutes == null) return json(400, { error: 'jobId and minutes are required' })

  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=*`)
  if (!job) return json(404, { error: 'Job not found' })

  // Closing a visit is the servicing side's action, never the client's.
  const mayClose = caller.id === job.cleaner_id || (isStaff(caller) && caller.orgId === job.org_id)
  if (!mayClose) return json(403, { error: 'Only the assigned cleaner can close this visit', code: 'FORBIDDEN' })
  if (job.payment_state !== 'scheduled') return json(409, { error: `Cannot close from payment_state ${job.payment_state}` })

  // Record her time as a concierge_time line item (15-minute increments).
  const billedMinutes = roundToIncrement(Number(minutes))
  const timeCharge = conciergeTimeCharge(billedMinutes)
  await sbInsert('job_line_items', [{ job_id: jobId, kind: 'concierge_time', label: `Concierge time · ${billedMinutes} min`, amount: timeCharge, quantity_or_minutes: billedMinutes, added_by: 'cleaner' }])

  // Capture = sum of non-tip line items (time + reimbursables at cost).
  const lines = await sbSelect<LineItem & { receipt_photo_id?: string }>('job_line_items', `job_id=eq.${jobId}&select=kind,label,amount,receipt_photo_id`)
  const normalized: LineItem[] = lines.map((l: any) => ({ kind: l.kind, label: l.label, amount: Number(l.amount), receiptPhotoId: l.receipt_photo_id ?? undefined }))
  const total = captureAmountFromLineItems(normalized)

  const [pm] = await sbSelect('payment_methods', `owner_id=eq.${job.owner_id}&is_default=eq.true&select=*&limit=1`)
  if (!pm) return json(409, { error: 'No card on file for this owner' })

  const adapter = getAdapter()
  const charge = await adapter.captureFull({ jobId, processorToken: pm.processor_token, customerId: pm.processor_token, amount: total, idempotencyKey: `concierge-close-${jobId}` })
  if (charge.status !== 'COMPLETED') {
    await sbUpdate('jobs', `id=eq.${jobId}`, { payment_state: transition(job.payment_state, 'capture_failed'), status: 'held' })
    return json(402, { error: 'Card declined at close — visit held.', code: 'CAPTURE_FAILED' })
  }
  await sbInsert('charges', [{ job_id: jobId, kind: 'service_full', amount: charge.amount, processor: adapter.name, processor_ref: charge.processorRef, card_type_at_charge: charge.cardTypeAtCharge }])

  // One charge, captured at close, then settled. Purchases come back to her at
  // cost — they were never her money to lose; her time is the earning.
  const captured = transition(job.payment_state, 'captured')
  const settled = transition(captured, 'settled')
  await sbInsert('payouts', [{ job_id: jobId, cleaner_id: job.cleaner_id, kind: 'approval_50', amount: total }])
  await sbUpdate('jobs', `id=eq.${jobId}`, { payment_state: settled, status: 'complete', client_amount: total, finished_at: new Date().toISOString() })

  const reimbursed = normalized.filter((l) => l.kind === 'reimbursable').reduce((n, l) => n + l.amount, 0)
  return json(200, { ok: true, timeCharge, reimbursed: Math.round(reimbursed * 100) / 100, total, paymentState: settled })
}
