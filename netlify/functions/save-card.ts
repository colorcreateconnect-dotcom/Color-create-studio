/* Save an owner's card on file WITH recorded consent. CREDIT only — debit /
 * prepaid / unknown are rejected before anything is stored. The card token is
 * single-use and produced client-side by the Square Web Payments SDK. */
import { sbInsert, json } from './_shared/db'
import { getAdapter } from './_shared/adapter'
import { requireCaller } from './_shared/auth'
import { evaluateCard } from '../../src/lib/payments/cards'
import { makeConsent } from '../../src/lib/consent'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }

  const { ownerId, orgId, cardToken, consentAgreedAt } = body
  if (!ownerId || !orgId || !cardToken) return json(400, { error: 'ownerId, orgId and cardToken are required' })
  if (!consentAgreedAt) return json(422, { error: 'Payment authorization consent is required before a card can be saved' })

  // A card may only ever be saved by its own owner, with their own consent —
  // nobody puts a card on file for someone else.
  if (caller.id !== ownerId) return json(403, { error: 'You can only save a card on your own account', code: 'FORBIDDEN' })
  if (caller.orgId && caller.orgId !== orgId) return json(403, { error: 'Organization mismatch', code: 'FORBIDDEN' })

  const adapter = getAdapter()
  const saved = await adapter.saveCard({ ownerId, cardToken })

  const decision = evaluateCard(saved.meta)
  if (!decision.accepted) {
    // Never store a non-credit card; the whole model depends on credit on file.
    return json(422, { error: decision.reason, code: 'CARD_REJECTED' })
  }

  const consent = makeConsent(consentAgreedAt, { ipHint: event.headers?.['x-nf-client-connection-ip'], userAgent: event.headers?.['user-agent'] })
  const [row] = await sbInsert('payment_methods', [{
    owner_id: ownerId,
    org_id: orgId,
    processor: adapter.name,
    processor_token: saved.processorToken,
    brand: saved.meta.brand,
    last4: saved.meta.last4,
    exp_month: saved.meta.expMonth,
    exp_year: saved.meta.expYear,
    card_type: saved.meta.cardType,
    consent_version: consent.version,
    consent_text: consent.text,
    consent_agreed_at: consent.agreedAt,
  }])

  return json(200, { ok: true, id: row.id, brand: saved.meta.brand, last4: saved.meta.last4 })
}
