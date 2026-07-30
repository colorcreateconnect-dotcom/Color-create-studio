/* Looking at a proof photo.
 *
 * The bucket is private, so there is no URL that just works. Every view is a
 * link signed here, for a few minutes, after checking who is asking — which is
 * the only way "never publicly linkable" can actually hold. A link that leaks
 * stops working on its own.
 *
 * Who may look: the staff of the studio that did the clean, and the owner of
 * the home. Nobody else, including another client of the same studio. The
 * signing itself uses the service key, so this function — not Storage's own
 * policies — is where the client's right to see their own proof is granted. */
import { sbSelect, json } from './_shared/db'
import { requireCaller, isStaff } from './_shared/auth'

const URL_BASE = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** Short. Long enough to load a page of a report, not long enough to be worth
 *  passing around. */
const EXPIRES_SECONDS = 300

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireCaller(event)
  if ('error' in auth) return auth.error
  const { caller } = auth

  let body: any
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad JSON' }) }

  /* Asked for by id, never by key. A key is a path, and a path is guessable
     enough that accepting one would let somebody ask for a file we never told
     them about. An id has to have come from a row they were allowed to read. */
  const ids: string[] = Array.isArray(body.photoIds)
    ? body.photoIds.filter((x: any) => typeof x === 'string').slice(0, 40)
    : (typeof body.photoId === 'string' ? [body.photoId] : [])
  if (!ids.length) return json(400, { error: 'photoId or photoIds is required' })

  const list = ids.map((s) => `"${s}"`).join(',')
  const rows = await sbSelect('photos', `id=in.(${list})&select=id,org_id,owner_id,job_id,storage_key,kind,marketing_consent`)

  const mine = rows.filter((p: any) => {
    if (caller.id === p.owner_id) return true                              // their own home
    return isStaff(caller) && !!caller.orgId && caller.orgId === p.org_id  // the studio that cleaned it
  })
  // Silence rather than a 403 per photo: telling someone which ids exist but
  // are not theirs is itself something they should not learn.
  if (!mine.length) return json(403, { error: 'You don’t have access to that', code: 'FORBIDDEN' })

  const signed = await Promise.all(mine.map(async (p: any) => {
    const url = await sign(p.storage_key).catch(() => null)
    return url ? { id: p.id, kind: p.kind, url, expiresIn: EXPIRES_SECONDS } : null
  }))

  return json(200, {
    ok: true,
    photos: signed.filter(Boolean),
    /* Restated on every read, because it is the part people need to trust:
       these links die, and none of this is marketing. */
    expiresIn: EXPIRES_SECONDS,
    publiclyLinkable: false,
  })
}

/** Ask Storage for a signed path and turn it into a URL the browser can use. */
async function sign(key: string): Promise<string> {
  const res = await fetch(`${URL_BASE}/storage/v1/object/sign/proof/${encodeKey(key)}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: EXPIRES_SECONDS }),
  })
  if (!res.ok) throw new Error(`sign failed (${res.status})`)
  const data: any = await res.json()
  const path = String(data?.signedURL || data?.signedUrl || '')
  if (!path) throw new Error('no signed url returned')
  return path.startsWith('http') ? path : `${URL_BASE}/storage/v1${path.startsWith('/') ? '' : '/'}${path}`
}

/** Keep the slashes (they are the folder structure) and escape the rest. */
const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/')
