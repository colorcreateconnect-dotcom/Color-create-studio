/* A photo moment, recorded.
 *
 * The file itself goes straight from the phone to Storage — a Netlify function
 * is the wrong place to pass several megabytes through, and the storage policy
 * already refuses a key outside the uploader's own studio folder. What this does
 * is the part that has to be trustworthy: confirm the person is actually on this
 * clean, hang the photo off the right checklist step, and file the `photos` row
 * with the fields that are not the browser's to choose.
 *
 * Two of those fields are never taken from the request. `marketing_consent` is
 * always false — consent is a later, explicit act by the home's owner, never a
 * side effect of a cleaner taking a picture. And the photo's kind comes from the
 * checklist phase the step sits in, not from whoever is holding the phone, so a
 * 'before' shot cannot be filed as an 'after' and slip out of the rule that a
 * before shot is never published. */
import { sbSelect, sbInsert, sbUpdate, json } from './_shared/db'
import { requireCaller, canActOnJob, isStaff } from './_shared/auth'
import { photoKindFor, orgOfPhotoKey } from '../../src/lib/photo'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }
  const { jobId, stepRowId, storageKey, takenAt, lat, lng } = body

  if (!jobId || !stepRowId || !storageKey) {
    return json(400, { error: 'jobId, stepRowId and storageKey are required' })
  }

  const [job] = await sbSelect('jobs', `id=eq.${jobId}&select=id,org_id,owner_id,property_id,cleaner_id,created_by,status`)
  if (!job) return json(404, { error: 'No such clean', code: 'NO_JOB' })

  /* Taking the photo is the cleaner's job. A client can read their own proof
     (it is their evidence) but must not be able to file it — a photo nobody
     independent took is not proof of anything. */
  if (!isStaff(caller) || !canActOnJob(caller, job)) {
    return json(403, { error: 'Only the cleaner on this job can add its photos', code: 'FORBIDDEN' })
  }

  /* The key decides which studio's folder the file went into. If it doesn't
     match this job's organization then either the client is confused or someone
     is filing a photo of one studio's home against another's job. */
  if (orgOfPhotoKey(storageKey) !== job.org_id) {
    return json(400, { error: 'That photo was not stored against this clean', code: 'KEY_MISMATCH' })
  }

  const [step] = await sbSelect('job_steps', `id=eq.${stepRowId}&select=id,job_id,step_id,phase_title,photo_required,photo_key`)
  if (!step || step.job_id !== job.id) {
    return json(404, { error: 'No such checklist step on this clean', code: 'NO_STEP' })
  }

  // The phase is what makes it a before shot or an after shot.
  const kind = photoKindFor(step.phase_title)
  const capturedAt = typeof takenAt === 'string' && !Number.isNaN(Date.parse(takenAt))
    ? takenAt
    : new Date().toISOString()
  const num = (x: any) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

  try {
    await sbUpdate('job_steps', `id=eq.${stepRowId}`, {
      photo_key: storageKey,
      photo_taken_at: capturedAt,
      photo_lat: num(lat),
      photo_lng: num(lng),
    })

    const [photo] = await sbInsert('photos', [{
      org_id: job.org_id,
      property_id: job.property_id ?? null,
      owner_id: job.owner_id ?? null,
      job_id: job.id,
      step_id: step.step_id ?? null,
      storage_key: storageKey,
      kind,
      captured_at: capturedAt,
      captured_lat: num(lat),
      captured_lng: num(lng),
      // Never from the request. The database also refuses it for a 'before'.
      marketing_consent: false,
    }])

    return json(200, {
      ok: true,
      photoId: photo?.id ?? null,
      kind,
      /* Said back plainly, because the promise is part of the product: this
         picture is not marketing and is not publicly linkable. */
      marketingConsent: false,
      replacedEarlierPhoto: !!step.photo_key,
    })
  } catch (e: any) {
    return json(500, { error: 'Could not save that photo: ' + (e?.message || 'unknown error') })
  }
}
