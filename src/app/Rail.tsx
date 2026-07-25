/* Desktop / tablet navigation rail (≥820px), per the responsive handoff.
 *
 * On a phone the app keeps its bottom tab bar and ☰ menu. From 820px up the
 * frame becomes a two-pane app: this rail on the left (brand, who you are, the
 * SAME menu groups as the phone's ☰ sheet, and the account switcher at the
 * bottom) with a readable content column beside it. The rail is hidden by CSS
 * below 820px, so one render serves every size. */
import React from 'react'
import { css } from './css'

export function Rail({ v }: { v: any }) {
  return (
    <div id="rail">
      <div className="brandbar">
        <div className="lg">She’s Maid In ATL</div>
        <div className="sm">Luxury Housekeeping</div>
      </div>
      <div className="who"><b>{v.railWhoName}</b>{v.railWhoSub}</div>

      {v.menuGroups.map((g: any, gi: number) => (
        <React.Fragment key={gi}>
          <div className="grp">{g.title}</div>
          {g.items.map((it: any, i: number) => (
            <a key={i} className={it.active ? 'on' : ''} onClick={it.go}>
              <span className="ic">{it.icon}</span><span>{it.name}</span>
            </a>
          ))}
        </React.Fragment>
      ))}

      <div className="foot">
        <div className="acctbtn" onClick={v.openAcct}>
          <div className="av">{v.acctIcon}</div>
          <div style={css('flex:1;min-width:0')}>
            <b>{v.acctName}</b>
            <span>{v.acctSub}</span>
          </div>
          <div style={css('color:var(--text-muted);font-size:15px')}>⇅</div>
        </div>
      </div>
    </div>
  )
}
