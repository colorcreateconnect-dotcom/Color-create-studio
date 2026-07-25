/* "Ahleyia set up your account" — what an existing client sees when they open
   the link she sent. Her details are already here; they add the two things only
   they should own (email + a password), and their card once they're inside. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import { Button, Card, Chip, DetailHeader, NoteCard, SectionLabel, SupplyRow } from '../../ds/components'

export function InviteScreen({ v }: { v: any }) {
  const p = v.invitePreview

  if (v.inviteLoading) return (
    <div style={css('min-height:60vh;display:flex;align-items:center;justify-content:center;padding:40px 22px')}>
      <div style={css('text-align:center;color:var(--text-muted);font-size:13px')}>Opening your invitation…</div>
    </div>
  )

  if (v.inviteError) return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goWelcome} badge={v.badgeInvite} title="This link isn’t working" subtitle="It may have been used already, or expired" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="💌">{v.inviteError}</NoteCard>
        <Button onClick={v.goGate}>Sign in instead</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goWelcome}>Back to the start</Button></div>
      </div>
    </>
  )

  // Never white-screen a client on a malformed response — treat anything
  // without their details as a bad link.
  if (!p || !Array.isArray(p.properties)) return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goWelcome} badge={v.badgeInvite} title="This link isn’t working" subtitle="It may have been used already, or expired" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="💌">We couldn’t open your invitation. Ask Ahleyia to send you a fresh link.</NoteCard>
        <Button onClick={v.goGate}>Sign in instead</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goWelcome}>Back to the start</Button></div>
      </div>
    </>
  )

  if (v.inviteDone) return (
    <>
      <DetailHeader gradient="magenta" badge={v.badgeInvite} title="You’re all set" subtitle="Your account is ready" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('text-align:center')}>
            <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
            <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1;margin-top:12px')}>Welcome, {p.fullName || 'and thank you'}</div>
            <p style={css('margin:8px auto 0;max-width:270px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Signing you in now. Next, add a credit card so each clean can be charged once, on arrival.</p>
          </div>
        </Card>
      </div>
    </>
  )

  return (
    <>
      <DetailHeader gradient="magenta" badge={v.badgeInvite} title={p.fullName ? `Welcome, ${p.fullName}` : 'Welcome'} subtitle={`${p.studio} set up your account`} />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="💌">
          <b>Everything’s already here.</b> Ahleyia added your home and your agreed price. Just choose how you’ll sign in.
        </NoteCard>

        <SectionLabel>What she has for you</SectionLabel>
        <Card flush>
          {p.properties.map((h: any, i: number) => (
            <SupplyRow key={i} icon="🏡" name={h.name}
              sub={[h.neighborhood, [h.beds ? h.beds + ' bed' : null, h.baths ? h.baths + ' bath' : null].filter(Boolean).join(' · ')].filter(Boolean).join(' · ') || 'Your home'}
              right={v.chipReady} last={i === p.properties.length - 1 && p.agreedPrice == null} />
          ))}
          {p.agreedPrice != null && (
            <SupplyRow icon="🧾" name={'$' + Number(p.agreedPrice).toFixed(0) + (p.cadence ? ' · ' + p.cadence : '')}
              sub="Your agreed price per clean" right={v.chipReady} last />
          )}
        </Card>

        <SectionLabel>Set up your sign-in</SectionLabel>
        <Card>
          <Field icon="💌">
            <NativeInput type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              aria-label="Email" placeholder="Email for reports and receipts"
              value={v.inviteEmail} onChange={v.setInviteEmail} />
          </Field>
          <div style={{ height: 8 }} />
          <Field icon="🔐">
            <NativeInput type={v.invitePwType} autoComplete="new-password" aria-label="Create a password"
              placeholder="Create a password" value={v.invitePw} onChange={v.setInvitePw} />
            <span style={css('font-size:11px;color:var(--magenta);cursor:pointer')} onClick={v.toggleInvitePw}>{v.invitePwToggleLabel}</span>
          </Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>At least 8 characters, with letters and a number. Your reports and receipts are emailed to you.</p>
        </Card>

        {v.inviteFormError && <NoteCard tone="pink" icon="⚠️">{v.inviteFormError}</NoteCard>}

        <NoteCard tone="money" icon="🧾">
          <b>Nothing is charged today.</b> You’ll add a credit card once you’re in — each clean is charged once, in full, when Ahleyia arrives. Never twice. Tips are separate.
        </NoteCard>

        <Button variant="green" onClick={v.claimInvite}>{v.inviteBusy ? 'Setting up…' : 'Create my account'}</Button>
        <p style={css('margin:10px 2px 0;text-align:center;font-size:11px;color:var(--text-muted)')}>Already set this up? <span style={css('color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={v.goGate}>Sign in</span></p>
      </div>
    </>
  )
}

/** The studio's "add a client I already work with" form. */
export function AddClientScreen({ v }: { v: any }) {
  if (v.newClientLink) return (
    <>
      <DetailHeader onBack={v.goClients} badge={v.badgeInviteReady} title="Send them their link" subtitle={v.newClientName + ' is in your book'} />
      <div style={css('padding:22px')}>
        <NoteCard tone="eco" icon="✓"><b>{v.newClientName} is set up.</b> Their home and price are saved. This link lets them add their email, password and card — it works once, and expires in 14 days.</NoteCard>
        <Card>
          <SectionLabel>Their private link</SectionLabel>
          <div style={css('font-size:11.5px;line-height:1.5;word-break:break-all;background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px')}>{v.newClientLink}</div>
          <div style={css('display:flex;gap:8px;margin-top:12px')}>
            <Button size="sm" onClick={v.copyInviteLink}>Copy link</Button>
            <Button variant="ghost" size="sm" onClick={v.textInviteLink}>Text it to them</Button>
          </div>
          <p style={css('margin:12px 0 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>Send it to them directly — anyone with this link can claim the account, so don’t post it publicly.</p>
        </Card>
        <Button variant="ghost" onClick={v.goAddClient}>Add another client</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goClients}>Back to my clients</Button></div>
      </div>
    </>
  )

  return (
    <>
      <DetailHeader onBack={v.goClients} badge={v.badgeExisting} title="Add a client you already have" subtitle="You fill in what you know — they add the rest" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>Who they are</SectionLabel>
          <Field icon="👤"><NativeInput type="text" autoComplete="off" aria-label="Their name" placeholder="Their name" value={v.ncName} onChange={v.setNcName} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="📱"><NativeInput type="tel" inputMode="tel" aria-label="Their mobile" placeholder="Their mobile number" value={v.ncPhone} onChange={v.setNcPhone} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="💌"><NativeInput type="email" inputMode="email" autoCapitalize="none" spellCheck={false} aria-label="Their email (optional)" placeholder="Their email (optional)" value={v.ncEmail} onChange={v.setNcEmail} /></Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>A phone number or an email — whichever you have. They’ll confirm their email themselves.</p>
        </Card>

        <Card>
          <SectionLabel>Their home</SectionLabel>
          <Field icon="🏡"><NativeInput type="text" aria-label="Home name" placeholder="e.g. The Ridgeview Home" value={v.ncProperty} onChange={v.setNcProperty} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="📍"><NativeInput type="text" autoComplete="off" aria-label="Address" placeholder="Street address" value={v.ncAddress} onChange={v.setNcAddress} /></Field>
          <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>What kind of home?</div>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
            {v.ncTypes.map((t: any, i: number) => <Chip key={i} tone={t.on ? 'refresh' : 'ghost'} onClick={t.pick} style={{ cursor: 'pointer' }}>{t.label}</Chip>)}
          </div>
          <div style={css('display:flex;gap:8px;margin-top:14px')}>
            <Field><NativeInput type="tel" inputMode="numeric" aria-label="Beds" placeholder="Beds" value={v.ncBeds} onChange={v.setNcBeds} /></Field>
            <Field><NativeInput type="tel" inputMode="numeric" aria-label="Baths" placeholder="Baths" value={v.ncBaths} onChange={v.setNcBaths} /></Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>What they pay</SectionLabel>
          <Field icon="🧾"><NativeInput type="tel" inputMode="decimal" aria-label="Agreed price" placeholder="Agreed price per clean" value={v.ncPrice} onChange={v.setNcPrice} /></Field>
          <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>How often?</div>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
            {v.ncCadences.map((c: any, i: number) => <Chip key={i} tone={c.on ? 'refresh' : 'ghost'} onClick={c.pick} style={{ cursor: 'pointer' }}>{c.label}</Chip>)}
          </div>
          <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>This is the one number they see. Your rates and margins stay on your side.</p>
        </Card>

        {v.ncError && <NoteCard tone="pink" icon="⚠️">{v.ncError}</NoteCard>}

        <Button variant="green" onClick={v.saveNewClient}>{v.beBusy ? 'Adding…' : 'Add client & make their link'}</Button>
        <p style={css('margin:10px 2px 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>Nothing is charged. They add their card themselves.</p>
      </div>
    </>
  )
}
