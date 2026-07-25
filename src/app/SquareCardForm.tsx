/* The live card-on-file form. Mounts Square's Web Payments card field, records
 * the payment-authorization consent, tokenizes in the browser, and posts the
 * single-use token to the save-card function (which enforces CREDIT-only and
 * stores the consent). The raw card number never touches our servers. Rendered
 * only when Square is configured and an owner is signed in; otherwise the
 * prototype's plain card fields show instead (see OwnerScreens edit-card). */
import React, { useEffect, useRef, useState } from 'react'
import { css } from './css'
import { Button, Card, SectionLabel, Checkbox, NoteCard } from '../ds/components'
import { mountCardField, type CardField } from '../lib/square'
import { CONSENT_TEXT } from '../lib/consent'
import { api, errMsg } from './backend'

export function SquareCardForm({ ownerId, orgId, onSaved }: {
  ownerId: string; orgId: string; onSaved: (r: { id: string; brand: string; last4: string }) => void
}) {
  const box = useRef<HTMLDivElement | null>(null)
  const field = useRef<CardField | null>(null)
  const [ready, setReady] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (box.current) {
      mountCardField(box.current)
        .then((f) => { if (!alive) { f.destroy(); return } field.current = f; setReady(true) })
        .catch((e) => alive && setErr(errMsg(e, 'The secure card field couldn’t load')))
    }
    return () => { alive = false; field.current?.destroy() }
  }, [])

  const save = async () => {
    if (!field.current) return
    if (!consent) { setErr('Please authorize the card before saving.'); return }
    setErr(null); setBusy(true)
    try {
      const token = await field.current.tokenize()
      const res = await api.saveCard({ ownerId, orgId, cardToken: token, consentAgreedAt: new Date().toISOString() })
      onSaved(res)
    } catch (e) {
      setErr(errMsg(e, 'That card couldn’t be saved'))
    } finally { setBusy(false) }
  }

  return (
    <>
      <Card>
        <SectionLabel>New card</SectionLabel>
        <p style={css('margin:0 0 12px;font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}><b>Major credit card only</b> — Visa, Mastercard, Amex, Discover. Debit cards aren’t accepted (it protects both of you from fraud).</p>
        <div ref={box} style={css('min-height:52px;border:1px solid var(--border-default);border-radius:var(--radius-md);padding:8px 12px;background:var(--surface-cream)')} />
        {!ready && !err && <p style={css('margin:10px 0 0;font-size:11.5px;color:var(--text-muted)')}>Loading the secure card field…</p>}
      </Card>
      <Card>
        <div style={css('display:flex;gap:12px;align-items:flex-start')}>
          <Checkbox checked={consent} onChange={setConsent} size={22} />
          <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{CONSENT_TEXT}</div>
        </div>
      </Card>
      {err && <NoteCard tone="pink" icon="⚠️">{err}</NoteCard>}
      <NoteCard tone="money" icon="🧾"><b>Nothing changes about how you’re billed.</b> One charge, in full, when Ahleyia arrives — never twice. Your new card takes over from the next clean.</NoteCard>
      <Button variant="green" onClick={save}>{busy ? 'Saving…' : 'Save new card'}</Button>
    </>
  )
}
