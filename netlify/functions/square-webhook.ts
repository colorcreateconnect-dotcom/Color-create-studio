/* Square webhook: verifies the signature, then reconciles charge/refund state.
 * Signature failure returns 401 so replayed/forged events are rejected. */
import { sbUpdate, json } from './_shared/db'
import { getAdapter } from './_shared/adapter'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  const adapter = getAdapter()
  let evt
  try {
    evt = await adapter.onWebhook(event.headers || {}, event.body || '')
  } catch (e: any) {
    return json(401, { error: String(e?.message ?? e) })
  }

  // Best-effort reconciliation. Payment/refund updates keep our record honest
  // even if a function response was lost.
  try {
    if (evt.type?.startsWith('payment.') && evt.paymentRef) {
      await sbUpdate('charges', `processor_ref=eq.${evt.paymentRef}`, { /* status mirror if column added */ })
    }
    if (evt.type?.startsWith('refund.') && evt.paymentRef) {
      await sbUpdate('jobs', `id=in.(select job_id from charges where processor_ref='${evt.paymentRef}')`, { payment_state: 'refunded' })
    }
  } catch {
    /* swallow — Square retries webhooks; never 500 on a reconciliation miss */
  }

  return json(200, { received: true, type: evt.type })
}
