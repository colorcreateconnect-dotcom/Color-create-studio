/* Card acceptance policy: MAJOR CREDIT CARDS ONLY. Debit and prepaid are
 * rejected — it protects both sides from fraud, and card-on-file capture while
 * the owner isn't present is far safer on credit. Square exposes card_type
 * (CREDIT | DEBIT | UNKNOWN) and prepaid_type; we reject anything not CREDIT,
 * and re-check at charge time (a card can be re-classified). */

export type CardType = 'CREDIT' | 'DEBIT' | 'UNKNOWN'
export type PrepaidType = 'PREPAID' | 'NOT_PREPAID' | 'UNKNOWN'

export interface CardMeta {
  brand: string // VISA | MASTERCARD | AMERICAN_EXPRESS | DISCOVER | ...
  last4: string
  expMonth?: number
  expYear?: number
  cardType: CardType
  prepaidType?: PrepaidType
}

export const ACCEPTED_BRANDS = ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER'] as const

export interface CardDecision {
  accepted: boolean
  reason?: string
}

/**
 * The single source of truth for whether a card may be saved or charged.
 * UNKNOWN card_type is rejected: we cannot prove it's credit, and the whole
 * model depends on a real credit card being on file.
 */
export function evaluateCard(meta: CardMeta): CardDecision {
  if (meta.prepaidType === 'PREPAID') {
    return { accepted: false, reason: 'Prepaid cards aren’t accepted — it protects both sides from fraud.' }
  }
  if (meta.cardType === 'DEBIT') {
    return { accepted: false, reason: 'Debit cards aren’t accepted — please use a major credit card.' }
  }
  if (meta.cardType !== 'CREDIT') {
    return { accepted: false, reason: 'We couldn’t confirm this is a credit card. Please use Visa, Mastercard, Amex or Discover.' }
  }
  const brand = (meta.brand || '').toUpperCase()
  if (!ACCEPTED_BRANDS.includes(brand as (typeof ACCEPTED_BRANDS)[number])) {
    return { accepted: false, reason: 'Please use Visa, Mastercard, Amex or Discover.' }
  }
  return { accepted: true }
}
