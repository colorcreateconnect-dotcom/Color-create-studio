/* "Ahleyia set up your account" — what an existing client sees when they open
   the link she sent. Her details are already here; they add the two things only
   they should own (email + a password), and their card once they're inside. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import { Button, Card, Checkbox, Chip, DetailHeader, NoteCard, SectionLabel, SupplyRow } from '../../ds/components'

export function InviteScreen({ v }: { v: any }) {
  const p = v.invitePreview
  // Same shape of screen for both, different substance: a client is claiming
  // their home and price; a cleaner is joining the team.
  const isStaff = p?.kind === 'staff'

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
            <p style={css('margin:8px auto 0;max-width:270px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{isStaff
              ? 'Signing you in now. Next, add where your pay lands so your 50% can be released the day you work.'
              : 'Signing you in now. Next, add a credit card so each clean can be charged once, on arrival.'}</p>
          </div>
        </Card>
      </div>
    </>
  )

  return (
    <>
      <DetailHeader gradient="magenta" badge={v.badgeInvite}
        title={p.fullName ? `Welcome, ${p.fullName}` : 'Welcome'}
        subtitle={isStaff ? `${p.studio} invited you to the team` : `${p.studio} set up your account`} />
      <div style={css('padding:22px')}>
        {isStaff ? (<>
          <NoteCard tone="pink" icon="🧽">
            <b>Ahleyia invited you to her team.</b> Set up how you’ll sign in, and your working day is ready — route, checklists and pay.
          </NoteCard>

          <SectionLabel>What you’re joining</SectionLabel>
          <Card flush>
            <SupplyRow icon="⚡" name="Paid the day you work" sub="50% released when you check in, the rest on approval" right={v.chipReady} />
            <SupplyRow icon="📋" name="The Kee Method™, step by step" sub="You’re never guessing what ‘done’ looks like" right={v.chipReady} />
            <SupplyRow icon="👤" name="Clients come to you" sub="Routes are built and scheduled for you" right={v.chipReady} />
            <SupplyRow icon="📷" name="Your work is documented" sub="Photo proof protects you as much as the owner" right={v.chipReady} last />
          </Card>
        </>) : (<>
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
        </>)}

        <SectionLabel>Set up your sign-in</SectionLabel>
        <Card>
          <Field icon="💌">
            <NativeInput type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              aria-label="Email" placeholder={isStaff ? 'Email for your schedule and pay' : 'Email for reports and receipts'}
              value={v.inviteEmail} onChange={v.setInviteEmail} />
          </Field>
          <div style={{ height: 8 }} />
          <Field icon="🔐">
            <NativeInput type={v.invitePwType} autoComplete="new-password" aria-label="Create a password"
              placeholder="Create a password" value={v.invitePw} onChange={v.setInvitePw} />
            <span style={css('font-size:11px;color:var(--magenta);cursor:pointer')} onClick={v.toggleInvitePw}>{v.invitePwToggleLabel}</span>
          </Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>At least 8 characters, with letters and a number. {isStaff ? 'Your schedule and pay summaries are emailed to you.' : 'Your reports and receipts are emailed to you.'}</p>
        </Card>

        {v.inviteFormError && <NoteCard tone="pink" icon="⚠️">{v.inviteFormError}</NoteCard>}

        {isStaff ? (
          <NoteCard tone="money" icon="💰">
            <b>Nothing is deducted for joining.</b> Once you’re in, add where your pay lands. She takes her share from the business side, never from your pay.
          </NoteCard>
        ) : (
          <NoteCard tone="money" icon="🧾">
            <b>Nothing is charged today.</b> You’ll add a credit card once you’re in — each clean is charged once, in full, when Ahleyia arrives. Never twice. Tips are separate.
          </NoteCard>
        )}

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
          {v.inviteTexted === true && <p style={css('margin:12px 0 0;font-size:11.5px;color:var(--green-deep)')}>✓ Texted to them from your business number.</p>}
          <p style={css('margin:12px 0 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>Send it to them directly — anyone with this link can claim the account, so don’t post it publicly. Texting it again makes a fresh link and retires this one.</p>
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

        <Card>
          <SectionLabel>Texting them</SectionLabel>
          <div style={css('display:flex;gap:12px;align-items:flex-start')}>
            <Checkbox checked={v.ncConsent} onChange={v.setNcConsent} size={22} />
            <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>
              They’ve agreed to get texts about their service — their link, arrival and payment notices. We record the date. They can reply STOP any time.
            </div>
          </div>
        </Card>

        {v.ncError && <NoteCard tone="pink" icon="⚠️">{v.ncError}</NoteCard>}

        <Button variant="green" onClick={v.saveNewClient}>{v.beBusy ? 'Adding…' : 'Add client & make their link'}</Button>
        <p style={css('margin:10px 2px 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>Nothing is charged. They add their card themselves.</p>
      </div>
    </>
  )
}

/** Add a home to a client she already has. No invitation here — the client
    exists, so this writes the property straight to their account. */
export function AddPropertyScreen({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goClients} badge={v.badgeAddProp} title="Add a home" subtitle="For a client already in your book" />
      <div style={css('padding:22px')}>
        {v.npNoClients
          ? (
            <NoteCard tone="pink" icon="👤">No clients yet — add the client first and their home comes with them.
              <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.goAddClient}>Add a client</Button></div>
            </NoteCard>
          )
          : (<>
            <Card>
              <SectionLabel>Whose home is it?</SectionLabel>
              <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
                {v.npOwners.map((o: any, i: number) => <Chip key={i} tone={o.on ? 'refresh' : 'ghost'} onClick={o.pick} style={{ cursor: 'pointer' }}>{o.label}</Chip>)}
              </div>
            </Card>

            <Card>
              <SectionLabel>The home</SectionLabel>
              <Field icon="🏡"><NativeInput type="text" aria-label="Home name" placeholder="e.g. The Ridgeview Home" value={v.npName} onChange={v.setNpName} /></Field>
              <div style={{ height: 8 }} />
              <Field icon="📍"><NativeInput type="text" autoComplete="off" aria-label="Neighborhood" placeholder="Neighborhood" value={v.npArea} onChange={v.setNpArea} /></Field>
              <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>What kind of home?</div>
              <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
                {v.npKinds.map((t: any, i: number) => <Chip key={i} tone={t.on ? 'refresh' : 'ghost'} onClick={t.pick} style={{ cursor: 'pointer' }}>{t.label}</Chip>)}
              </div>
              <div style={css('display:flex;gap:8px;margin-top:14px')}>
                <Field><NativeInput type="tel" inputMode="numeric" aria-label="Beds" placeholder="Beds" value={v.npBeds} onChange={v.setNpBeds} /></Field>
                <Field><NativeInput type="tel" inputMode="numeric" aria-label="Baths" placeholder="Baths" value={v.npBaths} onChange={v.setNpBaths} /></Field>
              </div>
              <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Beds and baths set the turnover price and the Kee Method™ template this home gets.</p>
            </Card>

            {v.npErr && <NoteCard tone="pink" icon="⚠️">{v.npErr}</NoteCard>}
            <Button variant="green" onClick={v.saveNewProperty}>{v.beBusy ? 'Adding…' : 'Add this home'}</Button>
            <p style={css('margin:10px 2px 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>It shows up on the booking calendar straight away.</p>
          </>)}
      </div>
    </>
  )
}

/** The studio's "add someone to my team" form — the cleaner counterpart of
    AddClientScreen. Same shape, same one-time link; only the fields differ,
    because a cleaner has no home and no price. */
export function AddStaffScreen({ v }: { v: any }) {
  if (v.newStaffLink) return (
    <>
      <DetailHeader onBack={v.goTeam} badge={v.badgeInviteReady} title="Send them their link" subtitle={v.newStaffName + ' is on your team'} />
      <div style={css('padding:22px')}>
        <NoteCard tone="eco" icon="✓"><b>{v.newStaffName} is added.</b> This link lets them set their email and password. It works once, and expires in 14 days.</NoteCard>
        <Card>
          <SectionLabel>Their private link</SectionLabel>
          <div style={css('font-size:11.5px;line-height:1.5;word-break:break-all;background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px')}>{v.newStaffLink}</div>
          <div style={css('display:flex;gap:8px;margin-top:12px')}>
            <Button size="sm" onClick={v.copyStaffLink}>Copy link</Button>
            <Button variant="ghost" size="sm" onClick={v.textStaffLink}>Text it to them</Button>
          </div>
          <p style={css('margin:12px 0 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>Send it to them directly — anyone with this link can claim the account, so don’t post it publicly.</p>
        </Card>
        <NoteCard tone="pink" icon="📋">Once they’re in, they add their payout details and work through certification. Background checks stay between them and the checking service — you see only pass or fail.</NoteCard>
        <Button variant="ghost" onClick={v.goAddStaff}>Add another</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goTeam}>Back to my team</Button></div>
      </div>
    </>
  )

  return (
    <>
      <DetailHeader onBack={v.goTeam} badge={v.badgeTeamAdd} title="Add someone to your team" subtitle="You add them — they set their own sign-in" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>Who they are</SectionLabel>
          <Field icon="👤"><NativeInput type="text" autoComplete="off" aria-label="Their name" placeholder="Their name" value={v.nsName} onChange={v.setNsName} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="📱"><NativeInput type="tel" inputMode="tel" aria-label="Their mobile" placeholder="Their mobile number" value={v.nsPhone} onChange={v.setNsPhone} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="💌"><NativeInput type="email" inputMode="email" autoCapitalize="none" spellCheck={false} aria-label="Their email (optional)" placeholder="Their email (optional)" value={v.nsEmail} onChange={v.setNsEmail} /></Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>A phone number or an email — whichever you have. They confirm their own email when they set up their sign-in.</p>
        </Card>

        <Card>
          <SectionLabel>Texting them</SectionLabel>
          <div style={css('display:flex;gap:12px;align-items:flex-start')}>
            <Checkbox checked={v.nsConsent} onChange={v.setNsConsent} size={22} />
            <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>
              They’ve agreed to get texts about their work — their link, schedule and pay notices. We record the date. They can reply STOP any time.
            </div>
          </div>
        </Card>

        <NoteCard tone="money" icon="⚡">They’re paid the day they work — 50% when they check in, the rest on approval. Nothing is deducted for joining.</NoteCard>

        {v.nsError && <NoteCard tone="pink" icon="⚠️">{v.nsError}</NoteCard>}

        <Button variant="green" onClick={v.saveNewStaff}>{v.beBusy ? 'Adding…' : 'Add to team & make their link'}</Button>
      </div>
    </>
  )
}
