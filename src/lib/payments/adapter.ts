/* Thin payment-processor adapter. Phase 1 is Square (Ahleyia already runs her
 * business on it — do NOT migrate her). Everything else in the app talks to
 * THIS interface, so a marketplace processor (likely Stripe Connect) can be
 * swapped in when the first outside cleaner joins and real third-party payouts
 * begin — re-verify capabilities against current docs at that time.
 *
 * The processor secret can charge cards, so it lives ONLY in Netlify env vars
 * and is used ONLY inside functions. It never reaches the browser: the client
 * tokenizes the card with the Square Web Payments SDK and posts the token here.
 */
import type { CardMeta } from './cards'

export interface SaveCardInput {
  ownerId: string
  cardToken: string // single-use token from the Web Payments SDK (client-side)
  buyerCustomerId?: string
}
export interface SavedCard {
  processorToken: string // durable card-on-file id
  customerId: string
  meta: CardMeta
}

export interface CaptureInput {
  jobId: string
  processorToken: string
  customerId: string
  amount: number // full service amount, one charge
  idempotencyKey: string
}
export interface ChargeResult {
  processorRef: string // payment id
  amount: number
  cardTypeAtCharge: CardMeta['cardType']
  status: 'COMPLETED' | 'FAILED'
  failureReason?: string
}

export interface TipInput {
  jobId: string
  processorToken: string
  customerId: string
  amount: number // separate charge, 100% to the cleaner
  idempotencyKey: string
}

export interface RefundInput {
  processorRef: string
  amount: number
  idempotencyKey: string
  reason?: string
}
export interface RefundResult { refundRef: string; status: 'COMPLETED' | 'PENDING' | 'FAILED' }

export interface WebhookEvent {
  type: string
  paymentRef?: string
  status?: string
  raw: unknown
}

export interface PaymentAdapter {
  readonly name: string
  saveCard(input: SaveCardInput): Promise<SavedCard>
  getCardMeta(processorToken: string, customerId: string): Promise<CardMeta>
  captureFull(input: CaptureInput): Promise<ChargeResult>
  chargeTip(input: TipInput): Promise<ChargeResult>
  refund(input: RefundInput): Promise<RefundResult>
  /** Verify signature + normalize a processor webhook payload. */
  onWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent>
}

/* ---------------------------------------------------------- mock impl -- */
/* Deterministic in-memory adapter for local dev / tests / sandbox runs where no
 * SQUARE_ACCESS_TOKEN is present. Mirrors the real contract, including the
 * CREDIT-only check and a way to simulate a declined capture. */
export class MockAdapter implements PaymentAdapter {
  readonly name = 'mock'
  private seq = 0
  private id(p: string) { return `${p}_${(++this.seq).toString(36)}` }

  async saveCard(input: SaveCardInput): Promise<SavedCard> {
    // token convention lets tests drive brand/type: "tok:VISA:CREDIT:4242"
    const [, brand = 'VISA', cardType = 'CREDIT', last4 = '4242'] = input.cardToken.split(':')
    return {
      processorToken: this.id('card'),
      customerId: input.buyerCustomerId ?? this.id('cus'),
      meta: { brand, last4, cardType: cardType as CardMeta['cardType'] },
    }
  }
  async getCardMeta(): Promise<CardMeta> {
    return { brand: 'VISA', last4: '4242', cardType: 'CREDIT' }
  }
  async captureFull(input: CaptureInput): Promise<ChargeResult> {
    if (input.processorToken.includes('decline')) {
      return { processorRef: this.id('pay'), amount: input.amount, cardTypeAtCharge: 'CREDIT', status: 'FAILED', failureReason: 'CARD_DECLINED' }
    }
    return { processorRef: this.id('pay'), amount: input.amount, cardTypeAtCharge: 'CREDIT', status: 'COMPLETED' }
  }
  async chargeTip(input: TipInput): Promise<ChargeResult> {
    return { processorRef: this.id('tip'), amount: input.amount, cardTypeAtCharge: 'CREDIT', status: 'COMPLETED' }
  }
  async refund(input: RefundInput): Promise<RefundResult> {
    return { refundRef: this.id('ref'), status: 'COMPLETED' }
  }
  async onWebhook(_h: Record<string, string>, body: string): Promise<WebhookEvent> {
    const raw = (() => { try { return JSON.parse(body) } catch { return {} } })()
    return { type: (raw as any)?.type ?? 'unknown', raw }
  }
}
