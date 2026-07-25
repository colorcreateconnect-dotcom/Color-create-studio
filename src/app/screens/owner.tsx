/* Owner zone — Homes, Products & scent, Add a property, Service report,
   Supplies, Messages, Your account, Account setup, Schedule, Reschedule,
   Add services, Cancel, Quote received, Something's not right, Edit reorder
   list, Photo gallery, Rate & thank, Receipts, Edit a detail. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import {
  Button, Card, Chip, Pill, Avatar, IconButton, SectionLabel, StatTile, NoteCard,
  DetailHeader, SupplyRow, StatusCard, ConsistencyCard, PhotoStrip, ProgressBar,
  PriceBox, Timeline, Checkbox, TextField, Stepper,
} from '../../ds/components'
import { SquareCardForm } from '../SquareCardForm'

export function OwnerScreens(v: any) {
  if (v.oHome) return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1')}>
          <div style={css('font-size:12px;color:var(--text-muted)')}>Welcome back,</div>
          <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1')}>{v.clientGreeting}</div>
        </div>
        <IconButton icon="💬" onClick={v.goMessages} />
        <IconButton icon="☰" onClick={v.openMenu} />
        <Avatar initials={v.clientInitials} size={38} gradient="linear-gradient(135deg,#2F6BD6,#33B27A)" onClick={v.goAccount} style={{ cursor: 'pointer' }} />
      </div>
      <div style={css('padding:16px 22px 22px')}>
        {v.noHomes && (<>
          <Card tone="blush">
            <div style={css('text-align:center;padding:6px 4px')}>
              <div style={css('font-size:34px')}>🏡</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Add your first home</div>
              <p style={css('margin:8px auto 16px;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Paste your listing link and we’ll pull the beds, baths and photos — your reference standard — in about two minutes.</p>
              <Button onClick={v.goOnboard}>Add a property</Button>
              <div style={css('margin-top:8px')}><Button variant="ghost" onClick={v.openAhleyia}>Ask Ahleyia to set it up</Button></div>
            </div>
          </Card>
          <NoteCard tone="pink" icon="📷">Once a home is added, every clean arrives here as a photo-verified report you can keep.</NoteCard>
        </>)}
        {v.hasHomes && (<>
          <ConsistencyCard grade="A+" title="Every clean, to your standard" sub="18 of your last 18 cleans passed the reference-photo check. Your homes look identical, guest to guest." />
          <Card flush><SupplyRow icon="🧮" name="Your tailored quote is ready" sub="Ridgeview home · from Ahleyia, today" right={v.chipNew} onClick={v.goQuoteReceived} last /></Card>
          <SectionLabel action="+ Add" onAction={v.goOnboard}>Your properties</SectionLabel>
          <StatusCard state="ready" name="The Hartwell Estate" sub="Buckhead · 5 bed" badge={v.badgeReady} metas={v.metasReadyPlus} onClick={v.goReport}>
            <PhotoStrip shots={v.proofShots} />
          </StatusCard>
          <StatusCard state="soon" name="Skyline Loft 12B" sub="Midtown · Airbnb · 2 bed" badge={v.badgeCleaning} metas={v.metasCleaning}>
            <ProgressBar value={60} left="Turnover 60% · on schedule" right="60%" />
          </StatusCard>
          <Card flush>
            <SupplyRow icon="📅" name="Your schedule" sub="Reschedule, add a service or cancel · 3 booked" right="›" onClick={v.goSchedule} />
            <SupplyRow icon="🌱" name="Products & scent" sub="Eco & non-toxic · Eucalyptus-mint" right="›" onClick={v.goProducts} last />
          </Card>
        </>)}
      </div>
    </>
  )

  if (v.oProducts) return (
    <>
      <DetailHeader gradient="eco" onBack={v.goBack} badge={v.badgeEco} title="Products & Scent" subtitle="Skyline Loft 12B · how your home is cleaned" />
      <div style={css('padding:22px')}>
        <NoteCard tone="eco" icon="💚">She’s Maid In ATL cleans non-toxic — safe for your family, pets, air quality, and your housekeeper’s health. Hospital-grade germ kill, <b>zero bleach or ammonia</b>.</NoteCard>
        <SectionLabel>Product approach</SectionLabel>
        <div style={css('display:flex;gap:var(--gap-chip);margin-bottom:var(--stack-card)')}>
          <Pill selected={v.eco} eco onClick={v.pickEco}>🌱 Eco & non-toxic</Pill>
          <Pill selected={v.notEco} onClick={v.pickStdProd}>Standard disinfectant</Pill>
        </div>
        <SectionLabel>What Ahleyia uses here</SectionLabel>
        <Card flush>
          <SupplyRow icon="💧" name="Simple Green" flag={v.chipPlant} sub="All-purpose cleaning & degreasing — biodegradable, non-toxic." />
          <SupplyRow icon="🍃" name="Benefect Botanical" flag={v.chipDis} sub="Thyme-oil disinfectant for high-touch surfaces." />
          <SupplyRow icon="🧴" name="Microfiber + steam" sub="Deep clean with heat, not chemicals." last />
        </Card>
        <SectionLabel>Never used in your home</SectionLabel>
        <Card>
          <div style={css('display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:var(--danger);text-decoration:line-through')}>
            <span>Bleach</span><span>Ammonia</span><span>Harsh fumes</span><span>Aerosol sprays</span>
          </div>
        </Card>
        <SectionLabel>Your signature scent</SectionLabel>
        <div style={css('display:flex;flex-wrap:wrap;gap:var(--gap-chip)')}>{v.scentOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} eco onClick={s.pick}>{s.label}</Pill>)}</div>
        <p style={css('margin:12px 0 var(--stack-card);font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>A natural essential-oil finishing mist on linens & air — your home smells fresh and spa-like, never chemical.</p>
        <Card>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
            <div>
              <div style={css('font-size:13.5px;font-weight:var(--weight-semibold)')}>Eco finish + signature scent</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Added to each turnover · your choice</div>
            </div>
            <div style={css('display:flex;align-items:center;gap:10px')}>
              <div style={{ ...css('font-family:var(--font-serif-display);font-size:28px'), color: v.scentOn ? 'var(--green-deep)' : 'var(--text-muted)' }}>+$8</div>
              <Pill selected={v.scentOn} eco onClick={v.toggleScent}>{v.scentOn ? 'On' : 'Off'}</Pill>
            </div>
          </div>
          <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>{v.scentConsequence}</p>
          <div style={css('margin-top:8px')}><span style={css('font-size:11.5px;color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={v.goReceipts}>See exactly what you’ll be billed</span></div>
        </Card>
        <Button variant="green" onClick={v.savePrefs}>Save preferences</Button>
      </div>
    </>
  )

  if (v.oOnboard) return <Onboard v={v} />
  if (v.oReport) return <Report v={v} />
  if (v.oSupplies) return <OwnerSupplies v={v} />
  if (v.oMessages) return <Messages v={v} />
  if (v.oAccount) return <Account v={v} />
  if (v.oSetup) return <Setup v={v} />
  if (v.oSchedule) return <Schedule v={v} />
  if (v.oReschedule) return <Reschedule v={v} />
  if (v.oAddService) return <AddService v={v} />
  if (v.oCancel) return <Cancel v={v} />
  if (v.oQuote) return <QuoteReceived v={v} />
  if (v.oDispute) return <Dispute v={v} />
  if (v.oEditList) return <EditList v={v} />
  if (v.oGallery) return <Gallery v={v} />
  if (v.oRate) return <Rate v={v} />
  if (v.oReceipts) return <Receipts v={v} />
  if (v.oEdit) return <EditDetail v={v} />

  return null
}

/* --------------------------------------------------------- Card fields -- */
function CardField() {
  return (
    <>
      <Field icon="💳"><NativeInput type="tel" inputMode="numeric" autoComplete="cc-number" aria-label="Card number" placeholder="Card number" /></Field>
      <div style={css('display:flex;gap:8px;margin-top:8px')}>
        <Field><NativeInput type="tel" inputMode="numeric" autoComplete="cc-exp" aria-label="Expiry" placeholder="MM / YY" /></Field>
        <Field><NativeInput type="tel" inputMode="numeric" autoComplete="cc-csc" aria-label="Security code" placeholder="CVC" /></Field>
      </div>
    </>
  )
}

const BILLING = "How billing works: your card is charged once, for the full amount, when Ahleyia arrives — never twice."

/* ------------------------------------------------------------- Onboard -- */
function Onboard({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badge2min} title="Add your property" subtitle="No account, no forms — just paste your listing link" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>Paste your listing link</SectionLabel>
          <div style={css('display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px')}>
            {['Airbnb', 'Zillow', 'Trulia', 'Redfin', 'VRBO'].map((h) => <Chip key={h} tone="ghost">{h}</Chip>)}
          </div>
          <div style={css('display:flex;gap:8px;align-items:center')}>
            <Field icon="🔗"><NativeInput type="url" inputMode="url" autoCapitalize="none" spellCheck={false} aria-label="Listing link" placeholder="airbnb.com/rooms/…" value={v.listingUrl} onChange={v.setListing} /></Field>
            <Button size="sm" onClick={v.detect}>Detect</Button>
          </div>
          <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug)')}>We pull the beds, baths, and photos automatically so you don’t have to type them.</p>
        </Card>
        {v.detectFailed && (<>
          <NoteCard tone="warn" icon="😕"><b>No luck reading that link.</b> Some listings hide their details from us — 20 seconds by hand and you’re done.</NoteCard>
          <SectionLabel>What we did find</SectionLabel>
          <Card>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:14px')}>{v.metasPartial}</div>
            <TextField icon="🏡" placeholder="Property name" value={v.manualName} onChange={v.setManualName} />
            <div style={{ height: 8 }} />
            <TextField icon="📍" placeholder="Street address" />
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Bedrooms</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.bedOpts.map((b: any, i: number) => <Pill key={i} selected={b.on} onClick={b.pick}>{b.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Bathrooms</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.bathOpts.map((b: any, i: number) => <Pill key={i} selected={b.on} onClick={b.pick}>{b.label}</Pill>)}</div>
          </Card>
          <SectionLabel>Your reference photos</SectionLabel>
          <Card tone="dashed">
            <p style={css('margin:0 0 12px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Upload a few shots of how each room should look. This becomes the standard every clean is checked against.</p>
            <Button variant="ghost" icon="📷" onClick={v.uploadRefs}>Upload photos</Button>
          </Card>
          <Button onClick={v.manualDone}>Save these details</Button>
        </>)}
        {v.detected && (<>
          <SectionLabel action="Edit">We found your place ✓</SectionLabel>
          <Card>
            <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>Skyline Loft 12B</div>
            <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>1065 Peachtree St NE, Midtown, Atlanta</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:12px')}>{v.metasFound}</div>
            <div style={css('margin-top:14px;font-size:11.5px;line-height:var(--leading-snug);color:var(--green-deep);background:var(--tint-green);border:1px solid var(--tint-green-line);border-radius:var(--radius-md);padding:10px 12px')}>✓ Listing photos saved as your <b>reference standard</b> — this is how the home should look after every clean.</div>
          </Card>
          <SectionLabel right={v.chipTwoBr}>Your quote</SectionLabel>
          <Card>
            <p style={css('margin:0 0 12px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Auto-priced from your listing (2 bed). Adjust for staging & detail:</p>
            <div style={css('display:flex;gap:var(--gap-chip)')}>{v.stagingOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}</div>
            <PriceBox label="Per turnover · incl. on-site laundry" footnote="Recommended" amount={v.stagePrice} />
            <p style={css('margin:12px 0 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug)')}>Ahleyia can fine-tune any quote. Residential homes are custom-quoted by the spaces you want cleaned.</p>
          </Card>
          <SectionLabel>Your requirements</SectionLabel>
          <Card>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin-bottom:8px')}>Service type</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
              <Pill selected>Turnover cleans</Pill><Pill>Deep clean (quarterly)</Pill>
            </div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Products & scent</div>
            <p style={css('margin:0 0 8px;font-size:11.5px;color:var(--text-muted)')}>Ahleyia is a certified eco / non-toxic housekeeper. Pick your finish:</p>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
              <Pill selected={v.eco} eco onClick={v.pickEco}>🌱 Eco & non-toxic (recommended)</Pill>
              <Pill selected={v.notEco} onClick={v.pickStdProd}>Standard disinfectant</Pill>
            </div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Signature scent</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.scentOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} eco onClick={s.pick}>{s.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Anything special?</div>
            <TextField icon="✏️" placeholder="Welcome note + 2 waters on the island…" />
          </Card>
          <SectionLabel right={v.chipSecure}>Payment method</SectionLabel>
          <Card>
            <p style={css('margin:0 0 12px;font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}><b>Major credit card only</b> — Visa, Mastercard, Amex, Discover. Debit cards aren’t accepted (it protects both of you from fraud).</p>
            <CardField />
            <div style={css('margin-top:10px;font-size:11px;color:var(--text-muted)')}>💳 VISA · MC · AMEX · Disc</div>
          </Card>
          <NoteCard tone="money" icon="🧾"><b>{BILLING}</b> She’s paid 50% on arrival and the final 50% the moment you approve (or automatically in 48h). Tips, if you add one, are charged separately.</NoteCard>
          <Card>
            <div style={css('display:flex;gap:12px;align-items:flex-start')}>
              <Checkbox checked={v.consent} onChange={v.setConsent} size={22} />
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>I authorize She’s Maid In ATL to charge my card for the full service amount on arrival. Ahleyia is paid 50% on arrival and 50% on my approval; if I don’t respond within 48 hours the balance releases automatically. Tips are charged separately.</div>
            </div>
          </Card>
          <Button variant="green" onClick={v.addProperty}>Add property & save card</Button>
        </>)}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Report -- */
function Report({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="report" onBack={v.goBack} badge={v.badgeVerified} title="Service Report" subtitle="The Hartwell Estate · Today, 12:31 PM" />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value="26/26" label="Kee Method™ steps" color="var(--magenta)" accent style={{ flex: 1 }} />
          <StatTile value="9" label="Proof photos" color="var(--orange)" style={{ flex: 1 }} />
        </div>
        <SectionLabel action="See all 9" onAction={v.goGallery}>Proof of service</SectionLabel>
        <PhotoStrip shots={v.reportShots} width={110} height={130} />
        <div style={{ height: 14 }} />
        <ConsistencyCard grade="✓" title="Matches your reference photos" sub="Staging compared against your saved “how it should look” set. No deviations flagged." row />
        <SectionLabel>Approve & release final payment</SectionLabel>
        <Card>
          <p style={css('margin:0 0 14px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Your card was charged <b>once ($220)</b> when Ahleyia arrived. Approving simply <b>releases</b> her final half — no new charge.</p>
          <div style={css('display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:10px 0;border-top:1px solid var(--border-default)')}>
            <span style={{ color: 'var(--green-deep)' }}>✓ 50% released on arrival</span><b style={{ color: 'var(--green-deep)' }}>$110.00</b>
          </div>
          <div style={css('display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:10px 0;border-top:1px solid var(--border-default)')}>
            <span>{v.finalHalfLabel}</span><b style={css('font-family:var(--font-serif-display);font-size:18px')}>$110.00</b>
          </div>
          <div style={css('margin-top:14px;font-size:12px;font-weight:var(--weight-semibold)')}>Add a tip? <span style={css('font-weight:var(--weight-regular);color:var(--text-muted)')}>100% to Ahleyia · charged separately</span></div>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:8px')}>{v.tipOpts.map((t: any, i: number) => <Pill key={i} selected={t.on} onClick={t.pick}>{t.label}</Pill>)}</div>
          {v.tipCustom && (<>
            <div style={css('margin-top:12px;display:flex;gap:8px;align-items:center')}>
              <div style={css('font-family:var(--font-serif-display);font-size:24px;color:var(--ink)')}>$</div>
              <Field><NativeInput type="tel" inputMode="decimal" aria-label="Tip amount" placeholder="60" value={v.tipAmount} onChange={v.setTipAmount} /></Field>
            </div>
            <p style={css('margin:8px 0 0;font-size:11px;color:var(--text-muted)')}>100% to Ahleyia · charged separately</p>
          </>)}
          {v.disputeOpen && (
            <div style={css('margin-top:14px;font-size:11.5px;line-height:var(--leading-snug);color:var(--orange-deep);background:var(--tint-orange);border:1px solid var(--tint-orange-line);border-radius:var(--radius-md);padding:10px 12px')}>⏳ <b>Auto-release paused</b> while your note is open. Nothing extra is charged, and nothing is taken back.</div>
          )}
          <div style={css('margin-top:16px;display:flex;flex-direction:column;gap:8px')}>
            <Button variant="green" onClick={v.approve}>{v.approveLabel}</Button>
            <Button variant="ghost" onClick={v.goDispute}>Something’s not right</Button>
          </div>
          <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);text-align:center')}>{v.autoReleaseLine}</p>
        </Card>
        <SectionLabel>Timeline</SectionLabel>
        <Card><Timeline items={v.timelineItems} /></Card>
        <Button variant="ghost" icon="⭐" onClick={v.goRate}>Rate & thank Ahleyia</Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------- OwnerSupplies -- */
function OwnerSupplies({ v }: { v: any }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:24px')}>Supplies</div>
        <IconButton icon="💬" onClick={v.goMessages} />
        <IconButton icon="☰" onClick={v.openMenu} />
        <IconButton icon="📋" />
      </div>
      <div style={css('padding:10px 22px 22px')}>
        <div style={css('font-size:12px;color:var(--text-muted);margin-bottom:12px')}>Approve what your units need — delivered via Instacart</div>
        <NoteCard tone="warn" icon="🛍️">Ahleyia flagged <b>8 low items</b> across units 1604, 1403 & 1913. Approve to have them delivered before the next guests.</NoteCard>
        <Card>
          <div style={css('display:grid;gap:10px;font-size:12.5px;color:var(--ink-soft)')}>
            <div style={css('display:flex;justify-content:space-between')}><span>🧻 Paper towels (Bounty, 6pk)</span><b>x7</b></div>
            <div style={css('display:flex;justify-content:space-between')}><span>🧺 Laundry detergent (Tide)</span><b>x2</b></div>
            <div style={css('display:flex;justify-content:space-between')}><span>🍷 Wine — welcome bottles</span><b>x2</b></div>
            <div style={css('display:flex;justify-content:space-between')}><span>🧴 Bath tissue (12pk)</span><b>x2</b></div>
            <div style={css('display:flex;justify-content:space-between')}><span>🗑️ Trash bags</span><b>x1</b></div>
          </div>
          <div style={css('display:flex;gap:8px;margin-top:16px')}>
            <Button variant="ghost" onClick={v.goEditList}>Edit list</Button>
            <Button variant="green" onClick={v.openCart}>🛒 Approve & order</Button>
          </div>
        </Card>
        <SectionLabel right={v.chipOneOpen}>Maintenance & damages</SectionLabel>
        <Card>
          <div style={css('display:flex;gap:12px;align-items:flex-start')}>
            <div style={css('width:42px;height:42px;border-radius:var(--radius-md);background:var(--surface-cream);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0')}>💡</div>
            <div>
              <div style={css('font-size:14px;font-weight:var(--weight-semibold)')}>{v.maintTitle}</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Unit 1604 · flagged by Ahleyia today · photo attached</div>
            </div>
          </div>
          <div style={css('display:flex;gap:8px;margin-top:14px')}>
            <Button variant="ghost" size="sm" onClick={v.handleSelf}>I’ll handle it</Button>
            <Button size="sm" onClick={v.sendHandyman}>Send handyman</Button>
          </div>
        </Card>
        <SectionLabel>Recent deliveries</SectionLabel>
        <Card flush>
          <SupplyRow icon="✓" name="Instacart · $84.20" sub="Jul 17 · 11 items · Unit 1913" right={v.chipDelivered} onClick={v.goReceipts} />
          <SupplyRow icon="✓" name="Instacart · $52.75" sub="Jul 10 · 7 items · Unit 1604" right={v.chipDelivered} last />
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Messages -- */
function Messages({ v }: { v: any }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:24px')}>Messages</div>
        <IconButton icon="☰" onClick={v.openMenu} />
        <IconButton icon="✏️" onClick={v.goCompose} />
      </div>
      <div style={css('padding:16px 22px 22px')}>
        {v.noMsgs && (
          <Card tone="blush">
            <div style={css('text-align:center;padding:6px 4px')}>
              <div style={css('font-size:34px')}>💬</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Nothing here yet</div>
              <p style={css('margin:8px auto 16px;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Messages from Ahleyia and your service updates will land here — and stay on your property record.</p>
              <Button icon="✏️" onClick={v.goCompose}>Write to Ahleyia</Button>
            </div>
          </Card>
        )}
        {v.hasMsgs && (<>
          <Card flush>
            <SupplyRow icon="AK" iconStyle={v.akTile} name="Ahleyia Kee" sub="All set for your 4 PM guest — waters & welcome note staged 🌟" right="12:31p" onClick={v.openAhleyia} />
            <SupplyRow icon="SM" iconStyle={v.smTile} name="She’s Maid In ATL" sub="Your July service summary is ready — 8 cleans, 100% verified." right="Wed" onClick={v.openBusiness} last />
          </Card>
          <Button variant="ghost" icon="✏️" onClick={v.goCompose}>New message</Button>
        </>)}
        <NoteCard tone="pink" icon="🔒">Every message, photo & report is stored to your property record — your proof that the home is cared for, consistently.</NoteCard>
        <div style={css('margin-top:22px;text-align:center')}>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--text-muted)')}>Every clean follows The Kee Method™</div>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--magenta);margin-top:6px')}>Luxury rooted in generations of excellence</div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- Account -- */
function Account({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeClient} title={v.accountTitle} subtitle="Your homes, your card, your proof archive" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <Avatar initials={v.clientInitials} size={66} gradient="linear-gradient(135deg,#2F6BD6,#33B27A)" />
            <div>
              <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>{v.clientFull}</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{v.clientTypeLine}</div>
              <div style={css('display:flex;gap:var(--gap-chip);margin-top:8px')}><Chip tone="ghost">2 properties</Chip><Chip tone="refresh">✓ 18 verified cleans</Chip></div>
            </div>
          </div>
        </Card>
        <SectionLabel>Account details</SectionLabel>
        <Card flush>
          <SupplyRow icon="📱" name={v.clientPhone} sub="One-tap code sign-in · no password" right="›" onClick={v.goEditPhone} />
          <SupplyRow icon="💌" name={v.clientEmail} sub="Reports & receipts are emailed here" right="›" onClick={v.goEditEmail} />
          <SupplyRow icon="🏡" name="Your properties" sub="The Hartwell Estate · Skyline Loft 12B" right="›" onClick={v.goOwnerHome} />
          <SupplyRow icon="✅" name="Account setup" sub="Property, standard, card & reference photos" right="›" onClick={v.goSetup} last />
        </Card>
        <SectionLabel right={v.chipSecure}>Card on file</SectionLabel>
        <Card>
          <div style={css('display:flex;align-items:center;gap:12px')}>
            <div style={css('width:42px;height:42px;border-radius:var(--radius-md);background:var(--surface-cream);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0')}>💳</div>
            <div style={css('flex:1')}>
              <div style={css('font-size:14px;font-weight:var(--weight-semibold)')}>VISA ···· 4242</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Credit · exp 04/28</div>
            </div>
            <Chip tone="refresh">Primary</Chip>
          </div>
          <div style={css('display:flex;gap:8px;margin-top:14px')}>
            <Button variant="ghost" size="sm" onClick={v.goEditCard}>Replace card</Button>
            <Button variant="ghost" size="sm" onClick={v.goReceipts}>Receipts</Button>
          </div>
        </Card>
        <NoteCard tone="money" icon="🧾"><b>One charge, on arrival.</b> Your card is charged once for the full amount when Ahleyia arrives — never twice. Tips are charged separately, 100% to her.</NoteCard>
        <SectionLabel>Notifications</SectionLabel>
        <Card>
          {v.ownerNotifs.map((n: any, i: number) => (
            <div key={i} style={css('display:flex;gap:12px;align-items:flex-start;padding:9px 0')}>
              <Checkbox checked={n.on} onChange={n.toggle} size={22} />
              <div style={css('font-size:12.5px;line-height:var(--leading-snug)')}>{n.label}</div>
            </div>
          ))}
        </Card>
        <SectionLabel>Your proof archive</SectionLabel>
        <Card flush>
          <SupplyRow icon="📋" name="All service reports" sub="18 cleans · every photo & timestamp kept" right="›" onClick={v.goReport} />
          <SupplyRow icon="🖼️" name="Reference photo sets" sub="How each room should look after every clean" right="›" onClick={v.goRefSets} last />
        </Card>
        <Button variant="ghost" icon="💌" onClick={v.toastInvite}>Invite a friend to Ahleyia</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.signOut}>Sign out</Button></div>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Setup -- */
function Setup({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.setupBadge} title={v.setupTitle} subtitle={v.setupSub}>
        <div style={css('display:flex;justify-content:space-between;align-items:baseline;color:var(--text-on-brand);font-size:11px;margin-bottom:6px')}><span style={css('font-family:var(--font-spaced);letter-spacing:var(--tracking-spaced);text-transform:uppercase;font-size:9px')}>{v.setupLeft}</span><span style={css('font-weight:var(--weight-semibold)')}>{v.setupRight}</span></div>
        <ProgressBar value={v.setupPct} />
      </DetailHeader>
      <div style={css('padding:22px')}>
        {v.setupIncomplete && <NoteCard tone="pink" icon="💌">Five short steps and your home runs itself. Do them in any order — or ask Ahleyia to set it up with you on the phone.</NoteCard>}
        <SectionLabel right={v.setupCountChip}>Your setup</SectionLabel>
        <Card flush>{v.setupSteps.map((s: any, i: number) => <SupplyRow key={i} icon={s.icon} iconStyle={s.tile} name={s.name} sub={s.sub} right={s.right} last={s.last} onClick={s.go} />)}</Card>
        {v.setupComplete && (
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>You’re all set</div>
              <p style={css('margin:8px auto 0;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Ahleyia has everything she needs. Your first report lands here the day she cleans.</p>
            </div>
          </Card>
        )}
        <NoteCard tone="money" icon="🧾"><b>Nothing is charged while you set up.</b> Your card is charged once, in full, when Ahleyia arrives for a clean — never twice. Tips, if you add one, are charged separately.</NoteCard>
        <Button variant="green" onClick={v.setupPrimary}>{v.setupPrimaryLabel}</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.openAhleyia}>Ask Ahleyia to set it up with me</Button></div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Schedule -- */
function Schedule({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeUpcoming} title={v.scheduleTitle} subtitle="Change anything here — reschedule, add a service, or cancel" />
      <div style={css('padding:22px')}>
        <NoteCard tone="cream" icon="⏱️"><b>Your two-hour arrival window.</b> Ahleyia arrives inside the window you pick — you’ll get a “on her way” notification when she leaves her last stop. No all-day waiting.</NoteCard>
        <SectionLabel right={v.chipThisWeek}>Scheduled</SectionLabel>
        {v.bookings.map((b: any, i: number) => (
          <Card key={i}>
            <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:10px')}>
              <div>
                <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>{b.name}</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{b.service}</div>
              </div>
              {b.chip}
            </div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:12px')}>{b.metas}</div>
            <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:10px 12px')}>{b.note}</div>
            <div style={css('display:flex;gap:8px;margin-top:12px')}>
              <Button variant="ghost" size="sm" onClick={b.reschedule}>Reschedule</Button>
              <Button size="sm" onClick={b.addService}>Add a service</Button>
            </div>
            <div style={css('margin-top:10px;text-align:center')}><span style={css('font-size:11.5px;color:var(--text-muted);cursor:pointer;text-decoration:underline')} onClick={b.cancel}>Cancel this clean</span></div>
          </Card>
        ))}
        <SectionLabel>Good to know</SectionLabel>
        <Card flush>
          <SupplyRow icon="📅" name="Change it free up to 24 hours ahead" sub="Reschedule or cancel with a day’s notice and nothing is charged" right={v.chipFree} />
          <SupplyRow icon="⏳" name="Inside 24 hours" sub="50% of the service holds her day for you — she’d already turned work away" right={v.chipHalf} />
          <SupplyRow icon="🎁" name="One courtesy waiver" sub={v.waiverSub} right={v.waiverChip} />
          <SupplyRow icon="🧽" name="If the change is on her side" sub="Never a charge to you, and you get first pick of the new time" right={v.chipNoCharge} last />
        </Card>
        <Button variant="ghost" icon="📅" onClick={v.goCalendar}>See her open days</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" icon="➕" onClick={v.goAddClean}>Book an extra clean</Button></div>
      </div>
    </>
  )
}

/* ---------------------------------------------------------- Reschedule -- */
function Reschedule({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.noticeBadge} title="Move this clean" subtitle={v.bookingLine} />
      <div style={css('padding:22px')}>
        {v.rsForm && (<>
          <NoteCard tone={v.noticeTone} icon={v.noticeIcon}>{v.noticeCopy}</NoteCard>
          <Card>
            <SectionLabel>New day</SectionLabel>
            <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
              {v.dayOpts.map((d: any, i: number) => (
                <div key={i} style={{ ...css('border-radius:var(--radius-md);padding:10px 6px;text-align:center;cursor:pointer'), border: '1px solid ' + d.border, background: d.bg, color: d.color }} onClick={d.pick}>
                  <div style={css('font-family:var(--font-spaced);font-size:8.5px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;opacity:.8')}>{d.dow}</div>
                  <div style={css('font-family:var(--font-serif-display);font-size:20px;line-height:1.1;margin-top:3px')}>{d.day}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionLabel>Two-hour arrival window</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.windowOpts.map((w: any, i: number) => <Pill key={i} selected={w.on} onClick={w.pick}>{w.label}</Pill>)}</div>
            <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>She arrives inside this window and texts when she’s on her way. Turnovers are matched to your guest times automatically.</p>
          </Card>
          <Card>
            <SectionLabel>Just this one, or from now on?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.scopeRs.map((r: any, i: number) => <Pill key={i} selected={r.on} onClick={r.pick}>{r.label}</Pill>)}</div>
          </Card>
          <Button variant="green" onClick={v.confirmReschedule}>{v.rsConfirmLabel}</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.openAhleyia}>Ask Ahleyia for a different time</Button></div>
        </>)}
        {v.rsDone && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>Moved</div>
              <p style={css('margin:8px auto 0;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.rsDoneCopy}</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="📅" name={v.rsNewWhen} sub="Two-hour arrival window · she’ll text on her way" right={v.chipConfirmed} />
            <SupplyRow icon="💳" name={v.rsChargeLine} sub="Nothing is charged until she arrives" right={v.rsChargeChip} last />
          </Card>
          <Button onClick={v.goSchedule}>Back to my schedule</Button>
        </>)}
      </div>
    </>
  )
}

/* ----------------------------------------------------------- AddService -- */
function AddService({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAddOn} title={v.addTitle} subtitle={v.addSub} />
      <div style={css('padding:22px')}>
        {v.addExtraClean && (
          <Card>
            <SectionLabel>Which home?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.homeOpts.map((h: any, i: number) => <Pill key={i} selected={h.on} onClick={h.pick}>{h.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>What kind of clean?</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.extraKinds.map((k: any, i: number) => <Pill key={i} selected={k.on} onClick={k.pick}>{k.label}</Pill>)}</div>
          </Card>
        )}
        <SectionLabel>Add to this visit</SectionLabel>
        <Card flush>{v.addOns.map((a: any, i: number) => <SupplyRow key={i} icon={a.icon} name={a.name} sub={a.sub} flag={a.flag} right={a.right} last={a.last} onClick={a.toggle} />)}</Card>
        <Card>
          <SectionLabel>Just this visit, or every time?</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.addScope.map((r: any, i: number) => <Pill key={i} selected={r.on} onClick={r.pick}>{r.label}</Pill>)}</div>
        </Card>
        <PriceBox rows={v.addRows} label={v.addTotalLabel} footnote="Charged once, with the clean, on arrival" amount={v.addTotal} />
        <div style={css('margin-top:16px')}><Button variant="green" onClick={v.confirmAddOns}>{v.addConfirmLabel}</Button></div>
        <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Ahleyia confirms the extra time before your window — she’ll message you if it needs a longer visit.</p>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Cancel -- */
function Cancel({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.noticeBadge} title="Cancel this clean" subtitle={v.bookingLine} />
      <div style={css('padding:22px')}>
        {v.cxForm && (<>
          <Card>
            <SectionLabel>What’s changed?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.cancelReasons.map((c: any, i: number) => <Pill key={i} selected={c.on} onClick={c.pick}>{c.label}</Pill>)}</div>
          </Card>
          <Card>
            <SectionLabel right={v.noticeChip}>What this costs you</SectionLabel>
            <div style={{ ...css('font-family:var(--font-serif-display);font-size:44px;line-height:1.05'), color: v.feeColor }}>{v.feeAmount}</div>
            <p style={css('margin:8px 0 0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.feeExplainer}</p>
          </Card>
          {v.canWaive && (
            <NoteCard tone="pink" icon="🎁"><b>You have one courtesy waiver.</b> Life happens — use it and the 50% is dropped, once per year. It stays available if the change was ever on her side.
              <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.useWaiver}>Use my courtesy waiver</Button></div>
            </NoteCard>
          )}
          {v.waiverApplied && <NoteCard tone="eco" icon="✓"><b>Waiver applied — nothing to pay.</b> That was your one for the year. Ahleyia is told it was covered, so she’s made whole either way.</NoteCard>}
          {v.staffReason && <NoteCard tone="eco" icon="🧽"><b>This one’s on us.</b> When the change comes from her side there’s no fee, your waiver stays unused, and you get first pick of the new time — usually same or next day.</NoteCard>}
          <Card>
            <SectionLabel>Rather move it than lose it?</SectionLabel>
            <p style={css('margin:0 0 12px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Rescheduling inside 24 hours is free once she can fill the slot — most weeks she can.</p>
            <Button onClick={v.goReschedule}>Reschedule instead</Button>
          </Card>
          <Button variant="ghost" onClick={v.confirmCancel}>{v.cancelConfirmLabel}</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Recurring cleans continue as normal — only this visit is cancelled.</p>
        </>)}
        {v.cxDone && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('font-size:34px')}>📅</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:8px')}>Cancelled</div>
              <p style={css('margin:8px auto 0;max-width:260px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.cxDoneCopy}</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="💳" name={v.cxChargeLine} sub={v.cxChargeSub} right={v.cxChargeChip} />
            <SupplyRow icon="📅" name="Your next clean" sub={v.cxNextSub} right={v.chipConfirmed} last />
          </Card>
          <Button onClick={v.goSchedule}>Back to my schedule</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.openAhleyia}>Message Ahleyia</Button></div>
        </>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------- QuoteReceived -- */
function QuoteReceived({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.badgeFromAhleyia} title="Your tailored quote" subtitle={v.quoteForLine} />
      <div style={css('padding:22px')}>
        {v.qNew && (<>
          <Card>
            <SectionLabel action={v.quoteScopeAction}>The spaces you want cared for</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.quoteScopes.map((q: any, i: number) => <Pill key={i} selected={q.on} onClick={q.pick}>{q.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>How often?</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.quoteCadence.map((qc: any, i: number) => <Pill key={i} selected={qc.on} onClick={qc.pick}>{qc.label}</Pill>)}</div>
            <div style={css('height:1px;background:var(--border-default);margin:18px 0')} />
            <div style={css('text-align:center')}>
              <div style={css('font-family:var(--font-spaced);font-size:9.5px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--text-muted)')}>Your price, per clean</div>
              <div style={css('font-family:var(--font-serif-display);font-size:56px;line-height:1.02;color:var(--magenta);margin-top:6px')}>{v.quotePrice}</div>
              <p style={css('margin:10px auto 0;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Bespoke to your home, like a tailor. One flat number — nothing added later.</p>
            </div>
          </Card>
          <SectionLabel>What’s included</SectionLabel>
          <Card flush>
            <SupplyRow icon="📋" name="The Kee Method™" sub="Her trademarked system, every visit — same order, same standard" right={v.chipIncl} />
            <SupplyRow icon="🌱" name="Eco & non-toxic products" sub="Zero bleach or ammonia — safe for family, pets and air" right={v.chipIncl} />
            <SupplyRow icon="📷" name="Photo-verified report" sub="Timestamped proof after every clean, kept in your archive" right={v.chipIncl} />
            <SupplyRow icon="🍃" name="Signature scent finish" sub="Your choice of natural essential-oil mist" right={v.chipIncl} last />
          </Card>
          <NoteCard tone="pink" icon="💌">“I walked your listing and your notes — this covers the main level weekly, staged the way you like it. Any questions, just ask.” — <b>Ahleyia</b></NoteCard>
          <SectionLabel right={v.chipSecure}>Card on file</SectionLabel>
          <Card>
            <p style={css('margin:0 0 12px;font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}><b>Major credit card only</b> — Visa, Mastercard, Amex, Discover. Debit cards aren’t accepted (it protects both of you from fraud).</p>
            <CardField />
          </Card>
          <NoteCard tone="money" icon="🧾"><b>{BILLING}</b> She’s paid 50% on arrival and the final 50% the moment you approve, or automatically in 48h. Tips are charged separately.</NoteCard>
          <Card>
            <div style={css('display:flex;gap:12px;align-items:flex-start')}>
              <Checkbox checked={v.consent} onChange={v.setConsent} size={22} />
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>I authorize She’s Maid In ATL to charge my card for the full service amount on arrival. Ahleyia is paid 50% on arrival and 50% on my approval; if I don’t respond within 48 hours the balance releases automatically. Tips are charged separately.</div>
            </div>
          </Card>
          <Button variant="green" onClick={v.acceptQuote}>Accept & book</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.openAhleyia}>Ask Ahleyia a question</Button></div>
          <div style={css('margin-top:16px;text-align:center')}><span style={css('font-size:11.5px;color:var(--text-muted);cursor:pointer;text-decoration:underline')} onClick={v.declineQuote}>No thanks, not right now</span></div>
        </>)}
        {v.qAccepted && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1;margin-top:12px')}>You’re booked</div>
              <p style={css('margin:8px auto 0;max-width:260px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Ahleyia has your home on her weekly route. She’ll confirm your first day in the thread.</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="📅" name="First clean" sub="Proposed: Tuesday, July 28 · window 10–2" right="›" onClick={v.goSchedule} />
            <SupplyRow icon="🧮" name="Your price" sub={v.quotePriceSub} right={v.chipIncl} />
            <SupplyRow icon="🌱" name="Products & scent" sub="Eco & non-toxic · pick your finish" right="›" onClick={v.goProducts} last />
          </Card>
          <NoteCard tone="money" icon="🧾"><b>One charge, on arrival.</b> Your card is charged once for the full amount when she arrives — never twice. Tips, if you add one, are charged separately.</NoteCard>
          <Button onClick={v.goOwnerHome}>See my homes</Button>
        </>)}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Dispute -- */
function Dispute({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeWeFix} title="Tell us what’s off" subtitle="Ahleyia sees this immediately — and she’ll make it right" />
      <div style={css('padding:22px')}>
        {v.dOpenForm && (<>
          <NoteCard tone="pink" icon="💌">Nobody’s in trouble here. Tell her what you’re seeing and she comes back to fix it — that’s how the standard holds.</NoteCard>
          <Card>
            <SectionLabel>What’s off?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.dispCats.map((d: any, i: number) => <Pill key={i} selected={d.on} onClick={d.pick}>{d.label}</Pill>)}</div>
          </Card>
          <Card>
            <SectionLabel>Show her</SectionLabel>
            <div style={css('display:flex;gap:10px;align-items:center')}>
              <div style={css('width:96px;height:96px;border-radius:var(--radius-lg);background:var(--photo-1);position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;border:1px dashed var(--tint-pink-line)')} onClick={v.attachDispPhoto}>
                {v.dispPhoto ? <div style={css('position:absolute;bottom:8px;left:8px;background:var(--stamp-scrim);color:#fff;font-size:9.5px;padding:3px 7px;border-radius:7px;backdrop-filter:blur(2px)')}>📍 2:14 PM</div> : '📷'}
              </div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.dispPhotoLabel}</div>
            </div>
            <div style={css('margin-top:12px')}><TextField icon="✏️" placeholder="The guest bath mirror still has spots…" value={v.dispNote} onChange={v.setDispNote} /></div>
          </Card>
          <SectionLabel>How this gets resolved</SectionLabel>
          <Card flush>
            <SupplyRow icon="1" iconStyle={v.stopTile} name="Ahleyia returns to make it right" sub="A re-clean of what’s flagged, at no cost to you — usually same or next day" />
            <SupplyRow icon="2" iconStyle={v.stopTile} name="If that’s not possible" sub="A credit toward your next clean, or a refund of the affected portion" last />
          </Card>
          <NoteCard tone="warn" icon="⏳">Opening this <b>pauses the 48h auto-release</b> of her final 50% until it’s settled. Nothing extra is charged, and nothing is taken back.</NoteCard>
          <Button onClick={v.sendDispute}>Send to Ahleyia</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goReport}>Never mind — it’s fine</Button></div>
        </>)}
        {v.dSent && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background:var(--gradient-brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto')}>💬</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>She’s on it</div>
              <p style={css('margin:8px auto 0;max-width:260px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Ahleyia has your note and photo. She’ll reply in your thread with a time to come back.</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="⏳" name="Auto-release paused" sub="Her final 50% stays put until this is settled" right={v.chipPaused} />
            <SupplyRow icon="📋" name="Logged to your record" sub="Report, photos and this note are kept together" right={v.chipReady} last />
          </Card>
          <Button onClick={v.openAhleyia}>Open the thread</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.resolveDispute}>She fixed it — release her payment</Button></div>
        </>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- EditList -- */
function EditList({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAdjust} title="Edit reorder list" subtitle="Adjust quantities before you approve" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="🛍️">Ahleyia flagged these as low across units 1604, 1403 & 1913. Set any to zero to leave it out.</NoteCard>
        <Card>{v.ownerCart.map((it: any) => <SupplyRow key={it.id} icon={it.icon} name={it.name} sub={it.sub} right={<Stepper value={v.qty(it.id, it.def)} onChange={(n: number) => v.setQty(it.id, n)} />} last={it.last} />)}</Card>
        <Card>
          <div style={css('display:flex;justify-content:space-between;align-items:baseline')}>
            <div>
              <div style={css('font-size:13px;font-weight:var(--weight-semibold)')}>{v.cartCount} items</div>
              <div style={css('font-size:11px;color:var(--text-muted);margin-top:2px')}>Delivered via Instacart</div>
            </div>
            <span style={css('font-family:var(--font-serif-display);font-size:26px')}>$134.80</span>
          </div>
        </Card>
        <Button variant="green" onClick={v.openCart}>🛒 Approve & order</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goOwnerSupplies}>Back to supplies</Button></div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Gallery -- */
function Gallery({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="report" onBack={v.goBack} badge={v.galleryBadge} title={v.galleryTitle} subtitle={v.gallerySub} />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:var(--stack-card)')}>
          {v.galleryTabs.map((t: any, i: number) => <Pill key={i} selected={t.on} onClick={t.pick}>{t.label}</Pill>)}
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {v.galleryShots.map((g: any, i: number) => (
            <div key={i} style={{ ...css('position:relative;height:150px;border-radius:var(--radius-lg);overflow:hidden'), background: g.wash }}>
              <div style={css('position:absolute;bottom:0;left:0;right:0;height:70px;background:linear-gradient(transparent,rgba(0,0,0,.6))')} />
              <div style={css('position:absolute;bottom:9px;left:9px;right:9px;color:#fff')}>
                <div style={css('font-size:11.5px;font-weight:var(--weight-semibold);line-height:1.25')}>{g.label}</div>
                <div style={css('font-size:9.5px;opacity:.85;margin-top:2px')}>{g.stamp}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={css('height:var(--stack-card)')} />
        <NoteCard tone="pink" icon="🖼️">{v.galleryNote}</NoteCard>
        <Button variant="ghost" onClick={v.galleryBack}>{v.galleryBackLabel}</Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- Rate -- */
function Rate({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeRate} title="Rate & thank Ahleyia" subtitle="She reads every one of these" />
      <div style={css('padding:22px')}>
        {v.rateForm && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <Avatar initials="AK" size={52} style={{ margin: '0 auto' }} />
              <div style={css('font-size:14px;font-weight:var(--weight-semibold);margin-top:10px')}>How was today’s clean?</div>
              <div style={css('display:flex;gap:8px;justify-content:center;margin-top:12px')}>
                {v.stars.map((st: any, i: number) => <div key={i} style={{ ...css('font-size:32px;line-height:1;cursor:pointer'), filter: st.filter }} onClick={st.pick}>⭐</div>)}
              </div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:10px')}>{v.rateWord}</div>
            </div>
          </Card>
          <Card>
            <SectionLabel>What stood out?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.praiseChips.map((p: any, i: number) => <Pill key={i} selected={p.on} onClick={p.pick}>{p.label}</Pill>)}</div>
            <div style={css('margin-top:12px')}><TextField icon="💬" placeholder="Add a note for Ahleyia…" value={v.rateNote} onChange={v.setRateNote} /></div>
          </Card>
          <NoteCard tone="money" icon="💰">{v.rateTipLine}</NoteCard>
          <Button onClick={v.sendRating}>Send it</Button>
        </>)}
        {v.rateSent && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('font-size:36px')}>💕</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:8px')}>She’ll see this today</div>
              <p style={css('margin:8px auto 0;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Thank you — reviews like yours are how her card gets passed along.</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="⭐" name={v.rateSummary} sub="Added to her 4.98 rating" right={v.chipReady} />
            <SupplyRow icon="💌" name="Refer a friend" sub="Send her card to someone who needs her" right="›" onClick={v.toastInvite} last />
          </Card>
          <Button onClick={v.goOwnerHome}>Back to my homes</Button>
        </>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Receipts -- */
function Receipts({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeOneCharge} title="Receipts" subtitle="One charge per clean · VISA ···· 4242" />
      <div style={css('padding:22px')}>
        <NoteCard tone="money" icon="🧾"><b>One charge, on arrival.</b> Each line below is a single full-amount charge. The 50/50 split is how Ahleyia is <b>released</b> — never a second charge to you.</NoteCard>
        <SectionLabel right={v.chipJuly}>This month</SectionLabel>
        <Card flush>{v.receipts.map((r: any, i: number) => <SupplyRow key={i} icon={r.icon} name={r.name} sub={r.sub} right={r.right} last={r.last} />)}</Card>
        <Card>
          <div style={css('display:flex;justify-content:space-between;align-items:baseline')}>
            <div>
              <div style={css('font-size:13px;font-weight:var(--weight-semibold)')}>July total</div>
              <div style={css('font-size:11px;color:var(--text-muted);margin-top:2px')}>8 cleans · 2 tips · 2 supply orders</div>
            </div>
            <span style={css('font-family:var(--font-serif-display);font-size:28px')}>$1,974.75</span>
          </div>
        </Card>
        <Button variant="ghost" icon="💌" onClick={v.toastEmailReceipts}>Email me these receipts</Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------- EditDetail -- */
function EditDetail({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.editBadge} title={v.editTitle} subtitle={v.editSub} />
      <div style={css('padding:22px')}>
        {v.editPhone && (
          <Card>
            <SectionLabel>Mobile number</SectionLabel>
            <Field icon="📱"><NativeInput type="tel" inputMode="tel" autoComplete="tel" aria-label="Mobile number" placeholder={v.clientPhone} value={v.editValue} onChange={v.setEditValue} /></Field>
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>This is how you sign in and how Ahleyia reaches you on the day. We’ll text a code to confirm the new number.</p>
          </Card>
        )}
        {v.editEmail && (
          <Card>
            <SectionLabel>Email</SectionLabel>
            <Field icon="💌"><NativeInput type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} aria-label="Email" placeholder={v.clientEmail} value={v.editValue} onChange={v.setEditValue} /></Field>
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Your photo-verified reports and receipts are sent here after every clean.</p>
          </Card>
        )}
        {v.editCard && (<>
          <Card>
            <div style={css('display:flex;align-items:center;gap:12px')}>
              <div style={css('width:42px;height:42px;border-radius:var(--radius-md);background:var(--surface-cream);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0')}>💳</div>
              <div style={css('flex:1')}>
                <div style={css('font-size:14px;font-weight:var(--weight-semibold)')}>VISA ···· 4242</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Current card · exp 04/28</div>
              </div>
              <Chip tone="ghost">Replacing</Chip>
            </div>
          </Card>
          {v.squareReady ? (
            <SquareCardForm ownerId={v.beOwnerId} orgId={v.beOrgId} onSaved={v.onCardSaved} />
          ) : (<>
            <Card>
              <SectionLabel>New card</SectionLabel>
              <p style={css('margin:0 0 12px;font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}><b>Major credit card only</b> — Visa, Mastercard, Amex, Discover. Debit cards aren’t accepted (it protects both of you from fraud).</p>
              <Field icon="💳"><NativeInput type="tel" inputMode="numeric" autoComplete="cc-number" aria-label="Card number" placeholder="Card number" value={v.editValue} onChange={v.setEditValue} /></Field>
              <div style={css('display:flex;gap:8px;margin-top:8px')}>
                <Field><NativeInput type="tel" inputMode="numeric" autoComplete="cc-exp" aria-label="Expiry" placeholder="MM / YY" /></Field>
                <Field><NativeInput type="tel" inputMode="numeric" autoComplete="cc-csc" aria-label="Security code" placeholder="CVC" /></Field>
              </div>
            </Card>
            <NoteCard tone="money" icon="🧾"><b>Nothing changes about how you’re billed.</b> One charge, in full, when Ahleyia arrives — never twice. Your new card takes over from the next clean.</NoteCard>
          </>)}
        </>)}
        {!(v.editCard && v.squareReady) && <Button variant="green" onClick={v.saveEdit}>{v.editSaveLabel}</Button>}
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.goAccount}>Cancel</Button></div>
      </div>
    </>
  )
}
