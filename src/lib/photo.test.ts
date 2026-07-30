/* Proof photos.
 *
 * The object key is not just a filename — its first segment is what the storage
 * policy reads to decide which studio may write there, so a key built wrong is
 * a privacy failure rather than a cosmetic one. And a 'before' shot is the one
 * photo that may never be published, so which moment a photo belongs to has to
 * come from the checklist rather than from whoever is holding the phone. */
import { describe, it, expect } from 'vitest'
import {
  extFor, checkPhoto, photoKindFor, isNeverMarketable, photoKeyFor,
  orgOfPhotoKey, photoNonce, missingProof, MAX_PHOTO_BYTES,
} from './photo'

const ORG = '11111111-1111-4111-8111-111111111111'
const JOB = '22222222-2222-4222-8222-222222222222'
const STEP = '33333333-3333-4333-8333-333333333333'

describe('extFor', () => {
  it('takes what a phone camera actually produces', () => {
    expect(extFor('image/jpeg')).toBe('jpg')
    expect(extFor('image/png')).toBe('png')
    expect(extFor('image/heic')).toBe('heic')   // iPhone's default
    expect(extFor('IMAGE/JPEG')).toBe('jpg')
  })

  it('refuses anything that is not a picture', () => {
    expect(extFor('application/pdf')).toBeNull()
    expect(extFor('text/html')).toBeNull()
    expect(extFor('image/svg+xml')).toBeNull()  // scriptable; not a camera output
    expect(extFor('')).toBeNull()
    expect(extFor(undefined)).toBeNull()
    expect(extFor(42)).toBeNull()
  })
})

describe('checkPhoto', () => {
  it('accepts an ordinary photo', () => {
    expect(checkPhoto({ size: 2_400_000, type: 'image/jpeg' })).toEqual({ ok: true, ext: 'jpg' })
  })

  it('says which of the three things was wrong', () => {
    expect(checkPhoto({ size: 0, type: 'image/jpeg' }).reason).toBe('empty')
    expect(checkPhoto({ size: 100, type: 'application/pdf' }).reason).toBe('type')
    expect(checkPhoto({ size: MAX_PHOTO_BYTES + 1, type: 'image/jpeg' }).reason).toBe('size')
    expect(checkPhoto(null).reason).toBe('empty')
  })

  it('allows a photo exactly at the limit', () => {
    expect(checkPhoto({ size: MAX_PHOTO_BYTES, type: 'image/jpeg' }).ok).toBe(true)
  })
})

describe('photoKindFor — the checklist decides, not the photographer', () => {
  it('reads the first phase as documentation of what was there', () => {
    expect(photoKindFor('Arrival & documentation')).toBe('before')
    expect(photoKindFor('Before photos')).toBe('before')
    expect(photoKindFor('Walkthrough')).toBe('before')
  })

  it('reads staging as staging', () => {
    expect(photoKindFor('Staging & final touches')).toBe('staging')
  })

  it('treats a finished room as the after shot, including when nothing is known', () => {
    expect(photoKindFor('Detail & finish')).toBe('after')
    expect(photoKindFor(null)).toBe('after')
    expect(photoKindFor('')).toBe('after')
  })

  it('flags a damage note as maintenance', () => {
    expect(photoKindFor('Maintenance & issues')).toBe('maintenance')
  })
})

describe('isNeverMarketable', () => {
  it('holds the standing policy: a before photo is never published', () => {
    // The database carries the same rule as a check constraint; this is the
    // copy the app reasons with.
    expect(isNeverMarketable('before')).toBe(true)
    expect(isNeverMarketable('after')).toBe(false)
    expect(isNeverMarketable('staging')).toBe(false)
  })
})

describe('photoKeyFor', () => {
  it('puts the organization first, because storage reads that to scope writes', () => {
    const key = photoKeyFor({ orgId: ORG, jobId: JOB, stepId: STEP, ext: 'jpg', nonce: 'abc123' })
    expect(key).toBe(`${ORG}/${JOB}/${STEP}-abc123.jpg`)
    expect(key.split('/')[0]).toBe(ORG)
  })

  it('REFUSES an id that is not a uuid — no walking out of the folder', () => {
    expect(() => photoKeyFor({ orgId: '../other-org', jobId: JOB, stepId: STEP, ext: 'jpg', nonce: 'a' })).toThrow()
    expect(() => photoKeyFor({ orgId: ORG, jobId: 'a/b', stepId: STEP, ext: 'jpg', nonce: 'a' })).toThrow()
    expect(() => photoKeyFor({ orgId: ORG, jobId: JOB, stepId: '', ext: 'jpg', nonce: 'a' })).toThrow()
  })

  it('strips anything strange out of the nonce and the extension', () => {
    const key = photoKeyFor({ orgId: ORG, jobId: JOB, stepId: STEP, ext: '../sh', nonce: '../../etc/passwd' })
    expect(key).toBe(`${ORG}/${JOB}/${STEP}-etcpasswd.jpg`)
    expect(key.split('/')).toHaveLength(3)
  })

  it('gives a retaken photo its own key, so the first is not overwritten', () => {
    const a = photoKeyFor({ orgId: ORG, jobId: JOB, stepId: STEP, ext: 'jpg', nonce: 'one' })
    const b = photoKeyFor({ orgId: ORG, jobId: JOB, stepId: STEP, ext: 'jpg', nonce: 'two' })
    expect(a).not.toBe(b)
  })
})

describe('orgOfPhotoKey', () => {
  it('reads back the organization a key belongs to', () => {
    expect(orgOfPhotoKey(`${ORG}/${JOB}/${STEP}-a.jpg`)).toBe(ORG)
  })

  it('returns null for anything that is not one of our keys', () => {
    expect(orgOfPhotoKey('nope.jpg')).toBeNull()
    expect(orgOfPhotoKey(`${ORG}/${JOB}`)).toBeNull()
    expect(orgOfPhotoKey(`not-a-uuid/${JOB}/x.jpg`)).toBeNull()
    expect(orgOfPhotoKey(`${ORG}/${JOB}/${STEP}/extra.jpg`)).toBeNull()
    expect(orgOfPhotoKey(null)).toBeNull()
  })
})

describe('missingProof — what stops a clean being closed', () => {
  const step = (photoRequired: boolean, photoKey: string | null) => ({ photoRequired, photoKey })

  it('finds a photo moment that was ticked past without a picture', () => {
    // The tick is not the proof. The picture is.
    const rows = [step(true, null), step(true, 'k1'), step(false, null)]
    expect(missingProof(rows)).toHaveLength(1)
    expect(missingProof(rows)[0]).toBe(rows[0])
  })

  it('is empty when every photo moment has its picture', () => {
    expect(missingProof([step(true, 'k1'), step(true, 'k2'), step(false, null)])).toEqual([])
  })

  it('never demands a photo of a step that was not a photo moment', () => {
    expect(missingProof([step(false, null), step(false, null)])).toEqual([])
  })

  it('copes with an empty or absent checklist', () => {
    expect(missingProof([])).toEqual([])
    expect(missingProof(undefined as any)).toEqual([])
  })

  it('treats a blank key as no photo, not as a photo', () => {
    expect(missingProof([step(true, '')])).toHaveLength(1)
  })
})

describe('photoNonce', () => {
  it('is not empty and survives a degenerate random source', () => {
    expect(photoNonce(() => 0).length).toBeGreaterThan(0)
    expect(photoNonce(() => 0.999999)).toMatch(/^[a-z0-9]+$/)
  })

  it('differs between calls in practice', () => {
    const seen = new Set(Array.from({ length: 50 }, () => photoNonce()))
    expect(seen.size).toBeGreaterThan(40)
  })
})
