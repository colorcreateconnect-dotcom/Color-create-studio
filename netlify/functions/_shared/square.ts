/* Square implementation of the PaymentAdapter (server-only). Uses the Square
 * v2 REST API via fetch — no SDK needed for these server calls. The client
 * tokenizes cards with the Square Web Payments SDK; this never sees raw PANs.
 *
 * Re-verify endpoint/field names against current Square docs before go-live;
 * they are stable but versioned via the Square-Version header. */
import type {
  PaymentAdapter, SaveCardInput, SavedCard, CaptureInput, ChargeResult,
  TipInput, RefundInput, RefundResult, WebhookEvent,
} from '../../../src/lib/payments/adapter'
import type { CardMeta, CardType, PrepaidType } from '../../../src/lib/payments/cards'
import { createHmac } from 'node:crypto'

const SQUARE_VERSION = '2025-01-23'

function base(): string {
  return process.env.SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'
}
function token(): string {
  const t = process.env.SQUARE_ACCESS_TOKEN
  if (!t) throw new Error('SQUARE_ACCESS_TOKEN is not set')
  return t
}
const cents = (dollars: number) => Math.round(dollars * 100)

async function sq(path: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Square ${path} ${res.status}: ${JSON.stringify(data.errors ?? data)}`)
  return data
}

function metaFromCard(card: any): CardMeta {
  return {
    brand: String(card.card_brand ?? '').toUpperCase(),
    last4: String(card.last_4 ?? ''),
    expMonth: card.exp_month,
    expYear: card.exp_year,
    cardType: (card.card_type ?? 'UNKNOWN') as CardType,
    prepaidType: (card.prepaid_type ?? 'UNKNOWN') as PrepaidType,
  }
}

export class SquareAdapter implements PaymentAdapter {
  readonly name = 'square'

  async saveCard(input: SaveCardInput): Promise<SavedCard> {
    let customerId = input.buyerCustomerId
    if (!customerId) {
      const c = await sq('/v2/customers', 'POST', { idempotency_key: crypto.randomUUID() })
      customerId = c.customer.id
    }
    const created = await sq('/v2/cards', 'POST', {
      idempotency_key: crypto.randomUUID(),
      source_id: input.cardToken,
      card: { customer_id: customerId },
    })
    return { processorToken: created.card.id, customerId: customerId!, meta: metaFromCard(created.card) }
  }

  async getCardMeta(processorToken: string): Promise<CardMeta> {
    const c = await sq(`/v2/cards/${processorToken}`, 'GET')
    return metaFromCard(c.card)
  }

  async captureFull(input: CaptureInput): Promise<ChargeResult> {
    try {
      const p = await sq('/v2/payments', 'POST', {
        idempotency_key: input.idempotencyKey,
        source_id: input.processorToken,
        customer_id: input.customerId,
        amount_money: { amount: cents(input.amount), currency: 'USD' },
        autocomplete: true,
        note: `Full service — job ${input.jobId}`,
      })
      const cardDetails = p.payment?.card_details?.card ?? {}
      return {
        processorRef: p.payment.id,
        amount: input.amount,
        cardTypeAtCharge: (cardDetails.card_type ?? 'UNKNOWN') as CardType,
        status: p.payment.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
      }
    } catch (e: any) {
      return { processorRef: '', amount: input.amount, cardTypeAtCharge: 'UNKNOWN', status: 'FAILED', failureReason: String(e?.message ?? e) }
    }
  }

  async chargeTip(input: TipInput): Promise<ChargeResult> {
    const p = await sq('/v2/payments', 'POST', {
      idempotency_key: input.idempotencyKey,
      source_id: input.processorToken,
      customer_id: input.customerId,
      amount_money: { amount: cents(input.amount), currency: 'USD' },
      autocomplete: true,
      note: `Tip (100% to cleaner) — job ${input.jobId}`,
    })
    return { processorRef: p.payment.id, amount: input.amount, cardTypeAtCharge: 'CREDIT', status: p.payment.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED' }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const r = await sq('/v2/refunds', 'POST', {
      idempotency_key: input.idempotencyKey,
      payment_id: input.processorRef,
      amount_money: { amount: cents(input.amount), currency: 'USD' },
      reason: input.reason,
    })
    return { refundRef: r.refund.id, status: r.refund.status === 'COMPLETED' ? 'COMPLETED' : r.refund.status === 'PENDING' ? 'PENDING' : 'FAILED' }
  }

  async onWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent> {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL || ''
    const provided = headers['x-square-hmacsha256-signature'] || headers['X-Square-HmacSha256-Signature'] || ''
    const expected = createHmac('sha256', signatureKey).update(notificationUrl + body).digest('base64')
    if (!signatureKey || provided !== expected) throw new Error('Invalid Square webhook signature')
    const raw = JSON.parse(body)
    return {
      type: raw?.type ?? 'unknown',
      paymentRef: raw?.data?.object?.payment?.id,
      status: raw?.data?.object?.payment?.status,
      raw,
    }
  }
}
