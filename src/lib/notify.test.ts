/* The notification rules that must not drift.
 *
 * These are the two decisions that decide whether a person hears about their
 * clean at all — whether the notice is wanted, and what it says — so they are
 * tested directly against the server helper the functions use. */
import { describe, it, expect } from 'vitest'
import { noticeText, wants, canSendNotice, STAFF_KINDS, type NoticeKind } from '../../netlify/functions/_shared/notify'

const ALL: NoticeKind[] = [
  'on_the_way', 'arrived', 'report_ready', 'approval_due',
  'booked', 'quote_ready', 'message', 'invite_claimed', 'payout', 'supplies',
  'card_declined',
]

describe('wants — who gets a notice', () => {
  it('sends when the person has never touched a toggle', () => {
    expect(ALL.every((k) => wants({}, k))).toBe(true)
    expect(ALL.every((k) => wants(null, k))).toBe(true)
    expect(ALL.every((k) => wants(undefined, k))).toBe(true)
  })

  it('sends a NEW kind of notice rather than withholding it', () => {
    // Someone who turned supplies off years ago should still hear about a
    // clean being booked — an absent key means yes, on purpose.
    expect(wants({ supplies: false }, 'booked')).toBe(true)
  })

  it('honours an explicit opt-out', () => {
    expect(wants({ supplies: false }, 'supplies')).toBe(false)
    expect(wants({ reports: false }, 'report_ready')).toBe(false)
    expect(wants({ approvals: false }, 'approval_due')).toBe(false)
  })

  it('treats one toggle as covering the family of notices it names', () => {
    // "cleaning" is the whole arrival story, not one message of it.
    expect(wants({ cleaning: false }, 'on_the_way')).toBe(false)
    expect(wants({ cleaning: false }, 'arrived')).toBe(false)
  })

  it('only false turns something off', () => {
    expect(wants({ supplies: true }, 'supplies')).toBe(true)
    expect(wants({ supplies: 0 }, 'supplies')).toBe(true)
    expect(wants({ supplies: null }, 'supplies')).toBe(true)
  })

  it('opting out of one thing never silences another', () => {
    const off = { cleaning: false }
    expect(wants(off, 'report_ready')).toBe(true)
    expect(wants(off, 'payout')).toBe(true)
  })
})

describe('noticeText — what it says', () => {
  it('gives every kind a title', () => {
    for (const k of ALL) {
      const t = noticeText(k)
      expect(t.title, k).toBeTruthy()
      expect(t.title.length, k).toBeLessThan(60)
    }
  })

  it('names the home when there is one, and reads properly without one', () => {
    expect(noticeText('arrived', 'Ridgeview Home').body).toContain('Ridgeview Home')
    expect(noticeText('on_the_way').body).toBe('She’ll be with you shortly.')
    expect(noticeText('report_ready').title).toBe('Your home is ready ✨')
    expect(noticeText('report_ready', 'Skyline Loft 12B').title).toBe('Skyline Loft 12B is ready ✨')
  })

  it('never puts money in a notice — a push sits on a lock screen', () => {
    const money = /\$|\d+\s*(dollars|usd)|\bpaid\b\s*\$/i
    for (const k of ALL) {
      const { title, body } = noticeText(k, 'Ridgeview Home')
      expect(money.test(title), `${k} title`).toBe(false)
      expect(money.test(body || ''), `${k} body`).toBe(false)
    }
  })

  it('never leaks an address into a notice', () => {
    // The subject is a property NAME. If a caller passed an address by mistake
    // the copy would carry it, so the guard is on what we pass, not the text —
    // this pins the shape so the templates keep taking a name only.
    const { body } = noticeText('arrived', 'Ridgeview Home')
    expect(body).not.toMatch(/\d{2,}\s+\w+\s+(St|Rd|Ave|Dr|Ln|Blvd)/i)
  })

  it('tells the client the booking has not charged them', () => {
    expect(noticeText('booked', 'Ridgeview Home').body).toMatch(/nothing is charged/i)
  })

  it('tells the client the approval clock is real', () => {
    expect(noticeText('approval_due').body).toMatch(/48 hours/)
  })

  it('a declined card says nothing was charged, and cannot be switched off', () => {
    // If this one is missed the clean simply doesn't happen, so no settings
    // toggle writes the key it is filed under.
    expect(noticeText('card_declined').body).toMatch(/nothing was charged/i)
    expect(wants({ cleaning: false, reports: false, approvals: false, bookings: false, supplies: false, summary: false, payouts: false, clients: false, quotes: false, messages: false }, 'card_declined')).toBe(true)
  })
})

describe('canSendNotice — who may announce something', () => {
  const ORG = 'org-1'
  const job = { org_id: ORG }
  const admin = { role: 'org_admin', orgId: ORG }
  const cleaner = { role: 'cleaner', orgId: ORG }
  const client = { role: 'owner', orgId: ORG }
  const foreignAdmin = { role: 'org_admin', orgId: 'org-2' }

  it('lets the studio send its own by-hand notices', () => {
    expect(canSendNotice(admin, 'on_the_way', job)).toBe(true)
    expect(canSendNotice(cleaner, 'report_ready', job)).toBe(true)
  })

  it('DENIES a client — otherwise anyone could put words on a lock screen as Ahleyia', () => {
    expect(canSendNotice(client, 'on_the_way', job)).toBe(false)
    expect(canSendNotice(null, 'on_the_way', job)).toBe(false)
  })

  it('DENIES staff from another studio', () => {
    expect(canSendNotice(foreignAdmin, 'on_the_way', job)).toBe(false)
  })

  it('DENIES a caller with no organization', () => {
    expect(canSendNotice({ role: 'org_admin', orgId: null }, 'on_the_way', job)).toBe(false)
  })

  it('DENIES a kind that is not on the by-hand list', () => {
    // 'arrived' is raised by check-in, which has the geofence and the charge
    // behind it. Announcing an arrival by hand would be claiming something that
    // did not happen.
    expect(canSendNotice(admin, 'arrived', job)).toBe(false)
    expect(canSendNotice(admin, 'booked', job)).toBe(false)
    expect(canSendNotice(admin, 'payout', job)).toBe(false)
    expect(canSendNotice(admin, 'invite_claimed', job)).toBe(false)
  })

  it('DENIES a made-up kind', () => {
    expect(canSendNotice(admin, 'you_owe_money', job)).toBe(false)
    expect(canSendNotice(admin, '', job)).toBe(false)
  })

  it('DENIES when the job does not exist', () => {
    expect(canSendNotice(admin, 'on_the_way', null)).toBe(false)
  })

  it('every by-hand kind has wording, and none of them is an event-owned kind', () => {
    const eventOwned: NoticeKind[] = ['arrived', 'booked', 'payout', 'invite_claimed']
    for (const k of STAFF_KINDS) {
      expect(noticeText(k).title, k).toBeTruthy()
      expect(eventOwned.indexOf(k), k).toBe(-1)
    }
  })
})
