/* Two pricing engines, exactly to the founder's spec.
 *
 * PRICE PRIVACY: nothing in here is client-safe on its own. Only the
 * `clientNumber` field of a result may ever cross an owner-facing boundary —
 * hours, rate, base, comfort round-up and the assistant split are internal.
 * Owner-facing API serializers strip everything else (see privacy.ts).
 */

/* ------------------------------------------------------------- Airbnb -- */

export type Staging = 'light' | 'standard' | 'heavy'

export interface AirbnbTier {
  key: string
  label: string
  minBeds: number // inclusive lower bound on bedroom count
  min: number // range floor ($)
  max: number // range ceiling ($) — equals min for the open "from" tier
  open: boolean // true for "from $X" (4BR+)
  timeGuide: string // internal — drives routing only, never shown to clients
}

/** Tiers as published on the storefront. Locked numbers — do not "tidy". */
export const AIRBNB_TIERS: AirbnbTier[] = [
  { key: 'studio_1', label: 'Studio – 1 Bedroom', minBeds: 0, min: 95, max: 125, open: false, timeGuide: '1–2h' },
  { key: 'br2', label: '2 Bedroom', minBeds: 2, min: 125, max: 160, open: false, timeGuide: '2–3h' },
  { key: 'br3', label: '3 Bedroom', minBeds: 3, min: 160, max: 185, open: false, timeGuide: '3–4h' },
  { key: 'br4', label: '4+ Bedroom', minBeds: 4, min: 185, max: 185, open: true, timeGuide: '4–5h+' },
]

export function tierForBeds(beds: number): AirbnbTier {
  // Highest tier whose minBeds the property meets.
  let match = AIRBNB_TIERS[0]
  for (const t of AIRBNB_TIERS) if (beds >= t.minBeds) match = t
  return match
}

export interface AirbnbQuote {
  tier: AirbnbTier
  staging: Staging
  /** the single tailored number a client sees */
  clientNumber: number
  /** published range label, e.g. "$125–160" or "from $185" */
  rangeLabel: string
}

/**
 * Airbnb turnover auto-quote from detected bedroom count. A Light/Standard/Heavy
 * staging modifier moves within the tier's range; Standard (mid) is the default.
 * Mid uses floor so a 2BR Standard is $142 exactly as shipped (125→142→160).
 */
export function airbnbQuote(beds: number, staging: Staging = 'standard'): AirbnbQuote {
  const tier = tierForBeds(beds)
  const mid = Math.floor((tier.min + tier.max) / 2)
  const clientNumber = staging === 'light' ? tier.min : staging === 'heavy' ? tier.max : mid
  const rangeLabel = tier.open ? `from $${tier.min}` : `$${tier.min}–${tier.max}`
  return { tier, staging, clientNumber, rangeLabel }
}

/**
 * Same-day turnovers can't wait on on-site laundry, so a second linen set must
 * be on site. On-site laundry is otherwise included; outdoor work never is.
 */
export function requiresSecondLinenSet(sameDayTurnover: boolean): boolean {
  return sameDayTurnover === true
}

/* -------------------------------------------------------- Residential -- */

export const RATE_STANDARD = 50 // $/hr — hard floor, never suggest below hours×rate
export const RATE_DEEP = 65 // $/hr — deep clean
export const ASSISTANT_PCT = 0.4 // 40% of the job…
export const ASSISTANT_FLOOR = 50 // …with a $50 floor

export interface ResidentialQuote {
  rate: number
  hours: number
  /** hours × rate — the hard floor */
  base: number
  /** comfort round-up: max(base+10, roundTo5(base × 1.12)) */
  final: number
  /** the single tailored number a client sees === final */
  clientNumber: number
  assistant?: { pay: number; businessKeeps: number; pct: number }
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5

/**
 * Residential internal engine. Hours are estimated from scope elsewhere
 * (benchmark: 2,000 sq ft main level ≈ 4–5h). Comfort round-up: base × 1.12
 * rounded to the nearest $5, with a minimum of +$10 over base. Ahleyia can
 * still edit the final number; this only produces the suggested floor.
 */
export function residentialQuote(
  hours: number,
  opts: { deep?: boolean; assistant?: boolean } = {},
): ResidentialQuote {
  const rate = opts.deep ? RATE_DEEP : RATE_STANDARD
  const base = rate * hours
  const final = Math.max(base + 10, roundTo5(base * 1.12))
  const q: ResidentialQuote = { rate, hours, base, final, clientNumber: final }
  if (opts.assistant) {
    const pay = Math.max(ASSISTANT_FLOOR, Math.round(final * ASSISTANT_PCT))
    q.assistant = { pay, businessKeeps: final - pay, pct: ASSISTANT_PCT * 100 }
  }
  return q
}

/** Assistant take on any job amount: max(40% of job, $50). */
export function assistantSplit(jobAmount: number): { pay: number; businessKeeps: number } {
  const pay = Math.max(ASSISTANT_FLOOR, Math.round(jobAmount * ASSISTANT_PCT))
  return { pay, businessKeeps: jobAmount - pay }
}

/* ------------------------------------------------------------- Eco -- */

/** Eco finish + signature scent, shown transparently as a line item. */
export const ECO_FINISH_PRICE = 8
