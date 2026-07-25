/* Price privacy — a HARD rule, enforced at the serialization boundary, not just
 * in the UI. Client-facing (public + owner) payloads NEVER carry hourly rates,
 * hours, hours×rate math, the comfort round-up, or any split. An owner poking
 * at dev tools must find nothing. Clients see ONE tailored flat number.
 *
 * Also guards derived leaks: a clean's duration must never appear next to its
 * price on a client-visible artifact, so we strip duration fields too. */

/** Field names that must never reach a client-facing surface. */
export const PRIVATE_FIELDS = [
  'rate', 'hourlyRate', 'hours', 'estimatedHours', 'base', 'baseAmount',
  'comfortRoundUp', 'multiplier', 'assistant', 'assistantSplit', 'assistantPay',
  'businessKeeps', 'split', 'splitPct', 'internalNotes', 'timeGuide',
  'durationMinutes', 'duration', 'startedAt', 'finishedAt', 'gpsCheckin',
  'costBasis', 'margin',
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
