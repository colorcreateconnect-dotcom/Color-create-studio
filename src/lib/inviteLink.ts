/* Reading an invitation out of whatever the person pasted.
 *
 * She sends a link. By the time it reaches the person it may be the whole URL,
 * a URL a chat app wrapped in tracking parameters, or just the code because she
 * read it out. All three should work, and anything that clearly isn't a code
 * should be rejected here rather than sent to the server as a guess. */

/** How long a real token is when hex-encoded: 32 random bytes. */
const MIN_TOKEN = 20

export type InviteParse =
  | { ok: true; token: string }
  | { ok: false; reason: 'empty' | 'no-token-in-link' | 'too-short' }

export function parseInviteInput(input: string): InviteParse {
  const raw = (input || '').trim()
  if (!raw) return { ok: false, reason: 'empty' }

  const fromQuery = /[?&]invite=([^&\s#]+)/.exec(raw)
  if (fromQuery) {
    const token = safeDecode(fromQuery[1]).replace(/\s+/g, '')
    return token.length >= MIN_TOKEN ? { ok: true, token } : { ok: false, reason: 'too-short' }
  }

  // A link with no invite parameter is a wrong link, not a short code — saying
  // "too short" about a 60-character URL would just be confusing.
  if (/^https?:\/\//i.test(raw) || raw.includes('/')) return { ok: false, reason: 'no-token-in-link' }

  const token = raw.replace(/\s+/g, '')
  return token.length >= MIN_TOKEN ? { ok: true, token } : { ok: false, reason: 'too-short' }
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

export const INVITE_PARSE_MESSAGE: Record<Exclude<InviteParse, { ok: true }>['reason'], string> = {
  empty: 'Paste the link Ahleyia sent you, or the code from it.',
  'no-token-in-link': 'That link has no invitation code in it — check you copied all of it.',
  'too-short': 'That code looks too short — check you copied all of it.',
}
