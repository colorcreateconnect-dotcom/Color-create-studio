/* Proof photos: where they live, what they may be, and how big.
 *
 * These are pictures of the inside of people's homes. The rules around them are
 * a brand promise before they are a technical detail (migration 0003): private
 * to the servicing studio and that property's owner, never publicly linkable,
 * never reused as marketing, and a 'before' shot never published at all. This
 * module holds the parts of that which are pure decisions, so they can be
 * asserted rather than trusted.
 *
 * The object key carries the organization as its first segment. Storage
 * policies read that segment, so a key is not merely a name — it is what scopes
 * one studio's photos away from another's. Everything that builds one goes
 * through here. */

export type PhotoKind = 'before' | 'staging' | 'after' | 'maintenance' | 'receipt' | 'portfolio'

/** Phone cameras produce a few megabytes; anything far past that is either a
 *  mistake or someone pushing. Checked before the upload starts so a person on
 *  a phone finds out immediately rather than after a long transfer. */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024

/** What a camera actually produces. Deliberately not a wide list: an upload is
 *  a photo of a room, not an arbitrary file, and every extra type accepted is
 *  another thing the storage bucket has to serve. */
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

/** The file extension for a MIME type, or null if we don't accept it. */
export function extFor(mime: unknown): string | null {
  if (typeof mime !== 'string') return null
  return TYPES[mime.toLowerCase().trim()] || null
}

export interface PhotoCheck { ok: boolean; reason?: 'empty' | 'type' | 'size'; ext?: string }

/** Is this file something we can take? Returns the reason when not, so the UI
 *  can say which of the three it was. */
export function checkPhoto(file: { size?: number; type?: string } | null | undefined): PhotoCheck {
  if (!file || !file.size) return { ok: false, reason: 'empty' }
  const ext = extFor(file.type)
  if (!ext) return { ok: false, reason: 'type' }
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: 'size' }
  return { ok: true, ext }
}

export const PHOTO_REJECT_MESSAGE: Record<'empty' | 'type' | 'size', string> = {
  empty: 'That file was empty — try taking the photo again.',
  type: 'Photos only — a picture from your camera.',
  size: 'That photo is too large. Your camera’s normal setting is fine.',
}

/** Which moment of the clean this is.
 *
 *  The Kee Method's phases decide it, not the person taking it: the shots in
 *  the first phase document what was there before anyone touched it, and those
 *  can never be published (the database enforces that too). Anything at the end
 *  is the finished room. */
export function photoKindFor(phaseTitle: unknown): PhotoKind {
  const t = String(phaseTitle ?? '').toLowerCase()
  if (!t) return 'after'
  if (/before|document|assess|walk-?through|arrival/.test(t)) return 'before'
  if (/stag|style|dress|final touch/.test(t)) return 'staging'
  if (/maintenance|repair|damage|issue/.test(t)) return 'maintenance'
  return 'after'
}

/** True when this photo may never carry marketing consent, whatever anyone
 *  later ticks. Mirrors the database's own constraint. */
export const isNeverMarketable = (kind: PhotoKind) => kind === 'before'

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Where the file goes: `<org>/<job>/<step>-<nonce>.<ext>`.
 *
 *  The organization comes first because the storage policy reads that segment
 *  to decide who may write here — a key built any other way would be writable
 *  by the wrong studio. Ids are checked to be uuids so nothing can walk out of
 *  its folder with a `..` or a slash. The nonce keeps a retaken photo from
 *  overwriting the first attempt, which matters when the first one is the
 *  evidence and the second is the argument. */
export function photoKeyFor(input: {
  orgId: string; jobId: string; stepId: string; ext: string; nonce: string
}): string {
  const { orgId, jobId, stepId, ext, nonce } = input
  for (const [name, val] of [['orgId', orgId], ['jobId', jobId], ['stepId', stepId]] as const) {
    if (!UUID.test(String(val || ''))) throw new Error(`photoKeyFor: ${name} must be a uuid`)
  }
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg'
  const safeNonce = String(nonce || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'x'
  return `${orgId}/${jobId}/${stepId}-${safeNonce}.${safeExt}`
}

/** The organization a key belongs to, or null if it isn't one of ours. Used
 *  server-side to refuse a key that points at another studio's folder. */
export function orgOfPhotoKey(key: unknown): string | null {
  const parts = String(key ?? '').split('/')
  if (parts.length !== 3) return null
  return UUID.test(parts[0]) ? parts[0] : null
}

/** Steps that were supposed to be photographed and weren't.
 *
 *  The owner's report says the clean was documented. If a photo moment can be
 *  ticked past without a picture, that sentence stops being true — so closing a
 *  clean checks this, not just whether every box is ticked. */
export function missingProof<T extends { photoRequired?: boolean; photoKey?: string | null }>(rows: T[]): T[] {
  return (rows || []).filter((r) => !!r?.photoRequired && !r?.photoKey)
}

/** A random-enough nonce without pulling in a dependency. Not a secret — it
 *  only has to stop two photos of the same step from colliding. */
export function photoNonce(rand: () => number = Math.random): string {
  return Math.floor(rand() * 0xffffffff).toString(36) + Math.floor(rand() * 0xffffffff).toString(36)
}
