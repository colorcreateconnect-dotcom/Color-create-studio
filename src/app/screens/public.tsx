/* Public zone — Welcome, Services, Client sign-in, Business sign-in,
   Create account (4 steps), Cleaner onboarding (5 steps), Verify code,
   Notifications, Icon & splash. Ported from the reference prototype. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput, INP } from './ui'
import {
  Button, Card, Chip, Pill, Avatar, IconButton, SectionLabel, NoteCard,
  DetailHeader, ProgressBar, Checkbox, SupplyRow, TextField, PriceBox,
} from '../../ds/components'
import { PortfolioScreen } from './portfolio'
import { InviteScreen } from './invite'

const ICON = './assets/brand/app-icon.png'
const STICKER = './assets/brand/brand-sticker.png'

export function PublicScreens(v: any) {
  if (v.vWelcome) return (
    <>
      <div style={css('background:var(--gradient-brand-hero);color:var(--text-on-brand);padding:34px 22px 30px;border-radius:0 0 var(--radius-header) var(--radius-header);position:relative;overflow:hidden')}>
        <div style={css('position:absolute;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,.08);top:-90px;right:-70px')} />
        <div style={css('position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.07);bottom:-120px;left:-60px')} />
        <div style={css('position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center')}>
          <img src={STICKER} alt="She’s M.I.A · Luxury Housekeeping" style={css('width:96px;height:96px;border-radius:50%;box-shadow:0 12px 30px -14px rgba(42,23,32,.6)')} />
          <div style={css('font-family:var(--font-serif-display);font-size:34px;line-height:1.05;margin-top:2px')}>She’s Maid In ATL</div>
          <div style={css('font-family:var(--font-spaced);font-size:10px;letter-spacing:var(--tracking-spaced-wide);text-transform:uppercase;opacity:.9')}>Luxury Housekeeping</div>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;justify-content:center;margin-top:4px')}>
            <Chip tone="onBrand">🌱 Eco-conscious</Chip>
            <Chip tone="onBrand">Boutique</Chip>
            <Chip tone="onBrand">⭐ 5-star guaranteed</Chip>
          </div>
          <p style={css('margin:8px 0 0;font-size:13.5px;line-height:var(--leading-snug);opacity:.95;max-width:300px')}>Photo-verified cleans on The Kee Method™, tailored to your home. Serving Metro Atlanta.</p>
        </div>
      </div>
      <div style={css('padding:22px;display:flex;flex-direction:column;gap:10px')}>
        <Button onClick={v.goServices}>Explore her services</Button>
        <Button variant="ghost" icon="🖼️" onClick={v.goPortfolio}>See her work</Button>
        <Button variant="ghost" onClick={v.goOwnerSetup}>💌 Ahleyia sent me an invite</Button>
        <Button variant="ghost" onClick={v.goSignup}>Create my account</Button>
        <Button variant="ghost" onClick={v.goGate}>Client sign in</Button>
        <Button variant="ghost" icon="🧽" onClick={v.goStaffSetup}>I’m a cleaner with an invite</Button>
        <div style={css('margin-top:14px;text-align:center;font-size:11.5px;color:var(--text-muted)')}><span style={css('color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={v.goAdminLogin}>Business sign in</span></div>
        <div style={css('margin-top:14px;text-align:center;font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--text-muted)')}>Luxury rooted in generations of excellence</div>
      </div>
    </>
  )

  if (v.vServices) return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeNoAccount} title="Her services" subtitle="Every quote tailored to your home" />
      <div style={css('padding:22px')}>
        <SectionLabel>Airbnb turnovers</SectionLabel>
        <Card flush>
          {v.tiers.map((tier: any, i: number) => (
            <SupplyRow key={i} icon="🏠" name={tier.name} sub={tier.sub} right={tier.chip} last={tier.last} />
          ))}
        </Card>
        <SectionLabel>Luxury homes · residential</SectionLabel>
        <Card>
          <p style={css('margin:0 0 14px;font-size:13px;line-height:var(--leading-snug);color:var(--ink-soft)')}>From whole-home care to just the spaces you want kept — every residential quote is tailored to <b style={{ color: 'var(--ink)' }}>you</b>. Start yours: what should Ahleyia care for?</p>
          <div style={css('display:flex;flex-wrap:wrap;gap:var(--gap-chip)')}>
            {v.scopeOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}
          </div>
          <div style={css('height:1px;background:var(--border-default);margin:14px 0')} />
          <div style={css('display:flex;flex-wrap:wrap;gap:var(--gap-chip)')}>
            {v.sqftOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}
          </div>
          <div style={css('height:1px;background:var(--border-default);margin:14px 0')} />
          <div style={css('display:flex;flex-wrap:wrap;gap:var(--gap-chip)')}>
            {v.cadenceOpts.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}
          </div>
          <div style={css('margin-top:16px')}><Button onClick={v.goSignup}>Request my tailored quote</Button></div>
          <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug)')}>Ahleyia reviews your spaces & sends your personal quote — bespoke, like a tailor.</p>
        </Card>
        <NoteCard tone="eco" icon="🌱"><b>Eco & non-toxic.</b> Hospital-grade clean, zero bleach or ammonia — finished with your signature scent.</NoteCard>
        <Card tone="blush">
          <div style={css('font-size:13.5px;font-weight:var(--weight-semibold);margin-bottom:10px')}>With your account, you get her app:</div>
          <div style={css('display:grid;gap:8px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>
            <div>📷 Photo-verified report after every clean</div>
            <div>🏆 Live “guest-ready” status on your properties</div>
            <div>🛒 Supply restock via Instacart</div>
            <div>💳 Secure card on file — one simple charge</div>
          </div>
        </Card>
        <Button onClick={v.goSignup}>Get your tailored quote</Button>
      </div>
    </>
  )

  if (v.vGate) return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.badgeSafe} title="Welcome back" subtitle="Your number and a texted code — no password" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>Verify it’s you</SectionLabel>
          <Field icon="📱"><NativeInput type="tel" inputMode="tel" autoComplete="tel" aria-label="Mobile number" placeholder="(404) 555-0134" value={v.gatePhone} onChange={v.setGatePhone} /></Field>
          <p style={css('margin:10px 0 0;font-size:11.5px;color:var(--text-muted)')}>We text you a one-tap code — no password to remember.</p>
        </Card>
        <NoteCard tone="pink" icon="💌"><b>Got an invite link from Ahleyia?</b> Tap it instead — it opens your account instantly, already connected to her.</NoteCard>
        <Card tone="dashed">
          <p style={css('margin:0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>After this you’ll: paste your listing link (we auto-detect your home) → set your requirements & scent → save a credit card → get your tailored quote. Then everything — bookings, photo-proof reports, approvals — lives in your account.</p>
        </Card>
        <Button onClick={v.goVerify}>Text me the code</Button>
        <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted)')}>Cleaners & staff: separate sign-in — client accounts never see the working side.</p>
      </div>
    </>
  )

  if (v.vAdminLogin) return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.badgeMaster} title="Business sign in" subtitle="She’s Maid In ATL · owner access" />
      <div style={css('padding:22px')}>
        <Card tone="blush">
          <div style={css('display:flex;align-items:center;gap:14px')}>
            <img src={ICON} alt="She’s M.I.A" style={css('width:52px;height:52px;border-radius:14px;flex-shrink:0')} />
            <div>
              <div style={css('font-size:14px;font-weight:var(--weight-semibold)')}>The master account</div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:3px')}>One login for the business and the working day — money, people and pricing sit behind it.</div>
            </div>
          </div>
        </Card>
        <Card>
          <SectionLabel>Business email</SectionLabel>
          <Field icon="💌" style="box-sizing:border-box"><NativeInput type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-label="Business email" placeholder="ahleyia@atlluxurycleaning.com" value={v.adminEmail} onChange={v.setAdminEmail} /></Field>
          <div style={{ height: 8 }} />
          <Field icon="🔐" style="box-sizing:border-box">
            <NativeInput type={v.pwType} autoComplete="current-password" aria-label="Password" placeholder="Password" value={v.adminPw} onChange={v.setAdminPw} />
            <span style={css('font-size:11px;color:var(--magenta);cursor:pointer')} onClick={v.togglePw}>{v.pwToggleLabel}</span>
          </Field>
          <div style={css('margin-top:12px;display:flex;gap:12px;align-items:flex-start')}>
            <Checkbox checked={v.adminRemember} onChange={v.setAdminRemember} size={22} />
            <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Keep me signed in on this phone</div>
          </div>
        </Card>
        <NoteCard tone="pink" icon="🔒"><b>Two-step, every new device.</b> A code goes to {v.adminMaskedPhone} after your password — client data and payouts sit behind this login, so it stays locked down.</NoteCard>
        <Button onClick={v.adminSignIn}>Sign in to the business</Button>
        <div style={css('margin-top:14px;text-align:center;font-size:11.5px;color:var(--text-muted)')}><span style={css('color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={v.adminForgot}>Forgot your password?</span></div>
        <SectionLabel>Not the owner?</SectionLabel>
        <Card flush>
          <SupplyRow icon="🧽" name="Staff sign in" sub="Cleaners use their number and a texted code" right="›" onClick={v.goStaffSignIn} />
          <SupplyRow icon="🏡" name="Client sign in" sub="Owners and hosts" right="›" onClick={v.goGate} last />
        </Card>
      </div>
    </>
  )

  if (v.vSignup) return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.suBadge} title={v.suTitle} subtitle={v.suSub}>
        <div style={css('display:flex;justify-content:space-between;align-items:baseline;color:var(--text-on-brand);font-size:11px;margin-bottom:6px')}><span style={css('font-family:var(--font-spaced);letter-spacing:var(--tracking-spaced);text-transform:uppercase;font-size:9px')}>{v.suStepLabel}</span><span style={css('font-weight:var(--weight-semibold)')}>{v.suPctLabel}</span></div>
        <ProgressBar value={v.suPct} />
      </DetailHeader>
      <div style={css('padding:22px')}>
        {v.su1 && (<>
          <Card>
            <SectionLabel>Your name & number</SectionLabel>
            <Field icon="👤"><NativeInput type="text" autoComplete="name" aria-label="Full name" placeholder="Full name" value={v.suName} onChange={v.setSuName} /></Field>
            <div style={{ height: 8 }} />
            <Field icon="📱"><NativeInput type="tel" inputMode="tel" autoComplete="tel" aria-label="Mobile number" placeholder="(404) 555-0134" value={v.suPhone} onChange={v.setSuPhone} /></Field>
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>We text a code to confirm it’s you. That number is also how Ahleyia reaches you on the day.</p>
          </Card>
          <Card>
            <SectionLabel>Which kind of account?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suKinds.map((k: any, i: number) => <Pill key={i} selected={k.on} onClick={k.pick}>{k.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>{v.suScopeLabel}</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suScopes.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>How often?</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suCadence.map((c: any, i: number) => <Pill key={i} selected={c.on} onClick={c.pick}>{c.label}</Pill>)}</div>
          </Card>
          <NoteCard tone="pink" icon="🔒">No password to remember, ever. Your number and a texted code are your sign-in — on any phone.</NoteCard>
        </>)}
        {v.su2 && (<>
          <Card>
            <SectionLabel>Enter the code we sent {v.suPhoneShown}</SectionLabel>
            <CodeBoxes v={v} />
            <p style={css('margin:14px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>Tap the boxes and your phone’s own keypad opens — iOS and Android fill the code from your texts.</p>
          </Card>
          <Card flush>
            <SupplyRow icon="📱" name="Send it again" sub={v.suPhoneShown} right="›" onClick={v.resendCode} />
            <SupplyRow icon="✏️" name="Wrong number?" sub="Go back and change it" right="›" onClick={v.suBack} last />
          </Card>
        </>)}
        {v.su3 && (<>
          <Card>
            <SectionLabel right={v.chipVerified}>Your details</SectionLabel>
            <Field icon="💌"><NativeInput type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} aria-label="Email" placeholder="Email for reports and receipts" value={v.suEmail} onChange={v.setSuEmail} /></Field>
            <div style={{ height: 8 }} />
            <Field icon="📍"><NativeInput type="text" autoComplete="street-address" aria-label="Service address" placeholder="Service address" value={v.suAddress} onChange={v.setSuAddress} /></Field>
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Metro Atlanta only for now. You can add more properties once you’re in.</p>
          </Card>
          <Card>
            <SectionLabel>Neighborhood</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suHoods.map((h: any, i: number) => <Pill key={i} selected={h.on} onClick={h.pick}>{h.label}</Pill>)}</div>
          </Card>
          <Card>
            <SectionLabel>How should she reach you?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suContact.map((c: any, i: number) => <Pill key={i} selected={c.on} onClick={c.pick}>{c.label}</Pill>)}</div>
            <div style={css('font-size:12px;font-weight:var(--weight-semibold);margin:16px 0 6px')}>How did you find her?</div>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.suSource.map((s: any, i: number) => <Pill key={i} selected={s.on} onClick={s.pick}>{s.label}</Pill>)}</div>
          </Card>
          <Card>
            <div style={css('display:flex;gap:12px;align-items:flex-start')}>
              <Checkbox checked={v.suTerms} onChange={v.setSuTerms} size={22} />
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>I agree to the service terms and privacy policy. I understand my card is only charged when a clean is booked and Ahleyia arrives — <b>once, in full, never twice</b>.</div>
            </div>
          </Card>
        </>)}
        {v.su4 && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1;margin-top:12px')}>{v.suWelcome}</div>
              <p style={css('margin:8px auto 0;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Your account is live. Next: add your home so Ahleyia can quote it and set your standard.</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="✓" name={v.suName} sub={v.suPhoneShown + ' · verified'} right={v.chipVerified} />
            <SupplyRow icon="💌" name={v.suEmailShown} sub="Reports & receipts land here" right={v.chipReady} />
            <SupplyRow icon="📍" name={v.suHoodShown} sub={v.suAddressShown} right={v.chipReady} />
            <SupplyRow icon={v.suKindIcon} name={v.suKind} sub={v.suKindSub} right={v.chipReady} last />
          </Card>
          <NoteCard tone="money" icon="🧾"><b>Nothing has been charged.</b> You’ll add a card when you accept a quote — then it’s charged once, in full, on arrival. Tips are separate and 100% hers.</NoteCard>
        </>)}
        <Button variant={v.suBtnVariant} onClick={v.suNext}>{v.suNextLabel}</Button>
        {v.su1 && <div style={css('margin-top:14px;text-align:center;font-size:11.5px;color:var(--text-muted)')}>Already have an account? <span style={css('color:var(--magenta);cursor:pointer;text-decoration:underline')} onClick={v.goGate}>Sign in</span></div>}
      </div>
    </>
  )

  if (v.vInvite) return <InviteScreen v={v} />
  if (v.vPortfolio) return <PortfolioScreen v={v} />
  if (v.vStaffSetup) return <StaffSetup v={v} />
  if (v.vVerify) return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.badgeCodeSent} title="Enter your code" subtitle="Texted to (404) 555-0134 just now" />
      <div style={css('padding:22px')}>
        <Card>
          <CodeBoxes v={v} />
          <p style={css('margin:14px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>Tap the boxes and your phone’s own keypad opens — iOS and Android fill the code straight from your texts.</p>
        </Card>
        <NoteCard tone="pink" icon="🔒">No password to remember, ever. A fresh code every time you sign in on a new phone.</NoteCard>
        <Button onClick={v.verifyCode}>{v.verifyLabel}</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.resendCode}>Send it again</Button></div>
      </div>
    </>
  )

  if (v.vNotifs) return (
    <div style={css('min-height:860px;background:linear-gradient(160deg,#2A1720,#4A2C3A 55%,#8F1560);padding:44px 18px 22px;position:relative;overflow:hidden')}>
      <div style={css('position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.07);top:-90px;right:-80px')} />
      <div style={css('text-align:center;color:#fff;position:relative')}>
        <div style={css('font-family:var(--font-spaced);font-size:10px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;opacity:.7')}>Friday, July 24</div>
        <div style={css('font-family:var(--font-serif-display);font-size:64px;line-height:1;margin-top:4px')}>11:41</div>
      </div>
      <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:26px;position:relative')}>
        {v.pushCards.map((p: any, i: number) => (
          <div key={i} style={css('background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);border-radius:var(--radius-lg);padding:12px 14px;backdrop-filter:blur(6px);display:flex;gap:12px;align-items:flex-start')}>
            <img src={ICON} alt="She’s M.I.A" style={css('width:34px;height:34px;border-radius:10px;flex-shrink:0')} />
            <div style={css('flex:1;color:#fff')}>
              <div style={css('display:flex;justify-content:space-between;gap:8px;align-items:baseline')}>
                <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;opacity:.75')}>She’s Maid In ATL</div>
                <div style={css('font-size:9.5px;opacity:.65')}>{p.when}</div>
              </div>
              <div style={css('font-size:13px;font-weight:var(--weight-semibold);margin-top:3px')}>{p.title}</div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);opacity:.86;margin-top:2px')}>{p.body}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={css('margin:18px 4px 14px;font-size:10.5px;line-height:var(--leading-snug);color:rgba(255,255,255,.6);text-align:center')}>Short, warm, and never jargon — each one opens straight to what it’s about.</p>
      <div style={css('display:flex;gap:8px;position:relative')}>
        <Button variant="ghost" onClick={v.goOwnerHome}>Open as owner</Button>
        <Button variant="ghost" onClick={v.goWelcome}>Unlock</Button>
      </div>
    </div>
  )

  if (v.vSplash) return (
    <div style={css('min-height:860px;background-image:var(--gradient-brand-hero);color:var(--text-on-brand);padding:70px 30px 34px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;position:relative;overflow:hidden')}>
      <div style={css('position:absolute;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.08);top:-100px;left:-80px')} />
      <div style={css('position:absolute;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.07);bottom:-110px;right:-70px')} />
      <div style={css('display:flex;flex-direction:column;align-items:center;gap:18px;position:relative')}>
        <img src={ICON} alt="She’s M.I.A Housekeeping app icon" style={css('width:112px;height:112px;border-radius:26px;box-shadow:0 20px 44px -18px rgba(42,23,32,.65)')} />
        <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced-wide);text-transform:uppercase;opacity:.8')}>She’s M.I.A · Housekeeping</div>
      </div>
      <div style={css('text-align:center;position:relative')}>
        <div style={css('font-family:var(--font-serif-display);font-size:42px;line-height:1.02')}>She’s Maid<br />In ATL</div>
        <div style={css('font-family:var(--font-spaced);font-size:10px;letter-spacing:var(--tracking-spaced-wide);text-transform:uppercase;opacity:.9;margin-top:14px')}>Luxury Housekeeping</div>
      </div>
      <div style={css('text-align:center;position:relative')}>
        <div style={css('width:150px;height:3px;border-radius:2px;background:rgba(255,255,255,.3);margin:0 auto 20px;overflow:hidden')}>
          <div style={css('width:62%;height:100%;background:#fff;border-radius:2px')} />
        </div>
        <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;opacity:.85')}>Luxury rooted in generations of excellence</div>
        <div style={css('margin-top:18px')}><Button variant="ghost" onClick={v.goWelcome}>Continue</Button></div>
      </div>
    </div>
  )

  return null
}

function CodeBoxes({ v }: { v: any }) {
  return (
    <div style={css('position:relative')}>
      <div style={css('display:flex;gap:10px;justify-content:center;margin:4px 0 6px;cursor:text')} onClick={v.focusCode}>
        {v.codeBoxes.map((b: any, i: number) => (
          <div key={i} style={{ ...css('width:56px;height:66px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-family:var(--font-serif-display);font-size:30px;color:var(--ink)'), border: '1px solid ' + b.border, background: b.bg }}>{b.char}</div>
        ))}
      </div>
      <input ref={v.codeRef} type="tel" inputMode="numeric" autoComplete="one-time-code" maxLength={4} aria-label="4-digit code" value={v.code} onChange={v.setCode} style={css('position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;background:transparent;font-size:16px;caret-color:transparent')} />
    </div>
  )
}

function StaffSetup({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.staffBadge} title={v.staffTitle} subtitle={v.staffSub}>
        <div style={css('display:flex;justify-content:space-between;align-items:baseline;color:var(--text-on-brand);font-size:11px;margin-bottom:6px')}><span style={css('font-family:var(--font-spaced);letter-spacing:var(--tracking-spaced);text-transform:uppercase;font-size:9px')}>{v.staffStepLabel}</span><span style={css('font-weight:var(--weight-semibold)')}>{v.staffPctLabel}</span></div>
        <ProgressBar value={v.staffPct} />
      </DetailHeader>
      <div style={css('padding:22px')}>
        {v.st1 && (<>
          <Card tone="blush">
            <div style={css('display:flex;align-items:center;gap:14px')}>
              <Avatar initials="AK" size={52} />
              <div>
                <div style={css('font-size:14px;font-weight:var(--weight-semibold)')}>Ahleyia Kee invited you</div>
                <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:2px')}>She’s Maid In ATL · Luxury Housekeeping</div>
              </div>
            </div>
            <p style={css('margin:14px 0 0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>“I’d love you on my team. You’ll clean my standard, get paid the day you work, and never have to find your own clients.”</p>
          </Card>
          <SectionLabel>What you’re joining</SectionLabel>
          <Card flush>
            <SupplyRow icon="⚡" name="Paid the day you work" sub="50% released when you check in, the rest on approval" right={v.chipReady} />
            <SupplyRow icon="📋" name="The Kee Method™, step by step" sub="You’re never guessing what ‘done’ looks like" right={v.chipReady} />
            <SupplyRow icon="👤" name="Clients come to you" sub="Routes are built and scheduled for you" right={v.chipReady} />
            <SupplyRow icon="📷" name="Your work is documented" sub="Photo proof protects you as much as the owner" right={v.chipReady} last />
          </Card>
          <Card>
            <SectionLabel>Your details</SectionLabel>
            <Field icon="👤"><NativeInput type="text" autoComplete="name" aria-label="Full name" placeholder="Full name" value={v.staffName} onChange={v.setStaffName} /></Field>
            <div style={{ height: 8 }} />
            <Field icon="📱"><NativeInput type="tel" inputMode="tel" autoComplete="tel" aria-label="Mobile number" placeholder="Mobile number" /></Field>
            <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug)')}>We text you a code to sign in — no password to remember.</p>
          </Card>
        </>)}
        {v.st2 && (<>
          <NoteCard tone="pink" icon="🔒"><b>This is for the owners’ peace of mind, and yours.</b> Homes with keys and alarm codes need a verified name behind them — it’s what lets her charge luxury rates for your work.</NoteCard>
          <Card flush>{v.verifySteps.map((s: any, i: number) => <SupplyRow key={i} icon={s.icon} name={s.name} sub={s.sub} right={s.right} last={s.last} onClick={s.go} />)}</Card>
          <Card tone="dashed"><p style={css('margin:0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Background check is run by a third party and takes 1–3 days. You can finish setup now and start once it clears — Ahleyia sees only pass or fail, never your report.</p></Card>
        </>)}
        {v.st3 && (<>
          <NoteCard tone="money" icon="⚡"><b>This is how you get paid — set it up once.</b> 50% lands the moment you check in on site, the rest when the owner approves, or automatically in 48 hours.</NoteCard>
          <Card>
            <SectionLabel>Where your money lands</SectionLabel>
            <Field icon="🏦"><NativeInput type="text" aria-label="Bank name" placeholder="Bank name" /></Field>
            <div style={{ height: 8 }} />
            <div style={css('display:flex;gap:8px')}>
              <Field><NativeInput type="tel" inputMode="numeric" aria-label="Routing number" placeholder="Routing" /></Field>
              <Field><NativeInput type="tel" inputMode="numeric" aria-label="Account number" placeholder="Account" /></Field>
            </div>
            <div style={css('margin-top:12px;font-size:11.5px;line-height:var(--leading-snug);color:var(--green-deep);background:var(--tint-green);border:1px solid var(--tint-green-line);border-radius:var(--radius-md);padding:10px 12px')}>Instant payouts are on by default. You can switch to daily deposits any time in Settings.</div>
          </Card>
          <Card>
            <SectionLabel>Tax details</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.taxKinds.map((t: any, i: number) => <Pill key={i} selected={t.on} onClick={t.pick}>{t.label}</Pill>)}</div>
            <p style={css('margin:12px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>You’re an independent contractor. Your 1099 and yearly summary live in Settings → Tax documents.</p>
          </Card>
        </>)}
        {v.st4 && (<>
          <NoteCard tone="eco" icon="📋"><b>The Kee Method™ is the job.</b> Learn the five phases and the photo moments, then clean one home alongside Ahleyia. That’s certification — no exam, no fee.</NoteCard>
          <Card flush>{v.certSteps.map((s: any, i: number) => <SupplyRow key={i} icon={s.icon} name={s.name} sub={s.sub} right={s.right} last={s.last} onClick={s.go} />)}</Card>
          <Card>
            <SectionLabel>Agree to the standard</SectionLabel>
            {v.standards.map((sd: any, i: number) => (
              <div key={i} style={css('display:flex;gap:12px;align-items:flex-start;padding:9px 0')}>
                <Checkbox checked={sd.on} onChange={sd.toggle} size={22} />
                <div style={css('font-size:12px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{sd.label}</div>
              </div>
            ))}
          </Card>
        </>)}
        {v.st5 && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:24px;line-height:1.1;margin-top:12px')}>You’re on the team</div>
              <p style={css('margin:8px auto 0;max-width:255px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>{v.staffDoneCopy}</p>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="✓" name="Account created" sub="Sign in with your number and a texted code" right={v.chipReady} />
            <SupplyRow icon="🏦" name="Payouts connected" sub="Instant payouts on" right={v.chipReady} />
            <SupplyRow icon="📋" name="Certification" sub={v.certStatusSub} right={v.certStatusChip} />
            <SupplyRow icon="👤" name="Background check" sub="Running · 1–3 days" right={v.chipPendingCheck} last />
          </Card>
          <NoteCard tone="money" icon="💰">Your first job pays 50% the moment you check in. Nothing is deducted for joining — she takes her share from the business side, not your pay.</NoteCard>
          <Button onClick={v.enterStaffApp}>Open my working day</Button>
        </>)}
        {v.staffNotDone && (<>
          <Button onClick={v.staffNext}>{v.staffNextLabel}</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Takes about 6 minutes. You can stop and come back — nothing is lost.</p>
        </>)}
      </div>
    </>
  )
}
