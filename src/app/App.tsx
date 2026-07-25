/* App shell — the stage the phone floats on, the role switcher chrome, the
   PhoneFrame with the active screen + bottom tab bar, the overlays, and the
   "Every screen" index. Reads the ?role / ?chrome query params so the app can
   be deep-linked straight into a zone (e.g. ?role=owner&chrome=0). */
import React from 'react'
import { css } from './css'
import { useModel } from './model'
import type { ModelProps } from './model'
import { PhoneFrame, TabBar, Pill } from '../ds/components'
import { PublicScreens } from './screens/public'
import { CleanerScreens } from './screens/cleaner'
import { OwnerScreens } from './screens/owner'
import { SharedScreens } from './screens/shared'
import { ConciergeScreens } from './screens/concierge'
import { Overlays, ScreenIndex } from './screens/chrome'
import { Rail } from './Rail'

function readProps(): ModelProps {
  const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const role = q.get('role')
  const chrome = q.get('chrome')
  const fill = q.get('fill')
  return {
    startRole: role === 'cleaner' || role === 'owner' || role === 'visitor' ? role : 'visitor',
    // The live app shows just the app. The review showcase (device switcher +
    // role pills + "Every screen" index) is opt-in with ?chrome=1.
    showChrome: chrome === '1' || chrome === 'true',
    autoFillMethod: fill === '1' || fill === 'true',
  }
}

export default function App() {
  const { v } = useModel(readProps())

  const screen = PublicScreens(v) || CleanerScreens(v) || OwnerScreens(v) || ConciergeScreens(v) || SharedScreens(v)

  return (
    <div className={'sm-stage' + (v.showChrome ? '' : ' sm-stage--app')}>
      {v.showChrome && (
        <div style={css('text-align:center;max-width:520px;display:flex;flex-direction:column;align-items:center;gap:10px')}>
          <div style={css('font-family:var(--font-serif-display);font-size:38px;line-height:1;color:var(--orange)')}>She’s Maid In <span style={{ color: 'var(--magenta)' }}>ATL</span></div>
          <div style={css('font-family:var(--font-spaced);font-size:11px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--ink-soft)')}>Luxury Housekeeping</div>
          <p style={css('margin:6px 0 0;font-size:13px;line-height:var(--leading-body);color:var(--ink-soft)')}>One app, three sides: what a client sees when they scan her card, Ahleyia’s working day, and the owner’s account. Pick a side below, or open any screen from the index at the bottom.</p>
          <div style={css('display:flex;gap:var(--gap-chip);margin-top:6px')}>
            <Pill selected={v.isVisitor} onClick={v.goVisitor}>Clients & guests</Pill>
            <Pill selected={v.isCleaner} onClick={v.goCleaner}>Ahleyia</Pill>
            <Pill selected={v.isOwner} onClick={v.goOwner}>Owners</Pill>
          </div>
        </div>
      )}

      <div style={css('position:relative')}>
        <PhoneFrame time="11:41" label={v.roleLabel} appMode={!v.showChrome} rail={!v.showChrome ? <Rail v={v} /> : null}>
          <div style={css('min-height:100%;display:flex;flex-direction:column')}>
            <div style={css('flex:1')}>{screen}</div>
            {v.isCleaner && <div className="sm-tabbar-slot" style={css('position:sticky;bottom:0')}><TabBar tabs={v.cleanerTabs} active={v.cTab} onSelect={v.pickCTab} /></div>}
            {v.isOwner && <div className="sm-tabbar-slot" style={css('position:sticky;bottom:0')}><TabBar tabs={v.ownerTabs} active={v.oTab} onSelect={v.pickOTab} /></div>}
          </div>
        </PhoneFrame>
        <Overlays v={v} />
      </div>

      {v.showChrome && <ScreenIndex v={v} />}
    </div>
  )
}
