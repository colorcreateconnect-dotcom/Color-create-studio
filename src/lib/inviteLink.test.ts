/* Reading an invitation out of whatever landed in the person's hands.
 *
 * A cleaner she just hired is trying to get into the app for the first time. If
 * this is wrong they either can't get in, or a garbage token goes to the server
 * and burns their one link. */
import { describe, it, expect } from 'vitest'
import { parseInviteInput, INVITE_PARSE_MESSAGE } from './inviteLink'

const TOKEN = 'a'.repeat(64)

describe('parseInviteInput', () => {
  it('takes the whole link she sent', () => {
    expect(parseInviteInput(`https://shesmaidinatl.com/?invite=${TOKEN}`)).toEqual({ ok: true, token: TOKEN })
  })

  it('takes a link a chat app decorated with tracking parameters', () => {
    expect(parseInviteInput(`https://shesmaidinatl.com/?utm_source=sms&invite=${TOKEN}&utm_medium=text`))
      .toEqual({ ok: true, token: TOKEN })
    expect(parseInviteInput(`https://shesmaidinatl.com/?invite=${TOKEN}#top`))
      .toEqual({ ok: true, token: TOKEN })
  })

  it('takes the bare code, because she might have read it out', () => {
    expect(parseInviteInput(TOKEN)).toEqual({ ok: true, token: TOKEN })
  })

  it('forgives whitespace a copy-paste dragged in', () => {
    expect(parseInviteInput(`  ${TOKEN}  `)).toEqual({ ok: true, token: TOKEN })
    expect(parseInviteInput(TOKEN.slice(0, 30) + ' ' + TOKEN.slice(30))).toEqual({ ok: true, token: TOKEN })
  })

  it('decodes a percent-encoded token rather than sending it encoded', () => {
    const raw = 'abc-def_ghi.jkl'.repeat(3)
    const url = `https://x/?invite=${encodeURIComponent(raw)}`
    expect(parseInviteInput(url)).toEqual({ ok: true, token: raw })
  })

  it('rejects nothing at all', () => {
    expect(parseInviteInput('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseInviteInput('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('rejects a short code instead of sending it to the server', () => {
    expect(parseInviteInput('abc')).toEqual({ ok: false, reason: 'too-short' })
    expect(parseInviteInput('a'.repeat(19))).toEqual({ ok: false, reason: 'too-short' })
    expect(parseInviteInput('a'.repeat(20))).toEqual({ ok: true, token: 'a'.repeat(20) })
  })

  it('tells someone who pasted the wrong link that it is the wrong link', () => {
    // "too short" about a 40-character URL would just be confusing.
    expect(parseInviteInput('https://shesmaidinatl.com/')).toEqual({ ok: false, reason: 'no-token-in-link' })
    expect(parseInviteInput('https://shesmaidinatl.com/?role=cleaner')).toEqual({ ok: false, reason: 'no-token-in-link' })
  })

  it('never returns a token containing a query string', () => {
    const r = parseInviteInput(`https://x/?invite=${TOKEN}&other=1`)
    expect(r.ok && r.token.includes('&')).toBe(false)
    expect(r.ok && r.token.includes('?')).toBe(false)
  })

  it('has a message for every rejection', () => {
    for (const reason of ['empty', 'no-token-in-link', 'too-short'] as const) {
      expect(INVITE_PARSE_MESSAGE[reason]).toBeTruthy()
    }
  })
})
