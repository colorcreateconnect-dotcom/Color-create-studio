/* Chrome that sits over / around the phone: the bottom sheets (Instacart cart,
   zone menu, navigation-app picker), the full-screen camera capture overlay,
   the confirming toast, and the "Every screen" index below the device. */
import React from 'react'
import { css } from '../css'
import { Button, Card, Sheet, SectionLabel, SupplyRow, Checkbox, Pill, Toast } from '../../ds/components'

const RADIUS_WRAP = 'position:absolute;inset:0;border-radius:var(--radius-phone);overflow:hidden'

/** All overlays that render on top of the phone frame. */
export function Overlays({ v }: { v: any }) {
  return (
    <>
      {v.sheetOpen && (
        <div style={css(RADIUS_WRAP)}>
          <Sheet open onClose={v.closeCart}>
            <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:4px')}>
              <div style={css('background:var(--instacart);color:#fff;font-size:11px;font-weight:var(--weight-semibold);padding:5px 10px;border-radius:999px')}>🍎 Instacart</div>
              <div style={css('font-size:11.5px;color:var(--text-muted)')}>Units 1604 · 1403 · 1913</div>
            </div>
            <div style={css('font-size:13px;color:var(--ink-soft);margin-bottom:12px')}>Your reorder cart — grouped by unit for drop-off</div>
            <div style={css('display:grid;gap:10px;font-size:12.5px;color:var(--ink-soft);border-top:1px solid var(--border-default);padding-top:12px')}>
              <div style={css('display:flex;justify-content:space-between')}><span>🧻 Bounty Paper Towels, 6-pack</span><b>x7</b></div>
              <div style={css('display:flex;justify-content:space-between')}><span>🧺 Tide Laundry Detergent</span><b>x2</b></div>
              <div style={css('display:flex;justify-content:space-between')}><span>🍷 Wine — welcome bottles</span><b>x2</b></div>
              <div style={css('display:flex;justify-content:space-between')}><span>🧴 Bath tissue, 12-pack</span><b>x2</b></div>
              <div style={css('display:flex;justify-content:space-between')}><span>🗑️ Trash bags</span><b>x1</b></div>
            </div>
            <div style={css('display:flex;justify-content:space-between;align-items:baseline;margin:14px 0;padding-top:12px;border-top:1px solid var(--border-default)')}>
              <span style={css('font-size:12.5px;font-weight:var(--weight-semibold)')}>Estimated total</span>
              <span style={css('font-family:var(--font-serif-display);font-size:26px')}>$134.80</span>
            </div>
            <Button variant="green" onClick={v.sendInstacart}>Open Instacart & place order →</Button>
            <div style={css('margin-top:8px')}><Button variant="ghost" onClick={v.closeCart}>Not now</Button></div>
            <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);text-align:center')}>You’ll be handed off to Instacart to confirm payment & delivery window.</p>
          </Sheet>
        </div>
      )}

      {/* Account switcher — reachable from the rail on a laptop and the ☰ menu
          on a phone. Hops between the business, the working day, a client's
          account, and the signed-out public view. */}
      {v.acctOpen && (
        <div style={css(RADIUS_WRAP)}>
          <Sheet open onClose={v.closeAcct}>
            <div style={css('text-align:center;margin-bottom:14px')}>
              <div style={css('font-family:var(--font-serif-display);font-size:20px;line-height:1.2')}>Switch view</div>
              <div style={css('font-size:11.5px;color:var(--text-muted);margin-top:4px')}>Signed in as {v.acctEmail}</div>
            </div>
            <Card flush>
              {v.acctRows.map((a: any, i: number) => (
                <SupplyRow key={i} icon={a.icon} name={a.name} sub={a.sub} last={a.last}
                  right={a.current ? v.chipCurrent : '›'} onClick={a.use} />
              ))}
            </Card>
            <div style={css('margin-top:8px')}><Button variant="ghost" onClick={v.closeAcct}>Close</Button></div>
          </Sheet>
        </div>
      )}

      {v.menuOpen && (
        <div style={css(RADIUS_WRAP)}>
          <Sheet open onClose={v.closeMenu}>
            <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>{v.menuTitle}</div>
            <div style={css('font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:6px')}>{v.menuSub}</div>
            <div style={css('margin-top:12px')}>
              <div className="acctbtn" onClick={v.switchViewFromMenu}>
                <div className="av">{v.acctIcon}</div>
                <div style={css('flex:1;min-width:0')}>
                  <b>{v.acctName}</b>
                  <span>Switch view</span>
                </div>
                <div style={css('color:var(--text-muted);font-size:15px')}>⇅</div>
              </div>
            </div>
            <div style={css('margin-top:14px;max-height:400px;overflow:auto')}>
              {v.menuGroups.map((g: any, i: number) => (
                <div key={i} style={css('margin-bottom:10px')}>
                  <SectionLabel>{g.title}</SectionLabel>
                  <Card flush>{g.items.map((it: any, k: number) => <SupplyRow key={k} icon={it.icon} name={it.name} sub={it.sub} right={it.right} last={it.last} onClick={it.go} />)}</Card>
                </div>
              ))}
            </div>
            <div style={css('margin-top:6px')}><Button variant="ghost" onClick={v.closeMenu}>Close</Button></div>
          </Sheet>
        </div>
      )}

      {v.navOpen && (
        <div style={css(RADIUS_WRAP)}>
          <Sheet open onClose={v.closeNav}>
            <div style={css('font-family:var(--font-serif-display);font-size:22px;line-height:1.1')}>Navigate with</div>
            <div style={css('font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:6px')}>{v.navStopLine}</div>
            <div style={css('margin-top:14px;border-top:1px solid var(--border-default)')}>
              {v.navApps.map((a: any, i: number) => <SupplyRow key={i} icon={a.icon} name={a.name} sub={a.sub} right={a.right} last={a.last} onClick={a.go} />)}
            </div>
            <div style={css('margin-top:14px;display:flex;gap:12px;align-items:flex-start;background:var(--surface-cream);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:11px 13px')}>
              <Checkbox checked={v.navRemember} onChange={v.setNavRemember} size={22} />
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Always use this one — skip this step next time.</div>
            </div>
            <div style={css('margin-top:14px')}><Button variant="ghost" onClick={v.copyAddress}>Copy the address instead</Button></div>
            <p style={css('margin:10px 0 0;font-size:11px;color:var(--text-muted);text-align:center;line-height:var(--leading-snug)')}>Only the apps on your phone are listed. Your route stays here — we just hand over the address.</p>
          </Sheet>
        </div>
      )}

      {v.camOpen && (
        <div style={css('position:absolute;inset:0;border-radius:var(--radius-phone);overflow:hidden;background:#150C11;display:flex;flex-direction:column')}>
          <div style={css('padding:52px 20px 14px;display:flex;align-items:center;gap:12px;color:#fff')}>
            <div style={css('width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer')} onClick={v.closeCam}>←</div>
            <div style={css('flex:1')}>
              <div style={css('font-size:13.5px;font-weight:var(--weight-semibold)')}>{v.camTitle}</div>
              <div style={css('font-size:10.5px;opacity:.7;margin-top:2px')}>Match this shot — your reference photo is ghosted over the frame</div>
            </div>
          </div>
          <div style={css('flex:1;margin:0 14px;border-radius:var(--radius-lg);position:relative;overflow:hidden;background:#241A20')}>
            <div style={css('position:absolute;inset:0;background:var(--photo-2);opacity:.52')} />
            <div style={css('position:absolute;left:14%;right:14%;top:34%;height:30%;border:2px dashed rgba(255,255,255,.55);border-radius:14px')} />
            <div style={css('position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr')}>
              {Array.from({ length: 9 }).map((_, i) => {
                const col = i % 3, row = Math.floor(i / 3)
                const br = col < 2 ? '1px solid rgba(255,255,255,.18)' : undefined
                const bb = row < 2 ? '1px solid rgba(255,255,255,.18)' : undefined
                return <div key={i} style={{ borderRight: br, borderBottom: bb }} />
              })}
            </div>
            <div style={css('position:absolute;top:12px;left:12px;background:var(--stamp-scrim);color:#fff;font-size:10px;padding:4px 9px;border-radius:8px;backdrop-filter:blur(2px)')}>🖼️ Reference · ghosted</div>
            <div style={css('position:absolute;bottom:0;left:0;right:0;height:90px;background:linear-gradient(transparent,rgba(0,0,0,.6))')} />
            <div style={css('position:absolute;bottom:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-end;color:#fff')}>
              <div style={css('font-size:11px;line-height:var(--leading-snug);max-width:70%')}>{v.camHint}</div>
              <div style={css('background:var(--stamp-scrim);font-size:10px;padding:4px 9px;border-radius:8px;backdrop-filter:blur(2px)')}>📍 12:31 PM</div>
            </div>
          </div>
          <div style={css('padding:20px;display:flex;align-items:center;justify-content:center;gap:26px')}>
            <div style={css('color:#fff;font-size:11px;opacity:.7;width:60px;text-align:center;cursor:pointer')} onClick={v.closeCam}>Cancel</div>
            <div style={css('width:70px;height:70px;border-radius:50%;background:#fff;border:5px solid rgba(255,255,255,.32);cursor:pointer;box-shadow:0 10px 24px -10px rgba(200,28,126,.8)')} onClick={v.shoot} />
            <div style={css('color:#fff;font-size:11px;opacity:.7;width:60px;text-align:center')}>🍃 Stamped</div>
          </div>
        </div>
      )}

      <div style={css('position:absolute;inset:0;border-radius:var(--radius-phone);overflow:hidden;pointer-events:none')}>
        <Toast visible={v.toastOn}>{v.toastMsg}</Toast>
      </div>
    </>
  )
}

/** The "Every screen" index rendered below the phone (design-review chrome). */
export function ScreenIndex({ v }: { v: any }) {
  return (
    <div style={css('width:100%;max-width:560px;background:var(--surface-card);border-radius:var(--radius-sheet);box-shadow:0 26px 60px -30px rgba(42,23,32,.5);padding:26px 24px 24px')}>
      <div style={css('text-align:center;margin-bottom:18px')}>
        <div style={css('font-family:var(--font-serif-display);font-size:22px')}>Every screen</div>
        <p style={css('margin:6px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>Tap any line to open that screen on the phone above.</p>
      </div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px')}>
        {v.tour.map((g: any, i: number) => (
          <div key={i}>
            <div style={css('font-family:var(--font-spaced);font-size:9.5px;letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--magenta);padding-bottom:10px')}>{g.title}</div>
            <div style={css('display:flex;flex-direction:column;gap:6px;align-items:flex-start')}>
              {g.items.map((it: any, k: number) => <Pill key={k} onClick={it.go} style={{ width: '100%', textAlign: 'left' }}>{it.n} · {it.label}</Pill>)}
            </div>
          </div>
        ))}
      </div>
      <div style={css('margin-top:22px;padding-top:18px;border-top:1px solid var(--border-default);display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px')}>
        <div>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--magenta);margin-bottom:6px')}>Dark mode — decided</div>
          <p style={css('margin:0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>The app stays <b style={{ color: 'var(--ink)' }}>light</b> — the cream and pink <i>is</i> the identity. Only the lock screen and notifications, which the phone owns, are dark.</p>
        </div>
        <div>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--magenta);margin-bottom:6px')}>Contrast</div>
          <p style={css('margin:0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>Small text sits on deep magenta or ink, never orange on pink, so every label stays readable at a glance — indoors, outdoors, one-handed.</p>
        </div>
        <div>
          <div style={css('font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--magenta);margin-bottom:6px')}>Icon & splash</div>
          <p style={css('margin:0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted)')}>Her M.I.A mark on the brand gradient, with the serif lockup on the opening screen.</p>
        </div>
      </div>
      <p style={css('margin:20px 0 0;font-size:11px;line-height:var(--leading-snug);color:var(--text-muted);text-align:center')}>Clients never see hours, rates or splits — one tailored number, always. The pricing math lives only on Ahleyia’s side.</p>
      <div style={css('margin-top:16px;text-align:center;font-family:var(--font-spaced);font-size:9px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--magenta)')}>Luxury rooted in generations of excellence</div>
    </div>
  )
}
