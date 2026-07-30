/* Cleaner zone — working (Today, Route, Check-in, Active clean, Luxury clean,
   Assistant, Supplies, Share card, Quote Builder, My Week, Payouts, Tax,
   Templates, Inbox, Settings, Flag, Move) and admin (Dashboard, Team, Clients,
   Business settings, Service area, Assign). Ported from the reference prototype. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import {
  Button, Card, Chip, Pill, Avatar, IconButton, SectionLabel, StatTile, NoteCard,
  DetailHeader, JobCard, ProgressRing, PhaseAccordion, ChecklistTask, SupplyRow,
  PriceBox, Stepper, TextField, Checkbox,
} from '../../ds/components'
import { AddClientScreen, AddStaffScreen, AddPropertyScreen } from './invite'

const ICON = './assets/brand/app-icon.png'
const QR = './assets/brand/share-card-qr.png'

function TabHeader({ title, big, children }: { title: React.ReactNode; big?: boolean; children: React.ReactNode }) {
  return (
    <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
      <div style={{ ...css('flex:1'), ...(big ? css('font-family:var(--font-serif-display);font-size:24px') : {}) }}>{title}</div>
      {children}
    </div>
  )
}

export function CleanerScreens(v: any) {
  if (v.cToday) return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:19px;color:var(--orange)')}>Maid In <span style={{ color: 'var(--magenta)' }}>ATL</span></div>
        <IconButton icon="☰" onClick={v.openMenu} />
        {v.meIsAdmin && <IconButton icon="👑" onClick={v.goAdmin} />}
        <IconButton icon="💬" onClick={v.goInbox} />
        <Avatar initials={v.meInitials} size={38} onClick={v.goSettings} style={{ cursor: 'pointer' }} />
      </div>
      <div style={css('padding:16px 22px 22px')}>
        <div style={css('font-size:13px;color:var(--text-muted)')}>Good morning,</div>
        <div style={css('font-family:var(--font-serif-display);font-size:30px;line-height:1.1')}>{v.meFirst} 👋</div>
        <div style={css('font-size:12px;color:var(--text-muted);margin-top:4px')}>{v.todayLine || 'Friday, July 24 · 3 properties on today’s route'}</div>
        <div style={css('display:flex;gap:var(--gap-tile);margin:16px 0 4px')}>
          <StatTile value={v.liveTodayCount ?? '3'} label="Cleans today" accent color="var(--orange)" style={{ flex: 1 }} />
          {v.liveClientCount != null
            ? <StatTile value={v.liveClientCount} label="Clients" color="var(--magenta)" style={{ flex: 1 }} />
            : (v.liveWeekCount != null
              ? <StatTile value={v.liveWeekCount} label="Cleans this week" color="var(--magenta)" style={{ flex: 1 }} />
              : <StatTile value="2" label="Turnovers before 4pm" color="var(--magenta)" style={{ flex: 1 }} />)}
        </div>
        {v.unreadNudge && (
          <Card onClick={v.unreadNudge.go} style={{ cursor: 'pointer' }}>
            <div style={css('display:flex;align-items:center;gap:12px')}>
              <div style={css('width:38px;height:38px;border-radius:50%;background:var(--gradient-brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0')}>🔔</div>
              <div style={css('flex:1;font-size:13px;font-weight:var(--weight-semibold)')}>{v.unreadNudge.label}</div>
              <div style={css('font-size:16px;color:var(--text-muted)')}>›</div>
            </div>
          </Card>
        )}
        {v.noJobs && (<>
          <Card tone="blush">
            <div style={css('text-align:center;padding:6px 4px')}>
              <div style={css('font-size:34px')}>🌱</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Your route is clear</div>
              <p style={css('margin:8px auto 16px;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Nothing booked today. Share your card — that’s how the next three homes found you.</p>
              <Button icon="💌" onClick={v.goShare}>Share my card</Button>
              {v.meIsAdmin && <div style={css('margin-top:8px')}><Button variant="ghost" onClick={v.goQuote}>Build a quote for a lead</Button></div>}
            </div>
          </Card>
          <NoteCard tone="eco" icon="✨">Quiet days are good days to restock. Two units are below par on paper towels.</NoteCard>
        </>)}
        {/* Live account: the route is the jobs that are actually booked. */}
        {v.hideSeedRoute && v.hasJobs && (<>
          <SectionLabel>{v.liveNextLabel}</SectionLabel>
          {v.liveJobCards.map((j: any) => (
            <JobCard key={j.id} name={j.name} address={j.address} type={j.type} typeTone={j.tone}
              guestOut={j.guestOut} guestIn={j.guestIn} metas={j.metas}
              progress={j.progress} progressLabel={j.progressLabel} onClick={j.open} />
          ))}
          <NoteCard tone="eco" icon="✅">Open a home to work its Kee Method™ checklist. Every tick saves as you go — the owner’s report writes itself.</NoteCard>
        </>)}
        {!v.hideSeedRoute && v.hasJobs && (<>
          <SectionLabel action="Map view" onAction={v.goMap}>Today’s route</SectionLabel>
          <NoteCard tone="money" icon="📍"><b>You’re at the Hartwell Estate.</b> Check in to charge the owner’s card and release your 50% now.
            <div style={css('margin-top:10px')}><Button variant="green" size="sm" onClick={v.goCheckin}>Check in & start</Button></div>
          </NoteCard>
          <JobCard name="The Hartwell Estate" address="📍 214 Tuxedo Rd NW, Buckhead" type="Turnover" typeTone="turn" guestOut="11:00 AM" guestIn="4:00 PM" metas={v.metasHartwell} progress={v.jobPct} progressLabel={v.jobLabel} onClick={v.goJob} />
          <JobCard name="Skyline Loft 12B" address="📍 1065 Peachtree St NE, Midtown" type="Turnover" typeTone="turn" guestOut="10:00 AM" guestIn="3:00 PM" metas={v.metasLoft} progress={0} progressLabel="Not started" onClick={v.goJob} />
          <JobCard name="Ridgeview Owner’s Home" address="📍 88 Valley Rd, Sandy Springs" type="Refresh clean" typeTone="refresh" metas={v.metasRidge} progress={0} progressLabel="Not started" onClick={v.goLux} />
          <Card flush><SupplyRow icon="TJ" iconStyle={v.akTile} name="Tiana is on the Skyline job" sub="See what your assistant sees" right="›" onClick={v.goAssist} last /></Card>
        </>)}
      </div>
    </>
  )

  if (v.cMap && v.liveChecklist) return <LiveClean v={v} />
  if (v.cMap) return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeStops} title="Friday’s Route" subtitle="Buckhead → Midtown → Sandy Springs · ~34 mi" />
      <div style={css('padding:22px')}>
        <Card padding={0}>
          <div style={css('position:relative;height:200px;border-radius:22px 22px 0 0;overflow:hidden;background:linear-gradient(160deg,#EFE6EC,#E7EEE6)')}>
            <div style={css('position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:34px 34px;opacity:.7')} />
            <div style={css('position:absolute;left:14%;top:66%;width:72%;height:2px;background:var(--magenta);opacity:.5;transform:rotate(-28deg);transform-origin:left center')} />
            {[[16, 62, '1'], [46, 41, '2'], [76, 20, '3']].map(([l, t, n]) => (
              <div key={n as string} style={{ ...css('position:absolute;width:30px;height:30px;border-radius:50%;background:var(--gradient-brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:var(--weight-semibold);box-shadow:0 6px 14px -6px rgba(200,28,126,.7)'), left: l + '%', top: t + '%' }}>{n}</div>
            ))}
            <div style={css('position:absolute;left:12px;bottom:12px;background:rgba(42,23,32,.72);color:#fff;font-size:10.5px;padding:5px 10px;border-radius:999px;backdrop-filter:blur(2px)')}>🚗 ~52 min driving total</div>
          </div>
          <div style={css('padding:6px 16px')}>
            <SupplyRow icon="1" iconStyle={v.stopTile} name="The Hartwell Estate" sub="214 Tuxedo Rd NW, Buckhead · window 11–4" right={v.time1100} />
            <div style={css('display:flex;gap:8px;align-items:center;font-size:11px;color:var(--text-muted);padding:0 0 10px 54px')}>↓ 14 min · 7.2 mi via GA-400 S</div>
            <SupplyRow icon="2" iconStyle={v.stopTile} name="Skyline Loft 12B" sub="1065 Peachtree St NE, Midtown · guest in 3:00" right={v.time1230} />
            <div style={css('display:flex;gap:8px;align-items:center;font-size:11px;color:var(--text-muted);padding:0 0 10px 54px')}>↓ 22 min · 11.4 mi via I-85 N</div>
            <SupplyRow icon="3" iconStyle={v.stopTile} name="Ridgeview Owner’s Home" sub="88 Valley Rd, Sandy Springs · anytime 2–6" right={v.time200} last />
          </div>
        </Card>
        <Button icon="📍" onClick={v.openNav}>Start navigation</Button>
        <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Opens in the maps app you already use — Apple Maps, Google Maps or Waze.</p>
      </div>
    </>
  )

  {/* The check-in, luxury-clean, assist and active-clean screens are seed
      showcases built around fake homes (Hartwell, Ridgeview, Skyline). On a
      live account they must never render — LiveClean shows the real open clean,
      or an honest "no clean open" state. */}
  if (v.cCheckin) return v.liveChecklist ? <LiveClean v={v} /> : <Checkin v={v} />
  if (v.cJob) return v.liveChecklist ? <LiveClean v={v} /> : <ActiveClean v={v} />
  if (v.cLux) return v.liveChecklist ? <LiveClean v={v} /> : <LuxClean v={v} />
  if (v.cAssist) return v.liveChecklist ? <LiveClean v={v} /> : <Assist v={v} />
  if (v.cSupplies) return <Supplies v={v} />

  if (v.cShare) return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeStorefront} title="Your digital card" subtitle="Scan or text — opens the public view of your app" />
      <div style={css('padding:22px')}>
        <Card padding={0}>
          <div style={css('background:var(--pink);padding:26px 22px;text-align:center;border-radius:22px 22px 0 0')}>
            <div style={css('font-family:var(--font-serif-display);font-size:26px;line-height:1.1;color:var(--orange)')}>{v.bizName}</div>
            <div style={css('font-family:var(--font-spaced);font-size:9.5px;letter-spacing:var(--tracking-spaced-wide);text-transform:uppercase;color:var(--orange-deep);margin-top:8px')}>Luxury Housekeeping</div>
            <div style={css('display:flex;gap:var(--gap-chip);justify-content:center;margin-top:14px')}>
              <Chip tone="refresh">🌱 Eco-conscious</Chip>
              <Chip tone="turn">⭐ 5-star guaranteed</Chip>
            </div>
          </div>
          <div style={css('padding:18px;display:flex;align-items:center;gap:16px')}>
            <div style={css('background:#fff;border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:8px;flex-shrink:0')}>
              <img src={QR} alt="QR code to your public card" style={{ width: 96, height: 96, display: 'block', imageRendering: 'pixelated' }} />
            </div>
            <div style={css('font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}>
              <div style={css('color:var(--ink);font-weight:var(--weight-semibold);margin-bottom:4px')}>Scan → opens your public card</div>
              {v.shareContact}
            </div>
          </div>
        </Card>
        <Card>
          <SectionLabel>Or text it to them right now</SectionLabel>
          <div style={css('display:flex;gap:8px;align-items:center')}>
            <Field icon="📱"><NativeInput type="tel" inputMode="tel" aria-label="Client’s number" placeholder="Client’s number" /></Field>
            <Button size="sm" onClick={v.toastSent}>Send</Button>
          </div>
          <p style={css('margin:10px 0 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>{v.sharePromo}</p>
        </Card>
        <Button variant="ghost" icon="🔗" onClick={v.toastCopied}>Copy my card link</Button>
      </div>
    </>
  )

  if (v.cQuote) return <QuoteBuilder v={v} />
  if (v.cProfile) return <MyWeek v={v} />
  if (v.cInbox) return <Inbox v={v} />
  if (v.cSettings) return <Settings v={v} />
  if (v.cFlag) return v.liveChecklist ? <LiveClean v={v} /> : <Flag v={v} />
  if (v.cMove) return <Move v={v} />
  if (v.cPayouts) return <Payouts v={v} />
  if (v.cTax) return <Tax v={v} />
  if (v.cTemplate) return <Template v={v} />

  // ---- admin ----
  if (v.aDash) return <AdminDash v={v} />
  if (v.aTeam) return <Team v={v} />
  if (v.aAddClient) return <AddClientScreen v={v} />
  if (v.aAddStaff) return <AddStaffScreen v={v} />
  if (v.aAddProp) return <AddPropertyScreen v={v} />
  if (v.aAvail) return <Availability v={v} />
  if (v.aClients) return <Clients v={v} />
  if (v.aSettings) return <BizSettings v={v} />
  if (v.aArea) return <Area v={v} />
  if (v.aAssign) return <Assign v={v} />

  return null
}

/* ------------------------------------------------------------- Check-in -- */
function Checkin({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.checkinBadge} title="The Hartwell Estate" subtitle="📍 214 Tuxedo Rd NW · window 11–4" />
      <div style={css('padding:22px')}>
        {v.ciReady && (<>
          <Card tone="blush">
            <div style={css('display:flex;align-items:center;gap:14px')}>
              <div style={css('width:52px;height:52px;border-radius:50%;background:var(--tint-green);border:1px solid var(--tint-green-line);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0')}>📍</div>
              <div>
                <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>You’re here</div>
                <div style={css('font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:4px')}>Within the geofence ✓ &nbsp;·&nbsp; 11:04 AM &nbsp;·&nbsp; guest out at 11:00</div>
              </div>
            </div>
          </Card>
          <SectionLabel>Before you start</SectionLabel>
          <Card flush>
            <SupplyRow icon="📋" name="The Kee Method™ · Turnover" sub="26 steps · 4 photo moments" right={v.chipReady} />
            <SupplyRow icon="🔑" name="This home’s standard" sub="Egyptian cotton · towels in thirds · diffuser on · 70°" right={v.chipReady} />
            <SupplyRow icon="🍃" name="Eco products & scent" sub="Simple Green · Benefect · eucalyptus-mint finish" right={v.chipReady} last />
          </Card>
          <NoteCard tone="money" icon="💰">Checking in charges the owner’s card for the full amount and <b>releases your 50% instantly</b>. One charge, on arrival — never twice.</NoteCard>
          <Button variant="green" onClick={v.doCheckin}>Check in & start the clean</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Your arrival time and your 50% are recorded the second you tap.</p>
        </>)}
        {v.ciDone && (<>
          <Card tone="blush">
            <div style={css('display:flex;align-items:center;gap:14px')}>
              <div style={css('width:52px;height:52px;border-radius:50%;background:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0')}>✓</div>
              <div>
                <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>You’re checked in</div>
                <div style={css('font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:4px')}>11:06 AM &nbsp;·&nbsp; on site, GPS confirmed &nbsp;·&nbsp; the owner has been notified</div>
              </div>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="✓" name="On site" sub="11:06 AM · arrival recorded" right={v.chipReady} />
            <SupplyRow icon="💳" name="Owner’s card charged · $220" sub="One charge, in full — never twice" right={v.chipReady} last />
          </Card>
          <PriceBox rows={v.ciRows} label="Released to you just now" footnote="The final 50% releases on approval — or automatically in 48h" amount="$110.00" />
          <div style={css('margin-top:16px')}><Button onClick={v.goJob}>Open The Kee Method™ →</Button></div>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>You’re never chasing payment. Go do what you do.</p>
        </>)}
        {v.ciDeclined && (<>
          <Card>
            <div style={css('display:flex;align-items:flex-start;gap:14px')}>
              <div style={css('width:52px;height:52px;border-radius:50%;background:var(--tint-orange);border:1px solid var(--tint-orange-line);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0')}>✋</div>
              <div>
                <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>Don’t start yet — we’ve got it</div>
                <div style={css('font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:6px')}>The owner’s card didn’t go through, so nothing was charged and nothing was released. That’s on us to sort — not on you to work for free.</div>
              </div>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="📱" name="Owner notified" sub="Asked to update their card — right now" right={v.chipSent} />
            <SupplyRow icon="💌" name="You’re covered" sub="Your arrival is logged at 11:04 AM regardless" right={v.chipReady} />
            <SupplyRow icon="⏳" name="Job status" sub="Held until payment clears" right={v.chipHeld} last />
          </Card>
          <NoteCard tone="warn" icon="💡"><b>While you wait:</b> stay on site if you can — most cards clear within a few minutes of the owner updating them. Your window doesn’t close until 4:00.</NoteCard>
          <Button onClick={v.retryCharge}>Try the payment again</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.openHartwell}>Message the owner</Button></div>
        </>)}
      </div>
    </>
  )
}

/* ----------------------------------------------------------- Live clean --
   The same screen as ActiveClean, driven by rows in job_steps instead of the
   seed showcase. Every tick is written to Postgres as it happens, so the
   checklist survives a closed tab, a dead battery, or a different phone. */
function LiveClean({ v }: { v: any }) {
  if (v.liveNoOpenJob) return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAddProp} title="No clean open" subtitle="Open a home from Today to start its checklist" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('text-align:center;padding:6px 4px')}>
            <div style={css('font-size:34px')}>✅</div>
            <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Nothing in progress</div>
            <p style={css('margin:8px auto 16px;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Pick a home on Today and its Kee Method™ checklist opens here.</p>
            <Button icon="🏠" onClick={v.goToday}>Go to today’s route</Button>
          </div>
        </Card>
      </div>
    </>
  )
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.liveJobBadge} title={v.liveJobName} subtitle={v.liveJobSub}>
        <ProgressRing value={v.livePct} size={64} done={v.liveDone} total={v.liveTotal} onBrand />
      </DetailHeader>
      <div style={css('padding:22px')}>
        {v.liveOwnerName && (
          <Card flush>
            <SupplyRow icon="👤" name={v.liveOwnerName} sub="Client on this job" right={v.liveAmount} last />
          </Card>
        )}
        {v.liveStepsBusy && <NoteCard tone="cream" icon="⏳">Loading this home’s checklist…</NoteCard>}
        {v.liveStepsErr && <NoteCard tone="warn" icon="⚠️">{v.liveStepsErr}</NoteCard>}
        {v.liveNoSteps && (
          <NoteCard tone="warn" icon="📋">This job doesn’t have a checklist yet.
            <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.buildChecklist}>Build it from the Kee Method™</Button></div>
          </NoteCard>
        )}
        <Card flush>
          <SupplyRow icon="🚗" name="Tell them you’re on your way" sub="Lands on their phone, and in the app" right="›" onClick={v.liveOnMyWay} last />
        </Card>
        {!!v.liveTotal && (<>
          <NoteCard tone="eco" icon="🌱"><b>The Kee Method™.</b> Work top to bottom — it’s built so you finish with only the floors left. Each tick saves the moment you make it.</NoteCard>
          <SectionLabel right={v.liveDone + ' of ' + v.liveTotal}>Today’s checklist</SectionLabel>
          {v.livePhases.map((ph: any, i: number) => (
            <PhaseAccordion key={i} icon={ph.icon} title={ph.title} done={ph.done} total={ph.total} open={ph.open} onToggle={ph.toggle}>
              {ph.steps.map((st: any, j: number) => (
                <ChecklistTask key={j} checked={st.on} onChange={st.toggle} photoRequired={st.photo} photoAdded={st.added} onAddPhoto={st.photo ? st.add : undefined} photoWash={st.wash} photoStamp={st.stamp}>{st.label}</ChecklistTask>
              ))}
            </PhaseAccordion>
          ))}
          <NoteCard tone="pink" icon="⏱️">Running behind or need to hand this off? Move it — the owner is never charged when the change is on your side.
            <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.goMove}>Move or hand off</Button></div>
          </NoteCard>
          {!!v.livePhotoMoments && (
            <NoteCard tone={v.liveProofShort ? 'pink' : 'money'} icon={v.liveProofShort ? '📷' : '🔒'}>
              {v.liveProofShort
                ? <><b>{v.livePhotosTaken} of {v.livePhotoMoments} photo moments captured.</b> The report says this clean was documented, so the last {v.liveProofShort === 1 ? 'one' : v.liveProofShort} still need{v.liveProofShort === 1 ? 's' : ''} a picture before you can close it out.</>
                : <><b>All {v.livePhotoMoments} photo moments captured.</b> They’re private to this home’s owner — never public, never marketing.</>}
            </NoteCard>
          )}
          {v.liveJobDone
            ? <NoteCard tone="money" icon="✓">This clean is closed out. The owner has the report.</NoteCard>
            : <Button variant="green" onClick={v.liveComplete}>Complete & send owner report</Button>}
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);text-align:center')}>Owner is notified with your timestamps the moment you close it out</p>
        </>)}
      </div>
    </>
  )
}

/* --------------------------------------------------------- Active clean -- */
function ActiveClean({ v }: { v: any }) {
  const phase = (icon: string, num: number, title: string, total: number, tasks: React.ReactNode) => (
    <PhaseAccordion icon={icon} title={`${num} · ${title}`} done={v['d' + num]} total={total} open={v['open' + num]} onToggle={v['tog' + num]}>{tasks}</PhaseAccordion>
  )
  const task = (n: number, label: React.ReactNode, photo?: { wash: string; stamp: string }) => (
    <ChecklistTask checked={v['t' + n]} onChange={v['ck' + n]} photoRequired={!!photo} photoAdded={photo ? v['p' + n] : undefined} onAddPhoto={photo ? v['ap' + n] : undefined} photoWash={photo?.wash} photoStamp={photo?.stamp}>{label}</ChecklistTask>
  )
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeTurnover} title="The Hartwell Estate" subtitle="📍 214 Tuxedo Rd NW &nbsp;·&nbsp; Guest in 4:00 PM">
        <ProgressRing value={v.pct} size={64} done={v.done} total={26} onBrand />
      </DetailHeader>
      <div style={css('padding:22px')}>
        {v.offline && (
          <div style={css('display:flex;gap:10px;align-items:flex-start;background-image:var(--gradient-ink);color:#fff;border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:var(--stack-card)')}>
            <div style={css('font-size:17px;line-height:1.2')}>📴</div>
            <div style={css('flex:1')}>
              <div style={css('font-size:12.5px;font-weight:var(--weight-semibold)')}>No signal — keep going</div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);opacity:.85;margin-top:2px')}>Your checklist works offline. Photos save on your phone and sync the moment you’re back.</div>
            </div>
            <div style={css('font-size:9.5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.32);padding:4px 8px;border-radius:999px;white-space:nowrap')}>4 pending</div>
          </div>
        )}
        <div style={css('display:flex;justify-content:flex-end;margin-bottom:8px')}>
          <Pill selected={v.offline} onClick={v.toggleOffline}>{v.offlineLabel}</Pill>
        </div>
        <NoteCard tone="eco" icon="🌱"><b>The Kee Method™ · Vacation Rental Edition.</b> Work top to bottom — it’s built so you finish with only the floors left.</NoteCard>
        <NoteCard tone="pink" icon="🔑"><b>This home’s standard:</b> Egyptian cotton on all beds, hospital corners. Towels folded in thirds, monogram out. Diffuser on in foyer. Welcome note + 2 waters on the island. Thermostat set to 70°.</NoteCard>
        <NoteCard tone="cream" icon="🍃"><b>Products & scent —</b> Eco: Simple Green & Benefect Botanical only. No bleach or ammonia. Microfiber + steam. Finish: eucalyptus-mint signature mist.</NoteCard>
        <SectionLabel action={v.expandLabel} onAction={v.toggleAll}>The Kee Method™ · Turnover</SectionLabel>
        {phase('🔍', 1, 'Pre-Clean Walkthrough', 6, <>
          {task(1, 'Notify host upon arrival')}
          {task(2, 'Check under beds, in drawers, couches & closets for left-behind items')}
          {task(3, 'Check inside fridge, oven & microwave for food items')}
          {task(4, 'Inspect overall property condition & cleanliness level')}
          {task(5, 'Report missing or damaged items to host immediately')}
          {task(6, 'Take ‘before’ photos for documentation', { wash: 'var(--photo-1)', stamp: '📍 Before · 11:06 AM' })}
        </>)}
        {phase('🧺', 2, 'Laundry Process', 5, <>
          {task(7, 'Strip all beds & begin first laundry load')}
          {task(8, 'Sort into three loads: sheets · pillowcases/duvets · towels')}
          {task(9, <>Start the wash <b>before</b> beginning cleaning tasks (batch it)</>)}
          {task(10, 'Steam sheets & pillowcases for a crisp finish')}
          {task(11, 'Fold & stage towels to Airbnb presentation standard')}
        </>)}
        {phase('✨', 3, 'Cleaning Order', 7, <>
          {task(12, <>Bathrooms <b>first</b> — toilets, tubs, sinks, mirrors, fixtures</>)}
          {task(13, 'Sanitize high-touch surfaces — switches, handles, remotes')}
          {task(14, 'Dust high & low; clean bedrooms incl. nightstands & under beds')}
          {task(15, 'Make beds with fresh linens — wrinkle-free presentation', { wash: 'var(--photo-2)', stamp: '📍 Staged · 11:58 AM' })}
          {task(16, 'Clean & disinfect kitchen surfaces, sink & appliances')}
          {task(17, 'Wipe dining table, chairs & living-room surfaces')}
          {task(18, <>Vacuum & mop floors <b>LAST</b> to avoid rework & footprints</>)}
        </>)}
        {phase('🧴', 4, 'Restocking & Inventory', 4, <>
          {task(19, 'Refill toiletries — soap, shampoo, toilet paper, tissues')}
          {task(20, 'Ensure clean towels, bedding & kitchen essentials are stocked')}
          {task(21, 'Restage unit to match listing photos', { wash: 'var(--photo-3)', stamp: '📍 Matches listing · 12:22 PM' })}
          {task(22, 'Note any missing or broken items to replace → adds to Supplies')}
        </>)}
        {phase('📋', 5, 'Final Walkthrough & Host', 4, <>
          {task(23, 'Final check of all rooms for overlooked spots')}
          {task(24, 'Take ‘after’ photos for quality assurance', { wash: 'var(--photo-4)', stamp: '📍 After · 12:29 PM' })}
          {task(25, 'Lock doors, turn off lights & confirm unit security')}
          {task(26, 'Set thermostat to suggested degrees (70°)')}
        </>)}
        <NoteCard tone="warn" icon="⚠️">Noticed something? Flag an issue for the owner — damage, low supply, or maintenance.
          <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.goFlag}>Flag an issue</Button></div>
        </NoteCard>
        <NoteCard tone="pink" icon="⏱️">Running behind or need to hand this off? Move it — the owner is never charged when the change is on your side.
          <div style={css('margin-top:10px')}><Button variant="ghost" size="sm" onClick={v.goMove}>Move or hand off</Button></div>
        </NoteCard>
        <NoteCard tone="money" icon="💰"><b>50% paid on arrival ($110).</b> Final 50% releases the moment the owner approves — or automatically in 48h. You’re never chasing payment.</NoteCard>
        <Button variant="green" onClick={v.completeJob}>Complete & send owner report</Button>
        <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);text-align:center')}>Owner is notified instantly with your photos & timestamps</p>
      </div>
    </>
  )
}

/* ---------------------------------------------------------- Luxury clean -- */
function LuxClean({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeRefresh} title="Ridgeview Owner’s Home" subtitle="📍 88 Valley Rd, Sandy Springs &nbsp;·&nbsp; window 2–6">
        <ProgressRing value={v.luxPct} size={64} done={v.luxDone} total={31} onBrand />
      </DetailHeader>
      <div style={css('padding:22px')}>
        <SectionLabel>The spaces this client buys</SectionLabel>
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:var(--stack-card)')}>
          <Chip tone="deep">Main level</Chip><Chip tone="deep">Primary suite</Chip><Chip tone="deep">Kitchen & living</Chip><Chip tone="ghost">Basement not included</Chip>
        </div>
        <NoteCard tone="eco" icon="🌱"><b>The Kee Method™ · Luxury Home template.</b> Residential base · 31 steps. Work top to bottom — floors go last.</NoteCard>
        <NoteCard tone="pink" icon="🔑"><b>This home’s standard:</b> Shoes off at the foyer. Marble sealed cleaner only on the island. Mrs. Ridgeview’s dressing room is not to be entered. Dog gate stays closed — Biscuit is friendly but bolts.</NoteCard>
        <NoteCard tone="cream" icon="🍃"><b>Products & scent —</b> Eco: Simple Green & Benefect Botanical only. No bleach or ammonia. Microfiber + steam. Finish: lavender mist.</NoteCard>
        <SectionLabel>The Kee Method™ · Luxury Home</SectionLabel>
        {v.luxPhases.map((ph: any, i: number) => (
          <PhaseAccordion key={i} icon={ph.icon} title={ph.title} done={ph.done} total={ph.total} open={ph.open} onToggle={ph.toggle}>
            {ph.steps.map((st: any, j: number) => (
              <ChecklistTask key={j} checked={st.on} onChange={st.toggle} photoRequired={st.photo} photoAdded={st.added} onAddPhoto={st.add} photoWash={st.wash} photoStamp={st.stamp}>{st.label}</ChecklistTask>
            ))}
          </PhaseAccordion>
        ))}
        <NoteCard tone="money" icon="💰"><b>50% released on arrival ($95).</b> The final 50% releases the moment the owner approves — or automatically in 48h.</NoteCard>
        <Button variant="green" onClick={v.completeLux}>Complete & send owner report</Button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Assist -- */
function Assist({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAssist} title="Shared job · Skyline Loft 12B" subtitle="With Ahleyia &nbsp;·&nbsp; guest in 3:00 PM">
        <ProgressRing value={v.asstPct} size={64} done={v.asstDone} total={26} onBrand />
      </DetailHeader>
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <Avatar initials="TJ" size={52} />
            <div>
              <div style={css('font-size:15px;font-weight:var(--weight-semibold)')}>Tiana J.</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Assistant · certified in The Kee Method™</div>
            </div>
          </div>
        </Card>
        <NoteCard tone="money" icon="💰"><b>Your pay today: $50+.</b> Released to you when Ahleyia closes the job — you’re never chasing it.</NoteCard>
        <SectionLabel>Your half of the checklist</SectionLabel>
        {v.asstPhases.map((ph: any, i: number) => (
          <PhaseAccordion key={i} icon={ph.icon} title={ph.title} done={ph.done} total={ph.total} open={ph.open} onToggle={ph.toggle}>
            {ph.steps.map((st: any, j: number) => <ChecklistTask key={j} checked={st.on} onChange={st.toggle}>{st.label}</ChecklistTask>)}
          </PhaseAccordion>
        ))}
        <NoteCard tone="pink" icon="🔒">Quotes, rates and owner billing sit with Ahleyia — you only ever see your own number.</NoteCard>
        <Button onClick={v.toastAsstDone}>Mark my part complete</Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- Supplies -- */
/* The real cupboard: one card per home, a count per line, and the trip to
   Instacart. The seed showcase below is untouched — a live account gets this. */
export function LiveSupplies({ v }: { v: any }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:24px')}>Supplies</div>
        <IconButton icon="💬" onClick={v.goInbox} />
        <IconButton icon="☰" onClick={v.openMenu} />
      </div>
      <div style={css('padding:10px 22px 22px')}>
        <div style={css('font-size:12px;color:var(--text-muted);margin-bottom:12px')}>Par-level tracking, per home</div>
        <NoteCard tone={v.liveSupplyTone} icon="🛍️">{v.liveSupplyNote}</NoteCard>
        {!v.liveSuppliesReady && <Card><div style={css('font-size:12.5px;color:var(--text-muted)')}>Loading your inventory…</div></Card>}
        {v.liveUnits.map((u: any) => (
          <Card key={u.id}>
            <div style={css('display:flex;align-items:flex-start;gap:10px;justify-content:space-between')}>
              <div>
                <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>{u.name}</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{u.sub}</div>
              </div>
              {u.lowChip}
            </div>
            {!u.empty && (
              <div style={css('margin-top:6px')}>
                {u.items.map((it: any) => (
                  <SupplyRow
                    key={it.id} icon={it.icon} name={it.name} sub={it.sub} flag={it.flag} last={it.last}
                    right={(
                      <div style={css('display:flex;align-items:center;gap:8px')}>
                        <Stepper value={it.onHand} onChange={it.setOnHand} />
                        {it.openItem
                          ? <span onClick={it.openItem} style={css('font-size:11px;color:var(--magenta);cursor:pointer;text-decoration:underline;white-space:nowrap')}>Open</span>
                          : <span style={css('font-size:10.5px;color:var(--text-muted);white-space:nowrap')}>supplier</span>}
                      </div>
                    )}
                  />
                ))}
              </div>
            )}
            <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:10px 12px')}>{u.note}</div>
            <div style={css('margin-top:8px;font-size:11.5px;line-height:var(--leading-snug);padding:10px 12px;border-radius:var(--radius-md);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default)')}>{u.maintLine}</div>
            <div style={css('margin-top:12px')}>
              {u.empty
                ? <Button variant="ghost" onClick={u.seed}>{u.busy ? 'Setting up…' : 'Set up the standard par-stock'}</Button>
                : <Button variant={u.canSend ? 'primary' : 'ghost'} onClick={u.send}>🛒 {u.sendLabel}</Button>}
            </div>
          </Card>
        ))}
        {v.liveNoHomes && <Card><div style={css('font-size:12.5px;color:var(--ink-soft)')}>No homes yet. Add one, then its inventory lives here.</div></Card>}
        <NoteCard tone="pink" icon="🔒">{v.liveInstacartNote}</NoteCard>
      </div>
    </>
  )
}

function Supplies({ v }: { v: any }) {
  if (v.liveSupplies) return <LiveSupplies v={v} />
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:24px')}>Supplies</div>
        <IconButton icon="💬" onClick={v.goInbox} />
        <IconButton icon="☰" onClick={v.openMenu} />
        <IconButton icon="🔍" />
      </div>
      <div style={css('padding:10px 22px 22px')}>
        <div style={css('font-size:12px;color:var(--text-muted);margin-bottom:12px')}>3 units · tap to filter · par-level tracking</div>
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:14px')}>
          {v.unitFilters.map((f: any, i: number) => <Pill key={i} selected={f.on} onClick={f.pick}>{f.label}</Pill>)}
        </div>
        <NoteCard tone="warn" icon="🛍️"><b>8 items below par · 1 maintenance issue open.</b> Add what’s low → send to Instacart. Maintenance goes straight to the owner.</NoteCard>
        {v.shownUnits.map((u: any) => (
          <Card key={u.id}>
            <div style={css('display:flex;align-items:flex-start;gap:10px;justify-content:space-between')}>
              <div>
                <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>{u.name}</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{u.sub}</div>
              </div>
              {u.lowChip}
            </div>
            <div style={css('margin-top:6px')}>
              {u.items.map((it: any) => (
                <SupplyRow key={it.id} icon={it.icon} name={it.name} sub={it.sub} flag={it.flag} level={it.level} right={<Stepper value={v.qty(it.id, it.def)} onChange={(n: number) => v.setQty(it.id, n)} />} last={it.last} />
              ))}
            </div>
            <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:10px 12px')}>{u.note}</div>
            <div style={css('margin-top:8px;font-size:11.5px;line-height:var(--leading-snug);padding:10px 12px;border-radius:var(--radius-md);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default)')}>{u.maintLine}</div>
          </Card>
        ))}
        <Card>
          <div style={css('display:flex;align-items:flex-start;gap:10px;justify-content:space-between')}>
            <div>
              <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>Kitchen & bath amenities</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Building par-stock · all units</div>
            </div>
            <Chip tone="ghost">Optional</Chip>
          </div>
          <div style={css('margin-top:6px')}>
            {v.amenities.map((it: any) => <SupplyRow key={it.id} icon={it.icon} name={it.name} right={<Stepper value={v.qty(it.id, it.def)} onChange={(n: number) => v.setQty(it.id, n)} />} last={it.last} />)}
          </div>
        </Card>
        <Card>
          <div style={css('display:flex;align-items:flex-start;gap:10px;justify-content:space-between')}>
            <div>
              <div style={css('font-size:16px;font-weight:var(--weight-semibold)')}>Linens & bedding</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Ordered from supplier — not Instacart</div>
            </div>
            <Chip tone="deep">Supplier</Chip>
          </div>
          <div style={css('display:flex;flex-wrap:wrap;gap:var(--gap-chip);margin-top:14px')}>
            <Pill>🛏 New sheet sets</Pill><Pill>🧷 Pillows</Pill><Pill>🌊 Comforters</Pill><Pill>🛏️ Duvets</Pill>
          </div>
          <div style={css('margin-top:14px')}><Button variant="ghost" onClick={v.toastLinens}>Order from supplier</Button></div>
        </Card>
        <div style={css('position:sticky;bottom:0;background:var(--surface-card);border:1px solid var(--border-default);border-radius:var(--radius-2xl);padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-raised)')}>
          <div style={css('flex:1')}>
            <div style={css('font-size:13px;font-weight:var(--weight-semibold)')}>Grocery reorder</div>
            <div style={css('font-size:11px;color:var(--text-muted)')}>{v.cartCount} items ready</div>
          </div>
          <Button variant="green" size="sm" onClick={v.openCart}>🛒 Send to Instacart</Button>
        </div>
      </div>
    </>
  )
}

/* --------------------------------------------------------- Quote Builder -- */
function QuoteBuilder({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.badgePrivate} title="Quote Builder" subtitle="Your math stays yours — the client only ever sees the final number" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>Service type</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
            <Pill selected={v.svcStd} onClick={v.pickStd}>Standard · $50/hr</Pill>
            <Pill selected={v.svcDeep} onClick={v.pickDeep}>Deep clean · $65/hr</Pill>
          </div>
        </Card>
        <Card>
          <SectionLabel>Estimated time on site</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.hourOpts.map((h: any, i: number) => <Pill key={i} selected={h.on} onClick={h.pick}>{h.label}</Pill>)}</div>
          <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Gut-check: a 2,000 sq ft main level runs 4–5 hrs even moving fast. Ask: how many living rooms? Bedrooms on that level?</p>
        </Card>
        <Card>
          <SectionLabel>Working with an assistant?</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
            <Pill selected={v.solo} onClick={v.pickSolo}>Solo</Pill>
            <Pill selected={v.withAsst} onClick={v.pickAsst}>{v.asstPillLabel}</Pill>
          </div>
        </Card>
        <PriceBox rows={v.qbRows} label="Your quote (comfort round-up)" footnote="Because thin quotes lead to thin work" amount={v.qbFinal}>
          {v.withAsst && (<>
            <div style={css('margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.15);display:flex;justify-content:space-between;font-size:12px;opacity:.85')}><span>{v.asstSplitLabel}</span><span>{v.qbAsst}</span></div>
            <div style={css('margin-top:6px;display:flex;justify-content:space-between;font-size:12px;color:var(--green)')}><span>{v.keepSplitLabel}</span><span>{v.qbKeep}</span></div>
          </>)}
        </PriceBox>
        <div style={css('margin-top:16px')}>
          <Card tone="dashed">
            <SectionLabel>What the client sees</SectionLabel>
            <p style={css('margin:0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>“Your tailored quote for the spaces you chose: <b style={css('color:var(--magenta);font-family:var(--font-serif-display);font-size:17px')}>{v.qbFinal}</b>” &nbsp;— no hours, no rate, no split. Ever.</p>
          </Card>
          <Button onClick={v.sendQuote}>Send tailored quote</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug)')}>Client accepts in the app → card on file → booked. You can edit any number first.</p>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- My Week -- */
function MyWeek({ v }: { v: any }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1;font-family:var(--font-serif-display);font-size:24px')}>My Week</div>
        <IconButton icon="💬" onClick={v.goInbox} />
        <IconButton icon="☰" onClick={v.openMenu} />
        <IconButton icon="⚙️" onClick={v.goSettings} />
      </div>
      <div style={css('padding:16px 22px 22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <Avatar initials={v.meInitials} size={66} />
            <div>
              <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>{v.meName}</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{v.meTitle}</div>
              <div style={css('display:flex;gap:var(--gap-chip);margin-top:8px;flex-wrap:wrap')}>
                {v.meChips}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <SupplyRow icon="🏦" name="Payouts" sub={v.liveMoneyOff ? 'Set up when payments switch on' : 'Bank connected · ID verified · Instant on'} right="›" onClick={v.goPayouts} last />
          {!v.liveMoneyOff && <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--green-deep);background:var(--tint-green);border:1px solid var(--tint-green-line);border-radius:var(--radius-md);padding:10px 12px')}>You’re set up to get paid. Your 50% lands <b>instantly on arrival</b>, the rest the moment the owner approves.</div>}
        </Card>
        <Card flush>
          <SupplyRow icon="🧴" name="Supplies" sub="Par levels, reorders and maintenance flags" right="›" onClick={v.goSupplies} />
          {v.meIsAdmin && <SupplyRow icon="👑" name="Business admin" sub="Money, team, clients & pricing — the owner side" right="›" onClick={v.goAdmin} />}
          {v.meIsAdmin && <SupplyRow icon="🧮" name="Quote Builder" sub={v.rateRuleLine} right="›" onClick={v.goQuote} />}
          <SupplyRow icon="💌" name="Share your digital card" sub="QR to scan, or text the link on the spot" right="›" onClick={v.goShare} last />
        </Card>
        <SectionLabel>This week</SectionLabel>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value={v.liveWeekCount ?? '14'} label="Cleans this week" color="var(--orange)" />
          <StatTile value={v.liveMoneyOff ? (v.livePhotoVerified ?? '—') : '100%'} label="Photo-verified" color="var(--magenta)" />
          <StatTile value={v.liveMoneyOff ? v.liveEarningsValue : '$4,280'} label={v.liveMoneyOff ? v.liveEarningsLabel : 'Earned this week'} color="var(--green-deep)" accent />
          <StatTile value={v.liveMoneyOff ? '0' : '0'} label="Owner flags" color="var(--green-deep)" />
        </div>
        {!v.liveMoneyOff && (<>
          <SectionLabel>This week’s schedule</SectionLabel>
          <Card flush>
            <SupplyRow icon="M" name="2 turnovers · 1 refresh" sub="Buckhead · Midtown" right={v.chipDone} />
            <SupplyRow icon="W" name="3 turnovers" sub="Sandy Springs" right={v.chipDone} />
            <SupplyRow icon="F" name="3 cleans · today" sub="Buckhead · Midtown · Sandy Springs" right={v.chipToday} last />
          </Card>
        </>)}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Payouts -- */
function Payouts({ v }: { v: any }) {
  if (v.liveMoneyOff) return (
    <>
      <DetailHeader onBack={v.goBack} title="Your payouts" subtitle="Nothing released yet" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="💳">{v.liveMoneyLine}</NoteCard>
      </div>
    </>
  )
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeInstant} title="Your payouts" subtitle="Every release, in order — nothing pending on you" />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value="$4,280" label="Released this week" color="var(--green-deep)" accent style={{ flex: 1 }} />
          <StatTile value="$110" label="Awaiting approval" color="var(--orange)" style={{ flex: 1 }} />
        </div>
        <NoteCard tone="money" icon="⚡"><b>Instant payouts are on.</b> Your 50% lands the second you check in; the rest the moment the owner approves — or automatically in 48h.</NoteCard>
        <SectionLabel right={v.chipBank}>Recent releases</SectionLabel>
        <Card flush>{v.payouts.map((p: any, i: number) => <SupplyRow key={i} icon={p.icon} name={p.name} sub={p.sub} right={p.right} last={p.last} />)}</Card>
        <Button variant="ghost" icon="🧾" onClick={v.goTaxDocs}>Tax documents & yearly summary</Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- Tax -- */
function Tax({ v }: { v: any }) {
  if (v.liveMoneyOff) return (
    <>
      <DetailHeader onBack={v.goBack} title="Tax documents" subtitle="Nothing to report yet" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="🧾">{v.liveMoneyLine}</NoteCard>
        <NoteCard tone="eco" icon="📄">When payments are on, your yearly summary and 1099-NEC are generated from what actually cleared — never an estimate.</NoteCard>
      </div>
    </>
  )
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeTaxYear} title="Tax documents" subtitle="Everything your accountant asks for, in one place" />
      <div style={css('padding:22px')}>
        <SectionLabel>Forms</SectionLabel>
        <Card flush>
          <SupplyRow icon="🧾" name="1099-NEC · 2025" sub="Filed Jan 28, 2026 · PDF" right={v.chipDownload} onClick={v.toastDownload} />
          <SupplyRow icon="🧾" name="1099-NEC · 2026" sub="Available late January 2027" right={v.chipPending} />
          <SupplyRow icon="📊" name="Yearly earnings summary · 2026" sub="Updated live · $58,140 released so far" right={v.chipDownload} onClick={v.toastDownload} last />
        </Card>
        <SectionLabel>Month by month · 2026</SectionLabel>
        <Card flush>{v.taxMonths.map((m: any, i: number) => <SupplyRow key={i} icon={m.icon} name={m.name} sub={m.sub} right={m.right} last={m.last} />)}</Card>
        <NoteCard tone="money" icon="💰"><b>Tips are included</b> in your totals — they’re yours in full, and they’re reportable income. Mileage between stops isn’t tracked here; keep your own log for that deduction.</NoteCard>
        <Button variant="ghost" icon="💌" onClick={v.toastEmailTax}>Email everything to my accountant</Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Template -- */
function Template({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeLocked} title={v.tplTitle} subtitle={v.tplSub} />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:var(--stack-card)')}>
          {v.tplTabs.map((t: any, i: number) => <Pill key={i} selected={t.on} onClick={t.pick}>{t.label}</Pill>)}
        </div>
        <div style={css('display:flex;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value={v.tplSteps} label="Steps" color="var(--magenta)" accent style={{ flex: 1 }} />
          <StatTile value={v.tplPhotos} label="Photo moments" color="var(--orange)" style={{ flex: 1 }} />
        </div>
        <NoteCard tone="cream" icon="🔒"><b>The Kee Method™ is locked.</b> Phase names, order and step wording are yours and stay fixed — that’s what makes every home look identical.</NoteCard>
        <SectionLabel>Phases</SectionLabel>
        <Card flush>{v.tplPhases.map((p: any, i: number) => <SupplyRow key={i} icon={p.icon} name={p.title} sub={p.sub} right={p.count} last={p.last} />)}</Card>
        <NoteCard tone="eco" icon="🌱">Per-home standards ride on top: linens, scent, thermostat and house rules are set by each owner and shown to you at check-in.</NoteCard>
        {v.tplShowOpen && <Button variant="ghost" onClick={v.tplOpenJob}>{v.tplOpenLabel}</Button>}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Inbox -- */
function Inbox({ v }: { v: any }) {
  if (v.liveInbox) return (
    <>
      <DetailHeader onBack={v.goBack} title="Inbox" subtitle="Your clients and the studio" />
      <div style={css('padding:22px')}>
        {v.liveThreads.length ? (
          <Card flush>{v.liveThreads.map((t: any, i: number) => (
            <SupplyRow key={t.id} icon={t.initials} iconStyle={v.jhTile} name={t.name} sub={t.preview} right={t.when} onClick={t.open} last={i === v.liveThreads.length - 1} />
          ))}</Card>
        ) : (
          <Card><div style={css('font-size:13px;line-height:var(--leading-snug);color:var(--ink-soft)')}>No messages yet. When a client writes to you — or you write to them — the thread lives here.</div></Card>
        )}
      </div>
    </>
  )
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeThreeNew} title="Inbox" subtitle="Owners, the business & new leads from your card" />
      <div style={css('padding:22px')}>
        {v.hasMsgs && (<>
          <Card flush>
            {v.inboxRows ? (
              v.inboxRows.length
                ? v.inboxRows.map((r: any, i: number) => (
                  <SupplyRow key={i} icon={r.icon} iconStyle={r.iconStyle} name={r.name} sub={r.sub} right={r.right} last={r.last} onClick={r.onClick} />
                ))
                : <SupplyRow icon="🌱" name="No clients yet" sub="Conversations appear here once a client joins" right="" last />
            ) : (<>
              <SupplyRow icon={v.clientInitials} iconStyle={v.jhTile} name={v.clientAddress} sub="Guest is checking in at 4 — thank you for the photos." right="11:02a" onClick={v.openHartwell} />
              <SupplyRow icon="🌱" name="New lead · from your card link" sub="Can you quote a 3-bed Airbnb in Buckhead?" right="9:40a" onClick={v.openLead} />
              <SupplyRow icon="SM" iconStyle={v.smTile} name="She’s Maid In ATL" sub="Your payout of $110.00 landed · Hartwell arrival" right="Wed" onClick={v.openBusiness} last />
            </>)}
          </Card>
          <NoteCard tone="pink" icon="💌"><b>Leads from your card link land here.</b> Reply, then open the Quote Builder — the client only ever sees the final number.</NoteCard>
          <Button icon="✏️" onClick={v.goCompose}>New message</Button>
        </>)}
        {v.noMsgs && (
          <Card tone="blush">
            <div style={css('text-align:center;padding:6px 4px')}>
              <div style={css('font-size:34px')}>💌</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Inbox is clear</div>
              <p style={css('margin:8px auto 16px;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Leads from your card land here, along with owner notes and payout confirmations.</p>
              <Button icon="💌" onClick={v.goShare}>Share my card</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Settings -- */
function Settings({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeStaff} title="Settings" subtitle="Your account, your payouts, your method" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <Avatar initials={v.meInitials} size={66} />
            <div>
              <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>{v.meName}</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{v.meLine}</div>
              <div style={css('display:flex;gap:var(--gap-chip);margin-top:8px;flex-wrap:wrap')}>{v.meChips}</div>
            </div>
          </div>
        </Card>
        <SectionLabel>Payouts</SectionLabel>
        {v.liveMoneyOff ? (
          <Card flush>
            <SupplyRow icon="🏦" name="Payout account" sub="Set up when payments switch on" right="›" onClick={v.goPayouts} />
            <SupplyRow icon="🧾" name="Tax documents" sub="Generated from real earnings, once payments are on" right="›" onClick={v.goTaxDocs} last />
          </Card>
        ) : (<>
          <Card flush>
            <SupplyRow icon="🏦" name="Bank ···· 8821" sub="Deposits land here" right={v.chipReady} />
            <SupplyRow icon="⚡" name="Instant payouts" sub="50% the moment you check in on site" right={v.chipOn} />
            <SupplyRow icon="🧾" name="Tax documents" sub="1099s & yearly summaries" right="›" onClick={v.goTaxDocs} last />
          </Card>
          <NoteCard tone="money" icon="💰">Your 50% lands <b>instantly on arrival</b>, the rest the moment the owner approves — or automatically in 48h. Tips come to you whole.</NoteCard>
        </>)}
        <SectionLabel>The Kee Method™</SectionLabel>
        <Card flush>
          <SupplyRow icon="📋" name="Turnover template" sub="Vacation Rental Edition · 26 steps · 4 photo moments" right="›" onClick={v.goTplTurn} />
          <SupplyRow icon="📋" name="Luxury home template" sub="Residential base · 31 steps" right="›" onClick={v.goTplLux} />
          <SupplyRow icon="📷" name="Photo-proof steps" sub="Before · beds staged · restaged to listing · after" right="›" onClick={v.goTplTurn} last />
        </Card>
        {v.meIsAdmin && (<>
          <SectionLabel right={v.chipYou}>Business admin</SectionLabel>
          <Card flush>
            <SupplyRow icon="👑" name="Business dashboard" sub="Billing, team, clients & brand" right="›" onClick={v.goAdmin} />
            <SupplyRow icon="👥" name="Team & certification" sub={v.teamSub} right="›" onClick={v.goTeam} last />
          </Card>
        </>)}
        {v.meIsAdmin && (<>
          <SectionLabel right={v.badgePrivateGhost}>Your pricing rules</SectionLabel>
          <Card flush>
            <SupplyRow icon="🧮" name="Standard rate" sub={v.rateStdLine} right="›" onClick={v.goQuote} />
            <SupplyRow icon="🧮" name="Deep clean rate" sub={v.rateDeepLine} right="›" onClick={v.goQuote} />
            {!v.bizLive && <SupplyRow icon="👤" name="Assistant split" sub="40% with a $50 minimum" right="›" onClick={v.goQuote} last />}
          </Card>
        </>)}
        <SectionLabel>Notifications</SectionLabel>
        {v.pushOffered && (
          <Card flush>
            <SupplyRow icon="🔔" name={v.pushLabel} sub={v.pushSub}
              right={v.pushNeedsInstall || v.pushBlocked ? '›' : (v.pushOn ? 'On' : 'Off')}
              onClick={v.pushNeedsInstall || v.pushBlocked ? v.goNotices : v.togglePush} last />
          </Card>
        )}
        <Card>
          {v.cleanerNotifs.map((n: any, i: number) => (
            <div key={i} style={css('display:flex;gap:12px;align-items:flex-start;padding:9px 0')}>
              <CheckboxToggle on={n.on} toggle={n.toggle} />
              <div style={css('font-size:12.5px;line-height:var(--leading-snug)')}>{n.label}</div>
            </div>
          ))}
        </Card>
        <Button variant="ghost" icon="💌" onClick={v.goShare}>Share my digital card</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.signOut}>Sign out</Button></div>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Flag -- */
function Flag({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeUnit} title="Flag an issue" subtitle="Goes to the owner and onto the unit’s record" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>What did you notice?</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.flagCats.map((f: any, i: number) => <Pill key={i} selected={f.on} onClick={f.pick}>{f.label}</Pill>)}</div>
        </Card>
        <Card>
          <SectionLabel>Add a photo</SectionLabel>
          <div style={css('display:flex;gap:10px;align-items:center')}>
            <div style={css('width:96px;height:96px;border-radius:var(--radius-lg);background:var(--photo-3);position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;border:1px dashed var(--tint-pink-line)')} onClick={v.attachFlagPhoto}>
              {v.flagPhoto ? <div style={css('position:absolute;bottom:8px;left:8px;background:var(--stamp-scrim);color:#fff;font-size:9.5px;padding:3px 7px;border-radius:7px;backdrop-filter:blur(2px)')}>📍 12:24 PM</div> : '📷'}
            </div>
            <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.flagPhotoLabel}</div>
          </div>
        </Card>
        <Card>
          <SectionLabel>Anything to add?</SectionLabel>
          <TextField icon="✏️" placeholder="Vanity light doesn’t come on…" value={v.flagNote} onChange={v.setFlagNote} />
          <div style={css('margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--text-muted)')}>
            <span>Unit</span><b style={{ color: 'var(--ink)' }}>The Hartwell Estate · primary bath</b>
          </div>
        </Card>
        <NoteCard tone="pink" icon="🔒">Supply flags land on the owner’s reorder list. Maintenance goes straight to them with your photo attached.</NoteCard>
        <Button onClick={v.sendFlag}>Send to owner</Button>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Move -- */
function Move({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeYourSide} title="Move this job" subtitle={v.moveSubtitle || "Skyline Loft 12B · today, window 10–12"} />
      <div style={css('padding:22px')}>
        {v.mvForm && (<>
          <NoteCard tone="pink" icon="🧽"><b>This is on your side, so the owner is never charged</b> and their courtesy waiver stays unused. Tell them early and they’ll take it well — most do.</NoteCard>
          <Card>
            <SectionLabel>What’s going on?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.moveReasons.map((m: any, i: number) => <Pill key={i} selected={m.on} onClick={m.pick}>{m.label}</Pill>)}</div>
          </Card>
          <SectionLabel>How do you want to cover it?</SectionLabel>
          <Card flush>{v.moveOptions.map((o: any, i: number) => <SupplyRow key={i} icon={o.icon} name={o.name} sub={o.sub} right={o.right} last={o.last} onClick={o.pick} />)}</Card>
          <Card>
            <SectionLabel>Note to the owner</SectionLabel>
            <TextField icon="✏️" placeholder={v.movePlaceholder} value={v.moveNote} onChange={v.setMoveNote} />
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>They see your note, the new window, and a line saying there’s no charge for the change.</p>
          </Card>
          <Button variant="green" onClick={v.confirmMove}>{v.moveConfirmLabel}</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Your 50% moves with the job — you’re paid on arrival at the new time, not penalised for being honest.</p>
        </>)}
        {v.mvDone && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>Handled</div>
              <p style={css('margin:8px auto 0;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.mvDoneCopy}</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="📱" name="Owner notified" sub="With your note and the new window" right={v.chipSent} />
            <SupplyRow icon="💳" name="No charge to the owner" sub="Their courtesy waiver stays unused" right={v.chipNoCharge} />
            <SupplyRow icon="⚡" name="Your pay follows the job" sub="50% releases when you check in at the new time" right={v.chipReady} last />
          </Card>
          <Button onClick={v.goToday}>Back to today</Button>
        </>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------------ AdminDash -- */
function AdminDash({ v }: { v: any }) {
  return (
    <>
      <div style={css('display:flex;align-items:center;gap:10px;padding:8px 22px 0')}>
        <div style={css('flex:1')}>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--magenta)')}>Business · admin</div>
          <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1')}>{v.bizName}</div>
        </div>
        <IconButton icon="💬" onClick={v.goInbox} />
        <IconButton icon="☰" onClick={v.openMenu} />
        <IconButton icon="⚙️" onClick={v.goBizSettings} />
        <Avatar initials={v.meInitials} size={38} />
      </div>
      <div style={css('padding:14px 22px 22px')}>
        <div style={css('display:flex;gap:var(--gap-chip);margin-bottom:var(--stack-card)')}>
          <Pill selected={v.notAdmin} onClick={v.exitAdmin}>🧽 Working</Pill>
          <Pill selected={v.isAdmin} onClick={v.goAdmin}>💼 Business</Pill>
        </div>
        <NoteCard tone="pink" icon="👑"><b>You’re the owner and the housekeeper.</b> This side is the business — money, people, pricing. Switch back to <b>Working</b> for today’s route and your checklists.</NoteCard>
        <SectionLabel right={v.chipJulyBiz}>This month</SectionLabel>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          {v.liveClientCount != null ? (<>
            <StatTile value={v.liveClientCount} label="Clients" color="var(--magenta)" accent />
            <StatTile value={v.livePropCountAll} label="Properties" color="var(--green-deep)" />
            <StatTile value={v.liveJobCountAll} label="Cleans booked" color="var(--orange)" />
            <StatTile value={v.liveQuoteCount} label="Quotes sent" color="var(--green-deep)" />
          </>) : (<>
            <StatTile value="$18,240" label="Billed to clients" color="var(--magenta)" accent />
            <StatTile value="$14,905" label="Your take-home" color="var(--green-deep)" />
            <StatTile value="62" label="Cleans delivered" color="var(--orange)" />
            <StatTile value="100%" label="Photo-verified" color="var(--green-deep)" />
          </>)}
        </div>
        <SectionLabel right={v.liveNeedsChip || v.chipTwoOpen}>Needs you</SectionLabel>
        {v.liveNeeds
          ? (v.liveNeeds.length
            ? <Card flush>{v.liveNeeds.map((r: any, i: number) => <SupplyRow key={i} icon={r.icon} name={r.name} sub={r.sub} right={r.right} onClick={r.go} last={r.last} />)}</Card>
            : <NoteCard tone="eco" icon="✓">Nothing waiting on you. Every clean is assigned and every client is set up.</NoteCard>)
          : (
            <Card flush>
              <SupplyRow icon="🧮" name="Quote waiting to be sent" sub="Buckhead lead · 3-bed Airbnb · asked 2 hours ago" right={v.chipDo} onClick={v.goQuote} />
              <SupplyRow icon="⏳" name="1 payment awaiting owner approval" sub="Hartwell Estate · $110 releases automatically in 47h" right={v.chipWatch} onClick={v.goPayouts} />
              <SupplyRow icon="👤" name="Tiana’s certification renews Aug 12" sub="Kee Method™ recert · 19 days" right="›" onClick={v.goTeam} last />
            </Card>
          )}
        <SectionLabel>Run the business</SectionLabel>
        <Card flush>
          <SupplyRow icon="📅" name="Booking calendar" sub="Every clean, and who has it" right="›" onClick={v.goCalendar} />
          {!v.liveNeeds && <SupplyRow icon="📌" name="Assign jobs" sub={v.assignRowSub} right={v.assignRowChip} onClick={v.goAssign} />}
          {v.liveNeeds && <SupplyRow icon="🏠" name="Add a home for a client" sub="Manually, for a client you already have" right="›" onClick={v.goAddProp} />}
          <SupplyRow icon="👥" name="Team & certification" sub={v.liveTeamSub || '1 assistant · splits · who can see what'} right="›" onClick={v.goTeam} />
          <SupplyRow icon="🏡" name="Clients & properties" sub={v.clientsSub || '9 clients · 14 properties · 2 quotes out'} right="›" onClick={v.goClients} />
          <SupplyRow icon="🧮" name="Pricing rules" sub={v.rateRulesLine} right="›" onClick={v.goQuote} />
          <SupplyRow icon="📋" name="Kee Method™ templates" sub="Turnover 26 · Luxury home 31" right="›" onClick={v.goTplTurn} />
          <SupplyRow icon="⚙️" name="Business settings" sub="Payouts, brand, service area, access" right="›" onClick={v.goBizSettings} last />
        </Card>
        <NoteCard tone="money" icon="💰"><b>Your two hats are paid separately.</b> Service work pays you like any cleaner — 50% on arrival, 50% on approval. What’s left after assistant splits is the business’s.</NoteCard>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Team -- */
function Team({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAdminOnly} title="Team & certification" subtitle="Who cleans under your name, and what they can see" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <Avatar initials={v.meInitials} size={52} />
            <div style={css('flex:1')}>
              <div style={css('font-size:15px;font-weight:var(--weight-semibold)')}>{v.meName}</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{v.meTitle}</div>
              <div style={css('display:flex;gap:var(--gap-chip);margin-top:8px;flex-wrap:wrap')}><Chip tone="deep">👑 Admin</Chip><Chip tone="refresh">🧽 Working staff</Chip></div>
            </div>
          </div>
          <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:10px 12px')}>Both roles on one login. Admin sees the money and the method; the working side is what any cleaner sees.</div>
        </Card>
        <SectionLabel right={v.liveTeam ? undefined : v.chipOneAsst}>{v.liveTeam ? 'Your team' : 'Assistants'}</SectionLabel>
        {v.liveTeam
          ? (v.liveTeamEmpty
            ? (
              <Card tone="dashed">
                <p style={css('margin:0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Just you so far. Add a cleaner and they set up their own sign-in from a link you send — then you can assign them work.</p>
              </Card>
            )
            : (
              <Card flush>
                {v.liveTeam.map((m: any, i: number, arr: any[]) => (
                  <SupplyRow key={m.id} icon={m.initials} iconStyle={v.akTile} name={m.name} sub={m.sub} right={m.chip} last={i === arr.length - 1} />
                ))}
              </Card>
            ))
          : (
            <Card>
              <div style={css('display:flex;align-items:center;gap:14px')}>
                <Avatar initials="TJ" size={52} />
                <div style={css('flex:1')}>
                  <div style={css('font-size:15px;font-weight:var(--weight-semibold)')}>Tiana J.</div>
                  <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>Assistant · 41 shared jobs</div>
                </div>
                {v.chipCertified}
              </div>
              <div style={css('height:1px;background:var(--border-default);margin:14px 0')} />
              <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin-bottom:8px')}>Her split on shared jobs</div>
              <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.splitOpts.map((sp: any, i: number) => <Pill key={i} selected={sp.on} onClick={sp.pick}>{sp.label}</Pill>)}</div>
              <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);background:var(--tint-green);border:1px solid var(--tint-green-line);border-radius:var(--radius-md);padding:10px 12px')}>{v.splitLine}</div>
            </Card>
          )}
        <SectionLabel>{v.liveTeam ? 'What your team can see' : 'What she can see'}</SectionLabel>
        <Card>
          {v.accessRows.map((a: any, i: number) => (
            <div key={i} style={css('display:flex;gap:12px;align-items:flex-start;padding:9px 0')}>
              <CheckboxToggle on={a.on} toggle={a.toggle} />
              <div style={css('flex:1')}>
                <div style={css('font-size:12.5px;line-height:var(--leading-snug)')}>{a.label}</div>
                {a.locked && <div style={css('font-size:10.5px;color:var(--text-muted);margin-top:2px')}>{a.note}</div>}
              </div>
            </div>
          ))}
        </Card>
        <NoteCard tone="pink" icon="🔒">Rates, quotes and client billing are <b>admin-only</b> and can’t be granted — a cleaner only ever sees their own number.</NoteCard>
        <SectionLabel>Growing the network</SectionLabel>
        <Card tone="dashed">
          <p style={css('margin:0 0 12px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Invite a cleaner to certify in The Kee Method™. They work your standard, under your brand — you keep the client relationship and set the split.</p>
          <Button icon="💌" onClick={v.goAddStaff}>Add a cleaner &amp; send their link</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.previewStaffSetup}>See what they’ll go through</Button></div>
        </Card>
      </div>
    </>
  )
}

/* -------------------------------------------------------- Availability --
   Most of a contractor's calendar fills itself: a clean they're booked on is a
   window they can't take another one in, whether it's their own client or one
   the studio gave them. This screen is the other half — hours they're simply
   not working, with no job behind them. */
function Availability({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAvail} title="My availability" subtitle="What’s already booked, and when you’re not working" />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value={String(v.myHoursBooked ?? 0)} label="Hours booked this week" accent color="var(--orange)" style={{ flex: 1 }} />
          <StatTile value={String(v.myBlocks?.length ?? 0)} label="Blocks you’ve set" color="var(--magenta)" style={{ flex: 1 }} />
        </div>
        <NoteCard tone="eco" icon="🗓️">Every clean you’re on already blocks its window — your own clients and the studio’s. Add a block here only for time that has no job behind it.</NoteCard>

        <SectionLabel>Mark yourself unavailable</SectionLabel>
        <Card>
          <Field icon="📅"><NativeInput type="date" aria-label="Date" placeholder="Date" value={v.avDay} onChange={v.setAvDay} /></Field>
          <div style={css('margin-top:12px;display:flex;gap:12px;align-items:flex-start')}>
            <Checkbox checked={v.avWholeDay} onChange={v.setAvWholeDay} size={22} />
            <div style={css('font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>The whole day</div>
          </div>
          {!v.avWholeDay && (<>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>Which window?</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>
              {v.avWindows.map((w: any, i: number) => <Pill key={i} selected={w.on} onClick={w.pick}>{w.label}</Pill>)}
            </div>
          </>)}
          <div style={{ height: 12 }} />
          <Field icon="✏️"><NativeInput type="text" aria-label="Reason (optional)" placeholder="Reason (optional)" value={v.avReason} onChange={v.setAvReason} /></Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Only you see the reason. Ahleyia sees that you’re unavailable, so she doesn’t offer you work then.</p>
        </Card>
        {v.avErr && <NoteCard tone="pink" icon="⚠️">{v.avErr}</NoteCard>}
        <Button variant="green" onClick={v.blockTime}>{v.beBusy ? 'Saving…' : 'Mark unavailable'}</Button>

        {!!v.myBlocks?.length && (<>
          <SectionLabel>Time you’ve blocked</SectionLabel>
          <Card flush>
            {v.myBlocks.map((b: any) => (
              <SupplyRow key={b.id} icon={b.icon} name={b.name} sub={b.sub} last={b.last}
                right={<span style={css('font-size:11.5px;color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={b.remove}>Free it up</span>} />
            ))}
          </Card>
        </>)}

        {!!v.myBusyRows?.length && (<>
          <SectionLabel>Already booked</SectionLabel>
          <Card flush>
            {v.myBusyRows.map((r: any, i: number) => <SupplyRow key={i} icon={r.icon} name={r.name} sub={r.sub} last={r.last} />)}
          </Card>
          <NoteCard tone="pink" icon="🔒">These come from your cleans. Move or hand off a clean to free its window — a block here won’t override it.</NoteCard>
        </>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- Clients -- */
function Clients({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeBook} title={v.bookTitle || 'Clients & properties'} subtitle={v.clientsSub || '9 clients · 14 properties · 2 quotes out'} />
      <div style={css('padding:22px')}>
        {!v.liveBook && (
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:var(--stack-card)')}>
            {v.clientFilters.map((c: any, i: number) => <Pill key={i} selected={c.on} onClick={c.pick}>{c.label}</Pill>)}
          </div>
        )}
        <Card flush>{v.clientRows.map((c: any, i: number) => <SupplyRow key={i} icon={c.icon} iconStyle={c.tile} name={c.name} sub={c.sub} flag={c.flag} right={c.right} last={c.last} onClick={c.go} />)}</Card>
        {v.liveBook
          ? (<>
            {v.bookSubtitle && <NoteCard tone="pink" icon="🔒">{v.bookSubtitle}. You set their price, you keep the relationship.</NoteCard>}
            <Button icon="➕" onClick={v.goAddClient}>Add a client</Button>
            <div style={css('margin-top:10px')}><Button variant="ghost" icon="🏠" onClick={v.goAddProp}>Add a home for a client</Button></div>
            <div style={css('margin-top:10px')}><Button variant="ghost" icon="📅" onClick={v.goCalendar}>Book a clean</Button></div>
          </>)
          : <NoteCard tone="money" icon="📈"><b>Recurring clients are the business.</b> 7 of your 9 are on a weekly or biweekly cadence — that’s $12,400 of this month’s billing you didn’t have to sell twice.</NoteCard>}
        <Button variant="ghost" icon="💌" onClick={v.goShare}>Share your card with a new lead</Button>
      </div>
    </>
  )
}

/* --------------------------------------------------------- BizSettings -- */
function BizSettings({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAdminOnly} title="Business settings" subtitle={v.bizSubtitle} />
      <div style={css('padding:22px')}>
        <SectionLabel>The business</SectionLabel>
        <Card flush>
          <SupplyRow icon="🏦" name="Payouts & banking" sub={v.bizBankLine} right="›" onClick={v.goPayouts} />
          <SupplyRow icon="🧾" name="Tax documents" sub="1099s · yearly summaries" right="›" onClick={v.goTaxDocs} />
          <SupplyRow icon="💌" name="Digital card & QR" sub={v.bizCardLine} right="›" onClick={v.goShare} />
          <SupplyRow icon="📍" name="Service area" sub={v.bizAreaLine} right="›" onClick={v.goArea} />
          <SupplyRow icon="🔒" name="Master login & security" sub={v.adminEmailShown + ' · two-step on'} right="›" onClick={v.goAdminLogin} last />
        </Card>
        <SectionLabel>Roles & access</SectionLabel>
        <Card flush>
          <SupplyRow icon="👑" name="Admin" sub="You only · money, pricing, clients, templates" right={v.chipYou} />
          <SupplyRow icon="🧽" name="Working staff" sub={v.bizStaffLine} right={v.bizLive ? undefined : v.chipTwoPeople} />
          <SupplyRow icon="🏡" name="Clients" sub={v.bizClientsLine} right={v.bizLive ? undefined : v.chipNine} last />
        </Card>
        <NoteCard tone="cream" icon="👑"><b>Why you have both:</b> the admin role is the business — it never disappears when you take a job yourself. When you’re on site you use the working side like any cleaner, and get paid like one.</NoteCard>
        <SectionLabel>Brand assets</SectionLabel>
        <Card>
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <img src={ICON} alt="She’s M.I.A app icon" style={css('width:56px;height:56px;border-radius:14px;flex-shrink:0')} />
            <div style={css('flex:1')}>
              <div style={css('font-size:13.5px;font-weight:var(--weight-semibold)')}>{v.bizBrandName}</div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted);margin-top:2px')}>App icon, sticker, business cards & the printed Kee Method™ sheets</div>
            </div>
          </div>
          <div style={css('margin-top:12px')}><Button variant="ghost" onClick={v.toastAssets}>Download brand assets</Button></div>
        </Card>
        <Button variant="ghost" onClick={v.exitAdmin}>🧽 Back to working mode</Button>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- Area -- */
function Area({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeAreaCount} title="Service area" subtitle="Where you take work · Metro Atlanta" />
      <div style={css('padding:22px')}>
        <NoteCard tone="pink" icon="📍">Leads outside your area still reach you — they just see a note that you’re booking selectively there. Tap a neighborhood to turn it on or off.</NoteCard>
        <SectionLabel right={v.areaLive ? undefined : v.chipDriveTime}>Neighborhoods</SectionLabel>
        {v.areaEmpty
          ? <Card><div style={css('font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.areaEmptyLine}</div></Card>
          : <Card flush>{v.areaRows.map((a: any, i: number) => <SupplyRow key={i} icon={a.icon} name={a.name} sub={a.sub} right={a.right} last={a.last} onClick={a.toggle} />)}</Card>}
        <Card>
          <SectionLabel>How far you’ll drive between stops</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.driveOpts.map((d: any, i: number) => <Pill key={i} selected={d.on} onClick={d.pick}>{d.label}</Pill>)}</div>
          <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Routes are built to respect this — you won’t be sent across town between two turnovers.</p>
        </Card>
        <Button variant="green" onClick={v.saveArea}>Save service area</Button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Assign -- */
function Assign({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeUnassigned} title="Assign jobs" subtitle="Who’s taking each clean this week" />
      <div style={css('padding:22px')}>
        <div style={css('display:flex;gap:var(--gap-tile);margin-bottom:var(--stack-card)')}>
          <StatTile value={v.unassignedCount} label="Waiting on you" color="var(--orange)" accent style={{ flex: 1 }} />
          <StatTile value={v.assignedCount} label="Assigned" color="var(--green-deep)" style={{ flex: 1 }} />
        </div>
        <SectionLabel action="Calendar" onAction={v.goCalendar}>This week’s cleans</SectionLabel>
        {v.assignJobs.map((j: any, i: number) => (
          <Card key={i}>
            <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:10px')}>
              <div>
                <div style={css('font-size:15.5px;font-weight:var(--weight-semibold)')}>{j.name}</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>{j.service}</div>
              </div>
              {j.statusChip}
            </div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:12px')}>{j.metas}</div>
            <div style={css('height:1px;background:var(--border-default);margin:14px 0')} />
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin-bottom:8px')}>Assign to</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{j.options.map((o: any, k: number) => <Pill key={k} selected={o.on} onClick={o.pick}>{o.label}</Pill>)}</div>
            <div style={{ ...css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);padding:10px 12px;border-radius:var(--radius-md)'), background: j.noteBg, border: '1px solid ' + j.noteLine, color: j.noteColor }}>{j.note}</div>
          </Card>
        ))}
        <NoteCard tone="pink" icon="🔒">Whoever you assign sees the home’s standard, the checklist and their own pay — never the client’s price or your split.</NoteCard>
        <Button variant="green" onClick={v.publishAssignments}>{v.publishLabel}</Button>
      </div>
    </>
  )
}

/* A checkbox that toggles via onChange, matching the prototype's inline pattern. */
function CheckboxToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return <Checkbox checked={on} onChange={toggle} size={22} />
}
