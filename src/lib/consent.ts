/* Recorded payment authorization. The exact consent text is stored with a
 * version + timestamp at card save, so the later card-on-file capture (owner
 * not present) is authorized, and so a chargeback can be defended with the
 * timestamped authorization. Bump CONSENT_VERSION whenever the wording changes;
 * old records keep the version they agreed to. */

export const CONSENT_VERSION = '2026-07-01'

export const CONSENT_TEXT =
  'I authorize She’s Maid In ATL to charge my card for the full service amount ' +
  'on arrival. Ahleyia is paid 50% on arrival and 50% on my approval; if I don’t ' +
  'respond within 48 hours the balance releases automatically. Tips are charged ' +
  'separately.'

export interface ConsentRecord {
  version: string
  text: string
  agreed: boolean
  agreedAt: string // ISO timestamp
  ipHint?: string // coarse client hint captured server-side, optional
  userAgent?: string
}

/** Build the immutable consent record to persist alongside the saved card. */
export function makeConsent(agreedAtIso: string, meta?: { ipHint?: string; userAgent?: string }): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    text: CONSENT_TEXT,
    agreed: true,
    agreedAt: agreedAtIso,
    ipHint: meta?.ipHint,
    userAgent: meta?.userAgent,
  }
}

/** A saved card without recorded consent may never be charged while absent. */
export function consentIsValid(c: ConsentRecord | null | undefined): boolean {
  return !!c && c.agreed === true && !!c.agreedAt && !!c.version
}
