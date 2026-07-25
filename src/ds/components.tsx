/* She's Maid In ATL — design-system components, ported to React from the
   handoff bundle (_ds_bundle.js). Every value is taken verbatim from the
   design system; colors/spacing/radii/etc. resolve through the CSS tokens.
   The icon system is deliberately system emoji + unicode chrome glyphs. */
import React from 'react'
import type { CSSProperties, ReactNode } from 'react'

type Any = Record<string, any>

/* ---------------------------------------------------------------- Avatar -- */
export function Avatar({ initials, size = 38, gradient = 'var(--gradient-brand)', style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      width: size, height: size, borderRadius: '50%', background: gradient,
      color: 'var(--text-on-brand)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 'var(--weight-bold)',
      fontSize: Math.round(size * 0.37), flexShrink: 0, ...style,
    }}>{initials}</div>
  )
}

/* ---------------------------------------------------------------- Button -- */
const btnBase: CSSProperties = {
  border: 0, borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-semibold)' as any, fontSize: '14px', cursor: 'pointer',
  padding: '15px', width: '100%', transition: 'var(--dur-fast)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: '9px', textDecoration: 'none',
  lineHeight: 1.2,
}
const btnSmall: CSSProperties = { padding: '11px 14px', fontSize: '12.5px', width: 'auto', borderRadius: 'var(--radius-md)' }
const btnTones: Record<string, CSSProperties> = {
  primary: { background: 'var(--gradient-brand)', color: 'var(--text-on-brand)', boxShadow: 'var(--shadow-primary-btn)' },
  ghost: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-body)' },
  green: { background: 'var(--green)', color: 'var(--text-on-brand)' },
  inverse: { background: 'var(--surface-inverse)', color: 'var(--text-on-brand)' },
}
export function Button({ variant = 'primary', size = 'md', icon, children, fullWidth, style, as, ...rest }: Any) {
  const Tag: any = as || (rest.href ? 'a' : 'button')
  const s: CSSProperties = { ...btnBase, ...btnTones[variant], ...(size === 'sm' ? btnSmall : null) }
  if (fullWidth) s.width = '100%'
  return (
    <Tag {...rest} style={{ ...s, ...style }}>
      {icon ? <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span> : null}
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ Card -- */
export function Card({ tone = 'white', padding = 16, flush, shadow = true, children, style, ...rest }: Any) {
  const tones: Record<string, CSSProperties> = {
    white: { background: 'var(--surface-card)' },
    blush: { background: 'var(--gradient-card-blush)', borderColor: 'var(--tint-pink-line)' },
    dashed: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)' },
    ink: { background: 'var(--surface-inverse)', color: 'var(--text-on-brand)', border: 0 },
  }
  return (
    <div {...rest} style={{
      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-3xl)',
      padding: flush ? '6px 16px' : padding, marginBottom: 'var(--stack-card)',
      boxShadow: shadow ? 'var(--shadow-card)' : 'none', ...tones[tone], ...style,
    }}>{children}</div>
  )
}

/* ------------------------------------------------------------------ Chip -- */
const chipTones: Record<string, CSSProperties> = {
  turn: { background: 'var(--tint-orange)', color: 'var(--orange-deep)' },
  deep: { background: 'var(--tint-magenta)', color: 'var(--magenta)' },
  refresh: { background: 'var(--tint-green)', color: 'var(--green-deep)' },
  ghost: { background: 'var(--tint-neutral)', color: 'var(--text-muted)' },
  onBrand: { background: 'var(--surface-on-brand-strong)', color: 'var(--text-on-brand)' },
  low: { background: 'var(--orange)', color: 'var(--text-on-brand)', fontWeight: 'var(--weight-bold)' as any, fontSize: '10px', letterSpacing: '.03em' },
}
export function Chip({ tone = 'ghost', children, style, ...rest }: Any) {
  return (
    <span {...rest} style={{
      fontSize: '10.5px', fontWeight: 'var(--weight-semibold)' as any, padding: '5px 10px',
      borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap', letterSpacing: '.02em',
      display: 'inline-block', ...chipTones[tone], ...style,
    }}>{children}</span>
  )
}

/* ------------------------------------------------------------ IconButton -- */
export function IconButton({ icon, size = 38, tone = 'card', style, ...rest }: Any) {
  const tones: Record<string, CSSProperties> = {
    card: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-body)' },
    onBrand: { background: 'var(--surface-on-brand-strong)', border: 0, color: 'var(--text-on-brand)' },
  }
  return (
    <button {...rest} style={{
      width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size > 36 ? '16px' : '14px', cursor: 'pointer',
      flexShrink: 0, ...tones[tone], ...style,
    }}>{icon}</button>
  )
}

/* ---------------------------------------------------------------- MetaTag -- */
export function MetaTag({ icon, label, value, children, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)',
      background: 'var(--surface-cream)', border: '1px solid var(--border-default)', padding: '6px 10px',
      borderRadius: 'var(--radius-md)', ...style,
    }}>
      {icon ? <span>{icon}</span> : null}
      {value != null
        ? <span><b style={{ color: 'var(--text-body)', fontWeight: 'var(--weight-semibold)' as any }}>{value}</b> {label}</span>
        : (children || label)}
    </div>
  )
}

/* ------------------------------------------------------------------ Pill -- */
export function Pill({ selected, eco, children, style, ...rest }: Any) {
  const on: CSSProperties = { background: eco ? 'var(--green)' : 'var(--gradient-brand)', color: 'var(--text-on-brand)', borderColor: 'transparent' }
  return (
    <span {...rest} role="button" tabIndex={0} style={{
      fontSize: '12.5px', fontWeight: 'var(--weight-semibold)' as any, padding: '9px 14px',
      borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-default)',
      background: 'var(--surface-card)', color: 'var(--text-muted)', cursor: 'pointer',
      transition: 'var(--dur-fast)', whiteSpace: 'nowrap', userSelect: 'none',
      ...(selected ? on : null), ...style,
    }}>{children}</span>
  )
}

/* ---------------------------------------------------------- SectionLabel -- */
export function SectionLabel({ children, action, onAction, right, style, ...rest }: Any) {
  return (
    <div {...rest} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px', ...style }}>
      <h3 style={{
        fontSize: '12px', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase',
        color: 'var(--text-muted)', fontWeight: 'var(--weight-semibold)' as any, margin: 0,
      }}>{children}</h3>
      {action
        ? <a onClick={onAction} style={{ fontSize: '12px', color: 'var(--text-accent)', fontWeight: 'var(--weight-semibold)' as any, cursor: 'pointer', textDecoration: 'none' }}>{action}</a>
        : right}
    </div>
  )
}

/* -------------------------------------------------------------- StatTile -- */
export function StatTile({ value, label, color = 'var(--orange)', accent, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      background: accent ? 'var(--gradient-card-blush)' : 'var(--surface-card)',
      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-2xl)', padding: '14px', ...style,
    }}>
      <div style={{ fontSize: '26px', fontWeight: 'var(--weight-bold)' as any, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

/* -------------------------------------------------------------- NoteCard -- */
const noteTones: Record<string, CSSProperties> = {
  pink: { background: 'var(--pink-soft)', border: '1px solid var(--tint-pink-line)', color: '#7A2C63' },
  eco: { background: 'var(--eco-bg)', border: '1px solid var(--eco-line)', color: 'var(--eco-ink)' },
  warn: { background: 'var(--tint-orange)', border: '1px solid var(--tint-orange-line)', color: 'var(--orange-deep)' },
  money: { background: 'var(--tint-green)', border: '1px solid var(--tint-green-line)', color: 'var(--green-deep)' },
  cream: { background: 'var(--surface-cream)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' },
}
export function NoteCard({ tone = 'pink', icon, children, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      borderRadius: 'var(--radius-xl)', padding: '13px 14px', margin: '16px 0', fontSize: '12.5px',
      lineHeight: 'var(--leading-snug)', display: 'flex', gap: '10px', ...noteTones[tone], ...style,
    }}>
      {icon ? <span style={{ fontSize: '16px', lineHeight: 1.2 }}>{icon}</span> : null}
      <div>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------ ProgressBar -- */
export function ProgressBar({ value = 0, left, right, style, ...rest }: Any) {
  return (
    <div {...rest} style={style}>
      <div style={{ height: '7px', background: 'var(--track)', borderRadius: 'var(--radius-pill)', marginTop: '14px', overflow: 'hidden' }}>
        <i style={{ display: 'block', height: '100%', width: value + '%', borderRadius: 'var(--radius-pill)', background: 'linear-gradient(90deg,var(--orange),var(--magenta))' }} />
      </div>
      {left || right ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '7px' }}>
          <span>{left}</span><span>{right}</span>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ ProgressRing -- */
const RING_CIRC = 97.4
const RING_D = 'M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31'
export function ProgressRing({ value = 0, size = 64, done, total, onBrand = true, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px',
      background: onBrand ? 'rgba(255,255,255,.14)' : 'var(--surface-cream)', padding: '14px',
      borderRadius: 'var(--radius-2xl)', color: onBrand ? 'var(--text-on-brand)' : 'var(--text-body)', ...style,
    }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size, flexShrink: 0 }}>
        <path d={RING_D} fill="none" strokeWidth="3.4" stroke={onBrand ? 'rgba(255,255,255,.25)' : 'var(--track)'} />
        <path d={RING_D} fill="none" strokeWidth="3.4" strokeLinecap="round" stroke={onBrand ? '#fff' : 'var(--magenta)'}
          strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC - RING_CIRC * value / 100} />
      </svg>
      <div>
        <b style={{ fontSize: '20px', fontWeight: 'var(--weight-bold)' as any }}>{value}%</b>
        <div style={{ fontSize: '11.5px', opacity: onBrand ? 0.92 : 1, color: onBrand ? undefined : 'var(--text-muted)' }}>
          {done != null && total != null ? `${done} of ${total} steps complete` : null}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Toast -- */
export function Toast({ children, visible = true, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      position: 'absolute', left: '50%', bottom: '96px',
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
      opacity: visible ? 1 : 0, background: 'var(--surface-inverse)', color: 'var(--text-on-brand)',
      fontSize: '12.5px', fontWeight: 'var(--weight-medium)' as any, padding: '12px 18px',
      borderRadius: 'var(--radius-md)', transition: 'var(--dur-slow)', zIndex: 70,
      pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-raised)', ...style,
    }}>{children}</div>
  )
}

/* --------------------------------------------------------- VerifiedBadge -- */
const vbTones: Record<string, CSSProperties> = {
  verified: { color: 'var(--green-deep)', background: 'var(--tint-green)' },
  pending: { color: 'var(--orange-deep)', background: 'var(--tint-orange)' },
  onBrand: { color: 'var(--text-on-brand)', background: 'rgba(255,255,255,.2)' },
}
export function VerifiedBadge({ tone = 'verified', icon, children, style, ...rest }: Any) {
  return (
    <span {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px',
      fontWeight: 'var(--weight-semibold)' as any, padding: '6px 11px', borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap', ...vbTones[tone], ...style,
    }}>{icon}{children}</span>
  )
}

/* -------------------------------------------------------------- Checkbox -- */
export function Checkbox({ checked, onChange, size = 24, style, ...rest }: Any) {
  return (
    <div {...rest} onClick={() => onChange && onChange(!checked)} style={{
      width: size, height: size, borderRadius: size > 22 ? 'var(--radius-check)' : 'var(--radius-xs)',
      border: '2px solid var(--border-strong)', flexShrink: 0, cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size > 22 ? '14px' : '13px',
      transition: 'var(--dur-fast)', marginTop: '1px',
      ...(checked ? { background: 'var(--green)', borderColor: 'var(--green)' } : null), ...style,
    }}>{checked ? '✓' : ''}</div>
  )
}

/* --------------------------------------------------------------- Stepper -- */
export function Stepper({ value = 0, onChange, style, ...rest }: Any) {
  const btn: CSSProperties = { width: 30, height: 30, border: 0, background: 'var(--surface-card)', fontSize: '16px', cursor: 'pointer', color: 'var(--text-body)' }
  return (
    <div {...rest} style={{
      display: 'flex', alignItems: 'center', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, ...style,
    }}>
      <button style={btn} onClick={() => onChange && onChange(Math.max(0, value - 1))}>{'−'}</button>
      <span style={{ width: 30, textAlign: 'center', fontSize: '13px', fontWeight: 'var(--weight-semibold)' as any }}>{value}</span>
      <button style={btn} onClick={() => onChange && onChange(value + 1)}>+</button>
    </div>
  )
}

/* ------------------------------------------------------------- TextField -- */
export function TextField({ icon, placeholder, value, onChange, width, style, inputStyle, ...rest }: Any) {
  return (
    <div {...rest} style={{
      display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '12px 14px', background: 'var(--surface-card)',
      width: width || '100%', ...style,
    }}>
      {icon ? <span style={{ fontSize: '15px' }}>{icon}</span> : null}
      <input value={value} onChange={onChange} placeholder={placeholder} style={{
        flex: 1, border: 0, background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '13px',
        color: 'var(--text-body)', outline: 'none', minWidth: 0, ...inputStyle,
      }} />
    </div>
  )
}

/* ------------------------------------------------------------- PhoneFrame -- */
export function PhoneFrame({ statusRight = '●●● 🔋', time = '9:41', label, appMode, className, children, tabBar, style, ...rest }: Any) {
  // appMode = the real deployed app: the CSS class `sm-phone` lets it go
  // full-screen on phones (see global.css), and the fake notch + status bar are
  // dropped (the real device shows its own). The review showcase keeps them.
  return (
    <div {...rest} className={'sm-phone' + (className ? ' ' + className : '')} style={{
      width: 'var(--width-phone)', maxWidth: '100%', height: 'var(--height-phone)', background: 'var(--surface-app)',
      borderRadius: 'var(--radius-phone)', boxShadow: 'var(--shadow-raised),var(--bezel-phone)', overflow: 'hidden',
      position: 'relative', display: 'flex', flexDirection: 'column', ...style,
    }}>
      {!appMode && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 150, height: 26, background: '#201018', borderRadius: '0 0 18px 18px', zIndex: 40 }} />}
      {!appMode && (
        <div style={{
          height: 46, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 26px 6px', fontSize: '12px', fontWeight: 'var(--weight-semibold)' as any,
          color: 'var(--text-body)', flexShrink: 0,
        }}>
          <span>{time}</span><span>{label}</span><span>{statusRight}</span>
        </div>
      )}
      <div className="sm-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>{children}</div>
      {tabBar}
    </div>
  )
}

/* ----------------------------------------------------------- DetailHeader -- */
const dhGrads: Record<string, string> = {
  brand: 'var(--gradient-brand-header)',
  eco: 'var(--gradient-eco)',
  report: 'var(--gradient-report)',
  magenta: 'linear-gradient(150deg,var(--magenta),var(--magenta-deep))',
}
export function DetailHeader({ gradient = 'brand', onBack, badge, title, subtitle, children, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      background: dhGrads[gradient] || gradient, color: 'var(--text-on-brand)',
      padding: '14px var(--gutter-app) 22px', borderRadius: 'var(--radius-header)', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        {onBack ? <IconButton icon={'←'} size={36} tone="onBrand" onClick={onBack} style={{ fontSize: '17px' }} /> : null}
        {badge}
      </div>
      <div style={{ fontSize: '21px', fontWeight: 'var(--weight-semibold)' as any, lineHeight: 'var(--leading-tight)' }}>{title}</div>
      {subtitle ? <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>{subtitle}</div> : null}
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------- TabBar -- */
export function TabBar({ tabs = [], active = 0, onSelect, style, ...rest }: Any) {
  return (
    <div {...rest} style={{
      flexShrink: 0, display: 'flex', background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-default)', padding: '8px 6px', ...style,
    }}>
      {tabs.map((t: Any, i: number) => (
        <button key={i} onClick={() => onSelect && onSelect(i)} style={{
          flex: 1, background: 'none', border: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '3px', padding: '6px 0', fontFamily: 'var(--font-sans)', fontSize: '10px',
          fontWeight: 'var(--weight-medium)' as any, color: i === active ? 'var(--text-accent)' : 'var(--text-muted)',
          transition: 'var(--dur-fast)',
        }}>
          <span style={{ fontSize: '19px', lineHeight: 1 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- JobCard -- */
export function JobCard({ name, address, type = 'Turnover', typeTone = 'turn', guestOut, guestIn, metas = [], progress, progressLabel, onClick, style, ...rest }: Any) {
  return (
    <Card onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }} {...rest}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 'var(--weight-semibold)' as any, lineHeight: 'var(--leading-tight)' }}>{name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{address}</div>
        </div>
        <Chip tone={typeTone}>{type}</Chip>
      </div>
      {guestOut || guestIn ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {[
            { k: 'Guest out', v: guestOut, bg: 'var(--tint-orange)', c: 'var(--orange-deep)' },
            { k: 'Guest in', v: guestIn, bg: 'var(--tint-blue)', c: 'var(--info)' },
          ].map((x, i) => x.v ? (
            <div key={i} style={{
              flex: 1, borderRadius: 'var(--radius-md)', padding: '9px 10px', fontSize: '11px',
              fontWeight: 'var(--weight-semibold)' as any, display: 'flex', flexDirection: 'column', gap: '1px',
              background: x.bg, color: x.c,
            }}>
              <span style={{ fontSize: '9.5px', fontWeight: 'var(--weight-medium)' as any, opacity: 0.8, letterSpacing: '.04em', textTransform: 'uppercase' }}>{x.k}</span>{x.v}
            </div>
          ) : null)}
        </div>
      ) : null}
      {metas.length ? <div style={{ display: 'flex', gap: 'var(--gap-chip)', marginTop: '13px', flexWrap: 'wrap' }}>{metas}</div> : null}
      {progress != null ? <ProgressBar value={progress} left={progressLabel} right={progress + '%'} /> : null}
    </Card>
  )
}

/* ------------------------------------------------------------ StatusCard -- */
const stripColors: Record<string, string> = { ready: 'var(--green)', soon: 'var(--orange)', attention: 'var(--danger)' }
export function StatusCard({ state = 'ready', name, sub, badge, metas = [], children, onClick, style, ...rest }: Any) {
  return (
    <div {...rest} onClick={onClick} style={{
      background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-3xl)',
      padding: '16px', marginBottom: 'var(--stack-card)', position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', boxShadow: 'var(--shadow-card)', ...style,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: stripColors[state] }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginLeft: '8px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'var(--weight-semibold)' as any }}>{name}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
        </div>
        {badge}
      </div>
      {metas.length ? <div style={{ display: 'flex', gap: 'var(--gap-chip)', marginTop: '13px', flexWrap: 'wrap', marginLeft: '8px' }}>{metas}</div> : null}
      <div style={{ marginLeft: '8px' }}>{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------- SupplyRow -- */
export function SupplyRow({ icon, iconStyle, name, sub, flag, right, last, level, levelColor = 'var(--orange)', onClick, style, ...rest }: Any) {
  return (
    <div {...rest} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0',
      borderBottom: last ? 0 : '1px solid var(--border-default)', cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {icon != null ? (
        <div style={{
          width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--surface-cream)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', flexShrink: 0, ...iconStyle,
        }}>{icon}</div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 'var(--weight-semibold)' as any, display: 'flex', alignItems: 'center', gap: '6px' }}>{name}{flag}</div>
        {sub ? <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div> : null}
        {level != null ? (
          <div style={{ height: 6, background: 'var(--track)', borderRadius: 'var(--radius-pill)', marginTop: '7px', width: 130, overflow: 'hidden' }}>
            <i style={{ display: 'block', height: '100%', width: level + '%', borderRadius: 'var(--radius-pill)', background: levelColor }} />
          </div>
        ) : null}
      </div>
      {right}
    </div>
  )
}

/* --------------------------------------------------------- PhaseAccordion -- */
export function PhaseAccordion({ icon, title, done = 0, total = 0, open, onToggle, children, style, ...rest }: Any) {
  const complete = total > 0 && done === total
  return (
    <div {...rest} style={{
      background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-2xl)',
      marginBottom: '12px', overflow: 'hidden', ...style,
    }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 16px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--surface-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{icon}</div>
        <div style={{ fontWeight: 'var(--weight-semibold)' as any, fontSize: '15px', flex: 1 }}>{title}</div>
        <div style={{ fontSize: '11px', padding: '4px 9px', borderRadius: 'var(--radius-pill)', background: complete ? 'var(--tint-green)' : 'var(--surface-cream)', color: complete ? 'var(--green-deep)' : 'var(--text-muted)' }}>{done}/{total}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'var(--dur-base)', transform: open ? 'rotate(180deg)' : 'none' }}>{'▼'}</div>
      </div>
      {open ? <div style={{ padding: '0 16px 8px' }}>{children}</div> : null}
    </div>
  )
}

/* --------------------------------------------------------- ChecklistTask -- */
export function ChecklistTask({ checked, onChange, children, photoRequired, photoAdded, onAddPhoto, photoWash = 'var(--photo-1)', photoStamp, style, ...rest }: Any) {
  return (
    <div {...rest} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderTop: '1px solid var(--border-default)', ...style }}>
      <Checkbox checked={checked} onChange={onChange} />
      <div style={{
        fontSize: '13.5px', lineHeight: 'var(--leading-snug)', flex: 1,
        color: checked ? 'var(--text-muted)' : 'var(--text-body)', textDecoration: checked ? 'line-through' : 'none',
      }}>
        {children}
        {photoRequired ? (
          <div style={{ marginTop: '8px' }}>
            <span onClick={onAddPhoto} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'var(--weight-semibold)' as any,
              padding: '7px 11px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              ...(photoAdded
                ? { color: 'var(--green-deep)', background: 'var(--tint-green)', border: '1px solid var(--tint-green-line)' }
                : { color: 'var(--magenta)', background: '#FBEAF5', border: '1px dashed #E9B9DD' }),
            }}>{photoAdded ? '✓ Photo added' : '📷 Photo proof required'}</span>
            {photoAdded ? (
              <div style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', marginTop: '8px', background: photoWash, backgroundSize: 'cover', position: 'relative' }}>
                {photoStamp ? (
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'var(--stamp-scrim)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '7px', backdropFilter: 'blur(2px)' }}>{photoStamp}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- PhotoStrip -- */
const photoWashes = ['var(--photo-1)', 'var(--photo-2)', 'var(--photo-3)', 'var(--photo-4)']
export function PhotoStrip({ shots = [], width = 96, height = 96, style, ...rest }: Any) {
  return (
    <div {...rest} style={{ display: 'flex', gap: '8px', marginTop: '14px', overflowX: 'auto', paddingBottom: '4px', ...style }}>
      {shots.map((s: Any, i: number) => (
        <div key={i} style={{
          width: s.width || width, height: s.height || height, borderRadius: 'var(--radius-md)', flexShrink: 0,
          background: s.wash || photoWashes[i % photoWashes.length], backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
        }}>
          {s.label ? (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,.6))',
              color: '#fff', fontSize: '9px', padding: '10px 6px 5px', borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            }}>{s.label}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- PriceBox -- */
export function PriceBox({ rows = [], label, amount, footnote, children, style, ...rest }: Any) {
  return (
    <div {...rest} style={{ background: 'var(--surface-inverse)', color: 'var(--text-on-brand)', borderRadius: 'var(--radius-2xl)', padding: '20px', marginTop: '20px', ...style }}>
      {rows.map((r: Any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...(i ? { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.15)' } : null) }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{r.label}</div>
          <div style={{ fontSize: '16px' }}>{r.value}</div>
        </div>
      ))}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginTop: rows.length ? '10px' : 0, paddingTop: rows.length ? '10px' : 0,
        borderTop: rows.length ? '1px solid rgba(255,255,255,.15)' : (0 as any),
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)' as any }}>{label}</div>
          {footnote ? <div style={{ fontSize: '10.5px', opacity: 0.7 }}>{footnote}</div> : null}
        </div>
        <div style={{ fontFamily: 'var(--font-serif-display)', fontSize: '34px', lineHeight: 1 }}>{amount}</div>
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ Sheet -- */
export function Sheet({ open, onClose, children, style, ...rest }: Any) {
  if (!open) return null
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }} style={{
      position: 'absolute', inset: 0, background: 'var(--scrim-modal)', backdropFilter: 'var(--blur-modal)',
      zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div {...rest} style={{
        background: 'var(--surface-card)', width: '100%', borderRadius: 'var(--radius-sheet)',
        padding: '8px var(--gutter-app) 24px', animation: 'sm-sheet-up var(--dur-slow) var(--ease-standard)', ...style,
      }}>
        <div style={{ width: 44, height: 5, background: 'var(--grabber)', borderRadius: 'var(--radius-pill)', margin: '8px auto 16px' }} />
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Timeline -- */
export function Timeline({ items = [], style, ...rest }: Any) {
  return (
    <div {...rest} style={{ marginTop: '8px', ...style }}>
      {items.map((it: Any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', position: 'relative' }}>
          {i < items.length - 1 ? <span style={{ position: 'absolute', left: 6, top: 16, bottom: -4, width: 2, background: 'var(--border-default)' }} /> : null}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: it.tone === 'orange' ? 'var(--orange)' : 'var(--green)', flexShrink: 0, marginTop: '2px', border: '3px solid #fff', boxShadow: '0 0 0 1px var(--border-default)' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)' as any }}>{it.title}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------- ConsistencyCard -- */
export function ConsistencyCard({ grade, title, sub, row, style, ...rest }: Any) {
  const big = <div style={{ fontFamily: 'var(--font-serif-display)', fontSize: row ? '34px' : 'var(--text-numeral)', color: 'var(--green)', lineHeight: 1 }}>{grade}</div>
  return (
    <div {...rest} style={{
      background: 'var(--gradient-card-blush)', border: '1px solid var(--tint-pink-line)', borderRadius: '20px',
      padding: '18px', marginBottom: 'var(--stack-card)', textAlign: row ? 'left' : 'center', ...style,
    }}>
      {row ? (
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {big}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)' as any }}>{title}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 'var(--leading-snug)' }}>{sub}</div>
          </div>
        </div>
      ) : (
        <>
          {big}
          <div style={{ fontSize: '13px', fontWeight: 'var(--weight-semibold)' as any, marginTop: '4px' }}>{title}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 'var(--leading-snug)' }}>{sub}</div>
        </>
      )}
    </div>
  )
}

/* Convenience: a plain node passthrough used by some screens. */
export type { ReactNode }
