/* Outbound SMS rules. Texting people is regulated and easy to get wrong, so the
 * consent gate and number handling are asserted directly rather than trusted to
 * each call site. */
import { describe, it, expect } from 'vitest'
import { toE164, mayText, MSG, smsConfigured } from '../../netlify/functions/_shared/sms'

describe('toE164', () => {
  it('assumes US for a bare 10-digit number', () => {
    expect(toE164('4045550134')).toBe('+14045550134')
    expect(toE164('(404) 555-0134')).toBe('+14045550134')
  })
  it('handles a leading 1', () => expect(toE164('1-404-555-0134')).toBe('+14045550134'))
  it('keeps an explicit country code', () => expect(toE164('+447911123456')).toBe('+447911123456'))
  it('rejects nothing usable', () => {
    expect(toE164('')).toBeNull()
    expect(toE164('abc')).toBeNull()
    expect(toE164('123')).toBeNull()
  })
})

describe('mayText — nobody is texted without consent', () => {
  const phone = '+14045550134'

  it('allows a consenting client with a number', () => {
    expect(mayText({ sms_consent: true, phone })).toEqual({ ok: true })
  })
  it('refuses without recorded consent', () => {
    expect(mayText({ sms_consent: false, phone })).toEqual({ ok: false, reason: 'no_consent' })
    expect(mayText({ phone })).toEqual({ ok: false, reason: 'no_consent' })
  })
  it('refuses an unknown person', () => {
    expect(mayText(null)).toEqual({ ok: false, reason: 'no_consent' })
  })
  it('OPT-OUT BEATS CONSENT — a STOP reply always wins', () => {
    expect(mayText({ sms_consent: true, sms_opted_out: true, phone }))
      .toEqual({ ok: false, reason: 'opted_out' })
  })
  it('refuses when there is no usable number', () => {
    expect(mayText({ sms_consent: true, phone: null })).toEqual({ ok: false, reason: 'no_number' })
    expect(mayText({ sms_consent: true, phone: 'not a number' })).toEqual({ ok: false, reason: 'no_number' })
  })
})

describe('sending is inert without credentials', () => {
  it('reports not configured rather than throwing', () => {
    // No TWILIO_* in the test environment.
    expect(smsConfigured()).toBe(false)
  })
})

describe('message copy', () => {
  it('always names the studio and offers a way out', () => {
    const all = [
      MSG.invite('Mrs. Ridgeview', 'https://x/?invite=t'),
      MSG.onArrival('Ridgeview Home', 380),
      MSG.cardDeclined('Ridgeview Home'),
      MSG.finalReleased('Ridgeview Home', 190),
      MSG.tipReceived(25),
      MSG.autoReleasedOwner('Ridgeview Home'),
      MSG.autoReleasedCleaner(190),
    ]
    for (const m of all) {
      expect(m).toContain('She’s Maid In ATL')
      expect(m).toMatch(/Reply STOP/)
    }
  })

  it('formats money to cents and includes the link in the invite', () => {
    expect(MSG.onArrival('Home', 380)).toContain('$380.00')
    expect(MSG.tipReceived(25.5)).toContain('$25.50')
    expect(MSG.invite('Ann', 'https://x/?invite=abc')).toContain('https://x/?invite=abc')
  })

  it('says plainly that a declined card charged nothing', () => {
    expect(MSG.cardDeclined('Home')).toMatch(/nothing was charged/i)
  })
})
