/* Shared screens used by both the cleaner and owner zones — the message
   thread, the compose screen, and the calendar (admin scheduling view /
   owner "pick a day" view read the one schedule model through one resolver). */
import React from 'react'
import { css } from '../css'
import { Field, NativeInput } from './ui'
import {
  Button, Card, Pill, IconButton, SectionLabel, NoteCard, DetailHeader,
  SupplyRow, TextField, Checkbox,
} from '../../ds/components'

export function SharedScreens(v: any) {
  if (v.vThread) return <Thread v={v} />
  if (v.vCompose) return <Compose v={v} />
  if (v.vCalendar) return <Calendar v={v} />
  if (v.vNotices) return <Notices v={v} />
  return null
}

/* Everything the app has told this person, newest first. The list is the record
   of record: a notice is a database row before it is ever a phone buzz, so it's
   here whether or not push was ever turned on. */
function Notices({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.feedBadge} title="Notifications" subtitle={v.feedSub} />
      <div style={css('padding:22px')}>
        {v.pushOffered && (
          <Card tone={v.pushOn ? 'blush' : undefined}>
            <div style={css('display:flex;align-items:flex-start;gap:14px')}>
              <div style={css('width:46px;height:46px;border-radius:50%;background:var(--surface-cream);border:1px solid var(--border-default);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0')}>🔔</div>
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:13.5px;font-weight:var(--weight-semibold)')}>{v.pushLabel}</div>
                <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:3px')}>{v.pushSub}</div>
                {!v.pushNeedsInstall && !v.pushBlocked && (
                  <div style={css('margin-top:10px')}>
                    <Button variant={v.pushOn ? 'ghost' : 'green'} size="sm" onClick={v.togglePush}>
                      {v.pushBusy ? 'One moment…' : (v.pushOn ? 'Turn off on this device' : 'Turn them on')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
        {v.pushMsg && <NoteCard tone="warn" icon="⚠️">{v.pushMsg}</NoteCard>}

        {v.feedLoading && <NoteCard tone="cream" icon="⏳">Loading your notices…</NoteCard>}
        {v.feedEmpty && (
          <Card tone="blush">
            <div style={css('text-align:center;padding:6px 4px')}>
              <div style={css('font-size:34px')}>🔔</div>
              <div style={css('font-family:var(--font-serif-display);font-size:23px;line-height:1.1;margin-top:10px')}>Nothing yet</div>
              <p style={css('margin:8px auto 0;max-width:250px;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>You’ll hear when she’s on her way, when a report is ready, and when something needs you.</p>
            </div>
          </Card>
        )}
        {!!v.feedCards?.length && (<>
          <SectionLabel action={v.feedUnread ? 'Mark all read' : undefined} onAction={v.feedUnread ? v.markAllRead : undefined}>Recent</SectionLabel>
          <Card flush>
            {v.feedCards.map((n: any, i: number, arr: any[]) => (
              <div key={n.id} onClick={n.open} style={{
                ...css('display:flex;gap:12px;align-items:flex-start;padding:14px 2px;cursor:pointer'),
                borderBottom: i === arr.length - 1 ? '0' : '1px solid var(--border-default)',
              }}>
                <div style={css('width:38px;height:38px;border-radius:50%;background:var(--surface-cream);border:1px solid var(--border-default);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0')}>{n.icon}</div>
                <div style={css('flex:1;min-width:0')}>
                  <div style={css('display:flex;gap:8px;align-items:baseline;justify-content:space-between')}>
                    <div style={{ ...css('font-size:13px'), fontWeight: n.unread ? 600 : 400 }}>{n.title}</div>
                    <div style={css('font-size:10px;color:var(--text-muted);white-space:nowrap')}>{n.when}</div>
                  </div>
                  {n.body && <div style={css('font-size:11.5px;line-height:var(--leading-snug);color:var(--ink-soft);margin-top:2px')}>{n.body}</div>}
                </div>
                {n.unread && <div style={css('width:8px;height:8px;border-radius:50%;background:var(--magenta);flex-shrink:0;margin-top:6px')} />}
              </div>
            ))}
          </Card>
        </>)}
        <NoteCard tone="pink" icon="🔒">Notices never carry an amount or an address — they can sit on a lock screen. Tap one to open the detail behind it.</NoteCard>
      </div>
    </>
  )
}

function Thread({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.threadBadge} title={v.threadTitle} subtitle={v.threadSub} />
      <div style={css('padding:22px')}>
        {v.threadMsgs.map((m: any, i: number) => (
          <div key={i} style={css('margin-bottom:12px')}>
            {m.mine && (
              <div style={css('display:flex;justify-content:flex-end')}>
                <div style={css('max-width:80%')}>
                  <div style={css('background:var(--gradient-brand);color:var(--text-on-brand);font-size:13px;line-height:var(--leading-snug);padding:12px 14px;border-radius:18px 18px 6px 18px')}>{m.text}</div>
                  <div style={css('font-size:10px;color:var(--text-muted);text-align:right;margin-top:4px')}>{m.time}</div>
                </div>
              </div>
            )}
            {m.theirs && (
              <div style={css('display:flex;gap:10px;align-items:flex-end')}>
                <div style={css('max-width:82%')}>
                  <div style={css('background:var(--surface-card);border:1px solid var(--border-default);font-size:13px;line-height:var(--leading-snug);padding:12px 14px;border-radius:18px 18px 18px 6px;box-shadow:var(--shadow-card)')}>{m.text}</div>
                  {m.photo && (
                    <div style={css('width:150px;height:110px;border-radius:var(--radius-md);margin-top:8px;background:var(--photo-2);position:relative')}>
                      <div style={css('position:absolute;bottom:8px;left:8px;background:var(--stamp-scrim);color:#fff;font-size:10px;padding:3px 8px;border-radius:7px;backdrop-filter:blur(2px)')}>{m.stamp}</div>
                    </div>
                  )}
                  <div style={css('font-size:10px;color:var(--text-muted);margin-top:4px')}>{m.time}</div>
                </div>
              </div>
            )}
          </div>
        ))}
        <NoteCard tone="pink" icon="🔒">This thread is stored to the property record — every message, photo and report kept together.</NoteCard>
      </div>
      {/* Sits on the bottom of the scrolling area, which now ends exactly at the
          tab bar — so the composer and the bar meet with no gap. (This used to
          be offset by 62px to clear a tab bar that lived inside the scroll.) */}
      <div style={css('position:sticky;bottom:0;z-index:5;background:var(--surface-page);border-top:1px solid var(--border-default);padding:12px 22px 14px;box-shadow:0 -10px 26px -20px rgba(42,23,32,.5)')}>
        <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-bottom:10px')}>
          {v.quickReplies.map((q: any, i: number) => <Pill key={i} onClick={q.send}>{q.label}</Pill>)}
        </div>
        <div style={css('display:flex;gap:8px;align-items:center')}>
          <IconButton icon="📷" onClick={v.toastAttach} />
          <IconButton icon="📋" onClick={v.toastAttachReport} />
          <div style={css('flex:1;min-width:0;box-sizing:border-box')}>
            <TextField icon="💬" placeholder="Write a message…" value={v.draft} onChange={v.setDraft} style={v.fieldFit} />
          </div>
          <div role="button" aria-label="Send message" onClick={v.sendDraft} style={css('width:46px;height:46px;flex-shrink:0;border-radius:50%;background-image:var(--gradient-brand);color:var(--text-on-brand);display:flex;align-items:center;justify-content:center;font-size:19px;cursor:pointer;box-shadow:var(--shadow-primary-btn)')}>➤</div>
        </div>
      </div>
    </>
  )
}

function Compose({ v }: { v: any }) {
  return (
    <>
      <DetailHeader gradient="magenta" onBack={v.goBack} badge={v.badgeNewMessage} title="New message" subtitle="Goes straight to the thread — and to the property record" />
      <div style={css('padding:22px')}>
        <Card>
          <SectionLabel>To</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.recipients.map((r: any, i: number) => <Pill key={i} selected={r.on} onClick={r.pick}>{r.label}</Pill>)}</div>
        </Card>
        <Card>
          <SectionLabel>About</SectionLabel>
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.topics.map((t: any, i: number) => <Pill key={i} selected={t.on} onClick={t.pick}>{t.label}</Pill>)}</div>
        </Card>
        <Card>
          <SectionLabel>Message</SectionLabel>
          <TextField icon="✏️" placeholder={v.composeHint} value={v.draft} onChange={v.setDraft} />
          <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap;margin-top:12px')}>{v.starters.map((s: any, i: number) => <Pill key={i} onClick={s.pick}>{s.label}</Pill>)}</div>
        </Card>
        <Button onClick={v.sendCompose}>Send message</Button>
        <div style={css('margin-top:10px')}><Button variant="ghost" onClick={v.backFromCompose}>Cancel</Button></div>
      </div>
    </>
  )
}

function Calendar({ v }: { v: any }) {
  return (
    <>
      <DetailHeader onBack={v.goBack} badge={v.calBadge} title={v.calTitle} subtitle={v.calSub} />
      <div style={css('padding:22px')}>
        <Card>
          <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:12px')}>
            <IconButton icon="←" onClick={v.calPrev} />
            <div style={css('font-family:var(--font-serif-display);font-size:20px')}>{v.calMonth}</div>
            <IconButton icon="→" onClick={v.calNext} />
          </div>
          <div style={css('display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px')}>
            {v.calDows.map((d: string, i: number) => <div key={i} style={css('text-align:center;font-family:var(--font-spaced);font-size:8.5px;letter-spacing:var(--tracking-spaced);text-transform:uppercase;color:var(--text-muted)')}>{d}</div>)}
          </div>
          <div style={css('display:grid;grid-template-columns:repeat(7,1fr);gap:4px')}>
            {v.calCells.map((c: any, i: number) => (
              <div key={i} style={{ ...css('aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px'), border: '1px solid ' + c.border, background: c.bg, color: c.color, cursor: c.cursor, opacity: c.opacity }} onClick={c.pick}>
                <div style={{ ...css('font-size:12.5px'), fontWeight: c.weight }}>{c.day}</div>
                <div style={css('display:flex;gap:2px;height:5px')}>
                  {c.dots.map((dot: string, k: number) => <div key={k} style={{ ...css('width:4px;height:4px;border-radius:50%'), background: dot }} />)}
                </div>
              </div>
            ))}
          </div>
          <div style={css('display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:10.5px;color:var(--text-muted)')}>
            {v.calIsOwner && <div style={css('display:flex;gap:5px;align-items:center')}><div style={css('width:6px;height:6px;border-radius:50%;background:var(--ink-soft)')} />Each dot is a booked window</div>}
            {v.calIsAdmin && <div style={css('display:flex;gap:5px;align-items:center')}><div style={css('width:6px;height:6px;border-radius:50%;background:var(--magenta)')} />Turnover</div>}
            {v.calIsAdmin && <div style={css('display:flex;gap:5px;align-items:center')}><div style={css('width:6px;height:6px;border-radius:50%;background:var(--green)')} />Residential</div>}
            {v.calIsAdmin && <div style={css('display:flex;gap:5px;align-items:center')}><div style={css('width:6px;height:6px;border-radius:50%;background:var(--orange)')} />Needs assigning</div>}
          </div>
        </Card>
        <SectionLabel right={v.calDayChip}>{v.calDayTitle}</SectionLabel>
        <Card flush>{v.calDayRows.map((r: any, i: number) => <SupplyRow key={i} icon={r.icon} iconStyle={r.tile} name={r.name} sub={r.sub} right={r.right} last={r.last} onClick={r.go} />)}</Card>
        {/* Live: put a real clean on the calendar for whichever home is picked. */}
        {v.calProps && v.calIsAdmin && (<>
          <NoteCard tone="cream" icon="⏱️">Five two-hour windows a day. Days at capacity are dimmed, and anything still unassigned shows an orange dot.</NoteCard>
          <Card>
            <SectionLabel>Book a clean</SectionLabel>
            {v.calNoProps
              ? <p style={css('margin:0;font-size:12.5px;line-height:var(--leading-snug);color:var(--ink-soft)')}>No properties yet — add a client’s home first and it shows up here.</p>
              : <div style={css('display:flex;gap:var(--gap-chip);flex-wrap:wrap')}>{v.calProps.map((p: any, i: number) => <Pill key={i} selected={p.on} onClick={p.pick}>{p.label}</Pill>)}</div>}
          </Card>
          {!v.calNoProps && <Button variant="green" onClick={v.calBook}>{v.calBookLabel}</Button>}
        </>)}
        {!v.calProps && v.calIsAdmin && (<>
          <NoteCard tone="cream" icon="⏱️">Five two-hour windows a day. Days at capacity are dimmed, and anything still unassigned shows an orange dot.</NoteCard>
          <Button onClick={v.goAssign}>Assign this week’s cleans</Button>
        </>)}
        {v.calIsOwner && (<>
          <NoteCard tone="cream" icon="⏱️">Tap an open time to claim it. She arrives inside that two-hour window and texts when she’s on her way.</NoteCard>
          <Button variant="green" onClick={v.calBook}>{v.calBookLabel}</Button>
          <p style={css('margin:10px 2px 0;font-size:11px;color:var(--text-muted);line-height:var(--leading-snug);text-align:center')}>Nothing is charged now — your card is charged once, in full, when she arrives.</p>
        </>)}
      </div>
    </>
  )
}
