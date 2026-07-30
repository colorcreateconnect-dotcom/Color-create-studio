/* Sending a photo to Storage, straight from the phone.
 *
 * The file goes browser → Supabase Storage, not through a Netlify function: a
 * function would have to hold several megabytes of base64 in memory and would
 * add a hop for no gain. The upload carries the person's own token, so the
 * bucket's policy is what decides whether it is allowed — it accepts a key only
 * inside the uploader's own studio folder (migration 0012).
 *
 * Recording *that* the photo exists is a separate, small call to `attach-photo`,
 * which is where the fields that must not be the browser's to choose get set. An
 * upload with no attach leaves an orphan file in a private bucket and no row
 * pointing at it — nothing is shown, nothing leaks. */
import { supabaseUrl, supabaseAnonKey } from './config'
import { accessToken } from './supabase'

const BUCKET = 'proof'

export class UploadError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message); this.name = 'UploadError'; this.status = status
  }
}

/** Put the file at this exact key. The key must have come from photoKeyFor —
 *  its first segment is what the storage policy checks. */
export async function uploadProof(key: string, file: Blob, contentType?: string): Promise<{ key: string }> {
  const base = supabaseUrl()
  const tok = accessToken()
  if (!base) throw new UploadError('No storage configured', 0)
  if (!tok) throw new UploadError('Sign in to add a photo', 401)

  let res: Response
  try {
    res = await fetch(`${base}/storage/v1/object/${BUCKET}/${encodeKey(key)}`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey(),
        Authorization: `Bearer ${tok}`,
        'Content-Type': contentType || (file as any).type || 'application/octet-stream',
        // Never replace an existing object. A retaken photo gets its own key, so
        // a second attempt can't quietly stand in for the first.
        'x-upsert': 'false',
      },
      body: file,
    })
  } catch (e: any) {
    throw new UploadError(e?.message || 'Network error', 0)
  }

  if (!res.ok) {
    const data: any = await res.json().catch(() => ({}))
    throw new UploadError(data?.message || data?.error || `Upload failed (${res.status})`, res.status)
  }
  return { key }
}

/** Slashes are the folder structure and must survive; everything else is escaped. */
const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/')
