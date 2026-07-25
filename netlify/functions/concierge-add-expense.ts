/* Add a reimbursable expense to a concierge visit. The receipt photo is
 * REQUIRED — enforced here (server-side), not just in the UI. No receipt, no
 * reimbursement: it's the owner's proof and the cleaner's protection.
 * Purchases are reimbursed AT COST — this endpoint records no markup. */
import { sbSelect, sbInsert, json } from './_shared/db'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { jobId, orgId, propertyId, ownerId, label, amount, receipt } = body

  if (!jobId || !label || amount == null) return json(400, { error: 'jobId, label and amount are required' })
  // The rule, enforced server-side.
  if (!receipt?.storageKey) {
    return json(422, { error: 'The photo is the owner’s proof. No receipt, no reimbursement — that rule protects you both.', code: 'RECEIPT_REQUIRED' })
  }

  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=id,org_id,property_id,owner_id`)
  if (!job) return json(404, { error: 'Job not found' })

  const [photo] = await sbInsert('photos', [{
    org_id: orgId ?? job.org_id,
    property_id: propertyId ?? job.property_id,
    owner_id: ownerId ?? job.owner_id,
    job_id: jobId,
    storage_key: receipt.storageKey,
    kind: 'receipt',
    captured_at: receipt.capturedAt ?? new Date().toISOString(),
    captured_lat: receipt.lat,
    captured_lng: receipt.lng,
    marketing_consent: false,
  }])

  const [line] = await sbInsert('job_line_items', [{
    job_id: jobId,
    kind: 'reimbursable',
    label,
    amount: Number(amount), // at cost — no markup
    receipt_photo_id: photo.id,
    added_by: 'cleaner',
    taxable: false,
  }])

  return json(200, { ok: true, lineItemId: line.id, receiptPhotoId: photo.id, amount: Number(amount) })
}
