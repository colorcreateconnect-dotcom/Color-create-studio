/* Owner approval — releases the final 50%. Approving is NOT a new service
 * charge; it releases already-captured funds. A tip, if added, is a SEPARATE
 * charge, 100% to the cleaner. */
import { sbSelect, sbUpdate, sbInsert, json } from './_shared/db'
import { getAdapter } from './_shared/adapter'
import { transition, releaseAmounts } from '../../src/lib/payments/state'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { jobId, tip } = body
  if (!jobId) return json(400, { error: 'jobId is required' })

  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=*`)
  if (!job) return json(404, { error: 'Job not found' })
  if (job.payment_state !== 'awaiting_approval') {
    return json(409, { error: `Cannot approve from payment_state ${job.payment_state}` })
  }
  // A held dispute must be resolved before approval releases funds.
  const [openDispute] = await sbSelect('disputes', `job_id=eq.${jobId}&open=eq.true&select=id&limit=1`)
  if (openDispute) return json(409, { error: 'A dispute is open on this job; resolve it before releasing.' })

  const approved = transition(job.payment_state, 'approved')
  const finalReleased = transition(approved, 'final_released')
  const { final } = releaseAmounts(Number(job.client_amount))

  await sbInsert('approvals', [{ job_id: jobId, kind: 'owner_approved', tip_amount: tip ?? null }])
  await sbInsert('payouts', [{ job_id: jobId, cleaner_id: job.cleaner_id, kind: 'approval_50', amount: final }])

  // Tip: separate charge, 100% to the cleaner, no platform fee.
  let tipCharged = 0
  if (tip && Number(tip) > 0) {
    const [pm] = await sbSelect('payment_methods', `owner_id=eq.${job.owner_id}&is_default=eq.true&select=*&limit=1`)
    if (pm) {
      const adapter = getAdapter()
      const t = await adapter.chargeTip({ jobId, processorToken: pm.processor_token, customerId: pm.processor_token, amount: Number(tip), idempotencyKey: `tip-${jobId}` })
      if (t.status === 'COMPLETED') {
        tipCharged = t.amount
        await sbInsert('charges', [{ job_id: jobId, kind: 'tip', amount: t.amount, processor: adapter.name, processor_ref: t.processorRef }])
        await sbInsert('payouts', [{ job_id: jobId, cleaner_id: job.cleaner_id, kind: 'tip', amount: t.amount }])
      }
    }
  }

  await sbUpdate('jobs', `id=eq.${jobId}`, { payment_state: finalReleased })
  return json(200, { ok: true, finalReleased: final, tipCharged, paymentState: finalReleased })
}
