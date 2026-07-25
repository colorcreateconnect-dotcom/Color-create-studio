/* Concierge tier (v3) — the second revenue line. NOT cleaning: no Kee Method
 * checklist, no photo proof. Her time and her receipts. Openly $70/hr, purchases
 * at cost, request→she confirms, capture at close. Voice: warm, specific, never
 * apologetic about money — the money copy is load-bearing in both directions. */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import {
  Button, Card, Chip, Pill, IconButton, SectionLabel, NoteCard, DetailHeader,
  SupplyRow, TextField, Avatar,
} from '../../ds/components'

export function ConciergeScreens(v: any) {
  if (v.oConcierge) return <RequestConcierge v={v} />
  if (v.cConcierge) return <ConciergeVisit v={v} />
  return null
}

/* --------------------------------------------- Owner · Request concierge -- */
function RequestConcierge({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={<Chip tone="onBrand">💫 Concierge</Chip>} title="Request concierge" subtitle="Her time, not a clean" />
      <div style={css('padding:22px')}>
        {!v.conciergeSent && (<>
          <NoteCard tone="pink" icon="💫">For clients who want a hands-free, worry-free, stress-free lifestyle. Everything below is <b>her time, not a clean</b>.</NoteCard>
          <SectionLabel>What can she help with?</SectionLabel>
          <Card flush>
            {v.conciergeServices.map((sv: any, i: number) => (
              <SupplyRow key={sv.id} icon={sv.icon} name={sv.name} sub={sv.desc} last={i === v.conciergeServices.length - 1} onClick={sv.toggle}
                right={sv.on ? <Chip tone="refresh">✓ Added</Chip> : <Chip tone="ghost">Add</Chip>} />
            ))}
          </Card>
          <Card>
            <SectionLabel>When works for you?</SectionLabel>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.conciergeWindows.map((w: any, i: number) => <Pill key={i} selected={w.on} onClick={w.pick}>{w.label}</Pill>)}</div>
          </Card>
          <Card>
            <SectionLabel>Anything specific?</SectionLabel>
            <TextField icon="✏️" placeholder="The Vietnamese coffee from Buford Highway…" value={v.conciergeNote} onChange={v.setConciergeNote} />
            <p style={css('margin:10px 0 0;font-size:11.5px;line-height:var(--leading-snug);color:var(--text-muted)')}>The more specific, the better — that specificity is the whole product.</p>
          </Card>
          <Card tone="ink">
            <div style={css('display:flex;justify-content:space-between;align-items:baseline')}>
              <div>
                <div style={css('font-size:13px;font-weight:var(--weight-semibold)')}>Her time</div>
                <div style={css('font-size:11px;opacity:.7;margin-top:2px')}>Billed by the hour, in 15-min steps</div>
              </div>
              <div style={css('font-family:var(--font-serif-display);font-size:34px;line-height:1')}>{v.conciergeRateLabel}</div>
            </div>
            <div style={css('margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.15);font-size:12px;opacity:.85;line-height:var(--leading-snug)')}>Purchases are reimbursed <b>at cost — no markup on your groceries</b>. Her time is the earning.</div>
          </Card>
          <Button onClick={v.sendConciergeRequest}>Send request to Ahleyia</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>She confirms the window before anything is booked. Nothing is charged until she arrives.</p>
        </>)}
        {v.conciergeSent && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background:var(--gradient-brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto')}>💫</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>She’ll confirm your window</div>
              <p style={css('margin:8px auto 0;max-width:260px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>Concierge time varies too much to auto-book — she confirms, then it’s set. Nothing is charged yet.</p>
            </div>
          </Card>
          <SectionLabel>Requested</SectionLabel>
          <Card flush>
            {v.conciergeChosenLabels.length
              ? v.conciergeChosenLabels.map((name: string, i: number, arr: string[]) => <SupplyRow key={i} icon="💫" name={name} right={<Chip tone="turn">Pending</Chip>} last={i === arr.length - 1} />)
              : <SupplyRow icon="💫" name="Concierge visit" right={<Chip tone="turn">Pending</Chip>} last />}
          </Card>
          <NoteCard tone="money" icon="🧾"><b>{v.conciergeRateLabel} for her time</b>, plus any purchases at cost — shown as separate receipt lines, inside one charge at close. <b>No markup on your groceries.</b></NoteCard>
          <Button variant="ghost" onClick={v.openAhleyia}>Add a detail for Ahleyia</Button>
          <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.changeConciergeRequest}>Change my request</Button></div>
        </>)}
      </div>
    </>
  )
}

/* --------------------------------------------- Cleaner · Concierge visit -- */
function ConciergeVisit({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={<Chip tone="onBrand">Concierge · her time</Chip>} title="Concierge visit" subtitle="The Hartwell Estate · her time & her receipts" />
      <div style={css('padding:22px')}>
        {v.visitBrief && (<>
          <NoteCard tone="pink" icon="💫"><b>No Kee Method checklist here</b> — this is her time and her judgment. What matters is the clock and the receipts.</NoteCard>
          <Card>
            <SectionLabel>What they asked for</SectionLabel>
            <p style={css('margin:0;font-size:13px;line-height:var(--leading-snug);color:var(--ink-soft);font-style:italic')}>“Grocery concierge before we land Friday — and the Vietnamese coffee from Buford Highway if you can.”</p>
          </Card>
          <Card flush>
            <SupplyRow icon="⏱" name="Her rate" sub="Billed by the hour, in 15-min steps" right={<b style={{ fontSize: '13px' }}>{v.conciergeRateLabel}</b>} />
            <SupplyRow icon="🧾" name="Purchases" sub="Reimbursed at cost — no markup on goods" right={<Chip tone="refresh">At cost</Chip>} last />
          </Card>
          <Button variant="green" onClick={v.startClock}>Start the clock</Button>
        </>)}
        {v.visitOnClock && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('font-family:var(--font-serif-display);font-size:52px;line-height:1;color:var(--ink)')}>{v.visitTimeLabel}</div>
              <div style={css('font-size:13px;color:var(--green-deep);margin-top:4px')}>{v.visitCharge} · her time so far</div>
              <div style={css('display:flex;gap:10px;justify-content:center;margin-top:14px')}>
                <Button variant="ghost" size="sm" onClick={() => v.addTime(-15)}>− 15 min</Button>
                <Button variant="ghost" size="sm" onClick={() => v.addTime(15)}>+ 15 min</Button>
              </div>
            </div>
          </Card>
          <SectionLabel>Log an expense</SectionLabel>
          <Card>
            <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:12px')}>{v.expCats.map((c: any, i: number) => <Pill key={i} selected={c.on} onClick={c.pick}>{c.label}</Pill>)}</div>
            <div style={css('display:flex;gap:8px;align-items:center')}>
              <div style={css('font-family:var(--font-serif-display);font-size:22px')}>$</div>
              <Field><NativeInput type="tel" inputMode="decimal" aria-label="Receipt total" placeholder="Receipt total" value={v.expAmount} onChange={v.setExpAmount} /></Field>
            </div>
            <div style={css('margin-top:10px;display:flex;gap:10px;align-items:center')}>
              <div style={{ ...css('width:64px;height:64px;border-radius:var(--radius-md);position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;border:1px dashed var(--tint-pink-line)'), background: v.expPhoto ? 'var(--photo-2)' : 'var(--surface-cream)' }} onClick={v.attachExpPhoto}>{v.expPhoto ? '' : '📷'}</div>
              <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);flex:1')}>The photo is the owner’s proof. <b>No receipt, no reimbursement</b> — that rule protects you both.</div>
            </div>
            <div style={css('margin-top:12px')}><Button variant="ghost" size="sm" onClick={v.addExpense}>Add expense</Button></div>
          </Card>
          {v.expenses.length > 0 && (
            <Card flush>
              {v.expenses.map((x: any, i: number) => (
                <SupplyRow key={i} icon="🧾" name={x.cat} sub="Reimbursed at cost" right={<span style={css('display:flex;gap:10px;align-items:center')}><b style={{ fontSize: '13px' }}>{x.amountLabel}</b><span style={css('color:var(--text-muted);cursor:pointer')} onClick={x.remove}>✕</span></span>} last={i === v.expenses.length - 1} />
              ))}
            </Card>
          )}
          <Card tone="ink">
            <div style={css('display:flex;justify-content:space-between;font-size:12px;opacity:.85')}><span>Her time</span><span>{v.visitTimeCharge}</span></div>
            <div style={css('display:flex;justify-content:space-between;font-size:12px;opacity:.85;margin-top:6px')}><span>Passed through (at cost)</span><span>{v.visitReimbursed}</span></div>
            <div style={css('display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.15)')}><span style={css('font-size:13px;font-weight:var(--weight-semibold)')}>Visit total</span><span style={css('font-family:var(--font-serif-display);font-size:28px')}>{v.visitTotal}</span></div>
          </Card>
          <Button variant="green" onClick={v.closeVisit}>Close the visit & send receipt</Button>
        </>)}
        {v.visitClosed && (<>
          <Card tone="blush">
            <div style={css('text-align:center')}>
              <div style={css('width:56px;height:56px;border-radius:50%;background-image:var(--gradient-eco);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto')}>✓</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:12px')}>Visit closed</div>
            </div>
          </Card>
          <Card flush>
            <SupplyRow icon="⏱" name="Your time" sub={v.visitTimeLabel} right={<b style={{ fontSize: '13px', color: 'var(--green-deep)' }}>{v.visitTimeCharge}</b>} />
            <SupplyRow icon="🧾" name="Reimbursed to you" sub="Purchases, at cost" right={<b style={{ fontSize: '13px', color: 'var(--green-deep)' }}>{v.visitReimbursed}</b>} />
            <SupplyRow icon="💳" name="Owner charged" sub="One charge at close — never twice" right={<b style={{ fontSize: '13px' }}>{v.visitTotal}</b>} last />
          </Card>
          <NoteCard tone="money" icon="💕">Purchases come back to you <b>at cost</b> — they were never your money to lose. Your time is the earning.</NoteCard>
          <Button onClick={v.goToday}>Back to today</Button>
        </>)}
      </div>
    </>
  )
}
