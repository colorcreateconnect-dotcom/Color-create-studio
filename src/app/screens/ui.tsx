/* Small shared building blocks for the ported screens. The native <input>
   fields mirror the prototype exactly so the phone's own keyboard opens with
   the right type (tel / numeric / email / url / one-time-code). */
import React from 'react'
import type { CSSProperties } from 'react'
import { css } from '../css'

export const FIELD =
  'display:flex;align-items:center;gap:8px;border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px 14px;background:var(--surface-card);width:100%'

export const INP: CSSProperties = {
  flex: 1, border: 0, background: 'transparent', fontFamily: 'var(--font-sans)',
  fontSize: '13px', color: 'var(--text-body)', outline: 'none', minWidth: 0,
}

/** A bordered field wrapper with an optional leading emoji glyph. */
export function Field({ icon, children, style }: { icon?: React.ReactNode; children: React.ReactNode; style?: string }) {
  return (
    <div style={css(FIELD + (style ? ';' + style : ''))}>
      {icon != null ? <span style={{ fontSize: '15px' }}>{icon}</span> : null}
      {children}
    </div>
  )
}

/** A native input that inherits the shared field styling. */
export function NativeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props
  return <input {...rest} style={{ ...INP, ...(style as CSSProperties) }} />
}
