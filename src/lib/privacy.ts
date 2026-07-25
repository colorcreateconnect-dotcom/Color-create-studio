/* Price privacy — a HARD rule, enforced at the serialization boundary, not just
 * in the UI. The nuance (CODE-UPDATE §4A): published price ≠ exposed margin.
 *
 *  PRIVATE  — the CLEANING cost math that would let a client compute what she
 *             nets per hour: the $50/hr floor, estimated hours, hours×rate, the
 *             comfort round-up, and assistant splits. Owner endpoints must not
 *             return these; a client with dev tools finds nothing. Also strip
 *             a clean's duration (a derived leak next to its price).
 *  PUBLIC   — legitimately published pricing is NOT stripped: flat per-service
 *             cleaning prices, and the CONCIERGE hourly rate ($70/hr) with its
 *             billed time. Concierge is time-based and clients expect an hourly
 *             number, so those fields use their own names (conciergeRate,
 *             billedMinutes, timeCharge…) and pass straight through.
 */

/** CLEANING-derivation field names that must never reach a client surface. */
export const PRIVATE_FIELDS = [
  'rate', 'hourlyRate', 'hours', 'estimatedHours', 'base', 'baseAmount',
  'comfortRoundUp', 'multiplier', 'assistant', 'assistantSplit', 'assistantPay',
  'businessKeeps', 'split', 'splitPct', 'internalNotes', 'timeGuide',
  'durationMinutes', 'duration', 'startedAt', 'finishedAt', 'gpsCheckin',
  'costBasis', 'margin',
] as const

/** Published, client-safe price fields — documented so nobody "tidies" them into
 *  a private name. Concierge's hourly rate is the one place a rate is public. */
export const PUBLISHED_PRICE_FIELDS = [
  'clientAmount', 'clientNumber', 'publishedPrice', 'conciergeRate',
  'billedMinutes', 'timeCharge', 'reimbursedAmount', 'ecoFinishPrice',
] as const

type AnyRecord = Record<string, unknown>

/** Deep-strip private fields from a plain object/array for owner/public output. */
export function stripForClient<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripForClient(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: AnyRecord = {}
    for (const [k, v] of Object.entries(value as AnyRecord)) {
      if ((PRIVATE_FIELDS as readonly string[]).includes(k)) continue
      out[k] = stripForClient(v)
    }
    return out as T
  }
  return value
}

/** The one number a client may see, formatted as the boutique flat quote. */
export function clientQuoteLabel(clientNumber: number): string {
  return `Tailored housekeeping service — $${clientNumber}`
}

/** Assert (in tests / dev) that a payload is safe to send to a client. */
export function assertClientSafe(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertClientSafe(v, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as AnyRecord)) {
      if ((PRIVATE_FIELDS as readonly string[]).includes(k)) {
        throw new Error(`Price-privacy leak: "${k}" present at ${path}`)
      }
      assertClientSafe(v, `${path}.${k}`)
    }
  }
}
