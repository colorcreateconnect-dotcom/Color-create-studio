/* Concierge tier — Ahleyia's second revenue line. NOT cleaning: no Kee Method
 * checklist, no photo proof, no consistency score. What matters is her time and
 * her receipts. Three decided rules shape everything here:
 *
 *  1) Concierge is openly $70/hr — the ONE place a rate is public (clients
 *     expect an hourly number for time-based work). Tracked in 15-min steps.
 *  2) Purchases are reimbursed AT COST. No markup on goods — her time is the
 *     earning. Client-facing promise: "No markup on your groceries."
 *  3) Request → she confirms. The estimate is a PLAN, never a quote: never
 *     derive a total from estimated_minutes. The price is the clock at close.
 *
 * Capture happens WHEN THE VISIT CLOSES (the amount isn't knowable until the
 * clock stops and receipts are in) — still one charge per visit. */

export const CONCIERGE_RATE = 70 // $/hr, published openly
export const CONCIERGE_INCREMENT_MIN = 15 // billed in 15-minute increments

/** Round a raw minute count to the billing increment (nearest 15). */
export function roundToIncrement(minutes: number, inc = CONCIERGE_INCREMENT_MIN): number {
  return Math.max(0, Math.round(minutes / inc) * inc)
}

/** Charge for clocked time. `minutes` must already be a 15-min multiple. */
export function conciergeTimeCharge(minutes: number): number {
  return Math.round((minutes / 60) * CONCIERGE_RATE * 100) / 100
}

export interface Reimbursable {
  label: string
  amount: number
  /** A receipt photo is REQUIRED — an expense without one cannot be added. */
  hasReceipt: boolean
}

export interface ConciergeVisitTotal {
  timeCharge: number
  reimbursed: number // passed through at cost
  markup: 0 // always zero — no markup on goods
  total: number
}

/** Split a visit into her time vs. what was passed through. Reimbursables
 * without a receipt are rejected (the photo is the owner's proof and the
 * cleaner's protection). */
export function conciergeVisitTotal(input: { minutes: number; reimbursables: Reimbursable[] }): ConciergeVisitTotal {
  const bad = input.reimbursables.find((r) => !r.hasReceipt)
  if (bad) throw new Error(`Reimbursable "${bad.label}" has no receipt photo — no receipt, no reimbursement.`)
  const timeCharge = conciergeTimeCharge(input.minutes)
  const reimbursed = Math.round(input.reimbursables.reduce((n, r) => n + r.amount, 0) * 100) / 100
  return { timeCharge, reimbursed, markup: 0, total: Math.round((timeCharge + reimbursed) * 100) / 100 }
}

/** Live time is ADDITIVE ONLY from the client. The owner may extend (+15/+30)
 * but can NEVER reduce; a client-originated decrease is rejected outright (the
 * API must not rely on the UI hiding a decrement control). */
export function applyExtension(currentMinutes: number, deltaMinutes: number, origin: 'cleaner' | 'owner'): number {
  if (origin === 'owner' && deltaMinutes < 0) {
    throw new Error('The visit time can only be extended, never reduced.')
  }
  return Math.max(0, currentMinutes + deltaMinutes)
}

/* ------------------------------------------------ line items → capture -- */

export type LineItemKind = 'service' | 'add_on' | 'concierge_time' | 'reimbursable' | 'tip'
export interface LineItem { kind: LineItemKind; label: string; amount: number; receiptPhotoId?: string }

/** The capture amount IS the sum of a job's non-tip line items — never a stored
 * total that can drift. Reimbursables must carry a receipt photo id. */
export function captureAmountFromLineItems(items: LineItem[]): number {
  for (const it of items) {
    if (it.kind === 'reimbursable' && !it.receiptPhotoId) {
      throw new Error(`Reimbursable "${it.label}" is missing its receipt photo.`)
    }
  }
  const sum = items.filter((i) => i.kind !== 'tip').reduce((n, i) => n + i.amount, 0)
  return Math.round(sum * 100) / 100
}

/* ------------------------------------------- service catalogue + curves -- */

export type PricingKind = 'flat' | 'hourly' | 'tiered' | 'package' | 'quote'
export interface ServiceLine { key: string; label: string; pricing: PricingKind; conciergeMoneyPath?: boolean }

/** Her full catalogue as service lines (Residential · Commercial · Coaching).
 * Cleaning lines price via the cleaning engines; concierge lines use this
 * module's money path; coaching is packaged/hourly (seed of the network business). */
export const SERVICE_LINES: ServiceLine[] = [
  { key: 'airbnb_turnover', label: 'Airbnb turnover', pricing: 'tiered' },
  { key: 'residential_clean', label: 'Residential clean', pricing: 'quote' },
  { key: 'deep_clean', label: 'Deep clean', pricing: 'quote' },
  { key: 'reset_organization', label: 'Reset & organization', pricing: 'quote' },
  { key: 'move_out', label: 'Move-out / moving day', pricing: 'quote' },
  { key: 'window_cleaning', label: 'Window cleaning', pricing: 'quote' },
  { key: 'laundry_service', label: 'Laundry service', pricing: 'flat' },
  { key: 'commercial_cleaning', label: 'Commercial cleaning', pricing: 'quote' },
  { key: 'concierge', label: 'Concierge / Luxury Lifestyle Support', pricing: 'hourly', conciergeMoneyPath: true },
  { key: 'co_hosting', label: 'Co-hosting support', pricing: 'hourly', conciergeMoneyPath: true },
  { key: 'coaching', label: 'The Kee Method™ coaching', pricing: 'package' },
]

/** Reset/organization is slower per sq ft than cleaning, so it needs its own
 * curve — reusing the cleaning estimate would underprice her. ~300 sq ft/hr
 * (vs. cleaning's ~445), floored at 2h, rounded to the half hour. Hours feed
 * the residential engine; the result is still one flat quoted number. */
export function estimateResetHours(sqft: number): number {
  const raw = Math.max(2, sqft / 300)
  return Math.round(raw * 2) / 2
}
