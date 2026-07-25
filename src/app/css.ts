import type { CSSProperties } from 'react'

/**
 * Parse a CSS declaration string ("padding:22px;display:flex") into a React
 * style object. This lets the ported screens reuse the reference prototype's
 * exact inline-style strings verbatim, keeping the UI pixel-faithful to the
 * design handoff instead of hand-translating every declaration.
 *
 * - kebab-case properties become camelCase (background-image -> backgroundImage)
 * - custom properties (--foo) are preserved as-is
 * - values keep var(), gradients, rgba(), url() etc. untouched (only the first
 *   ":" splits each declaration, so "background:linear-gradient(...)" is safe)
 */
const cache = new Map<string, CSSProperties>()

export function css(decl: string, extra?: CSSProperties): CSSProperties {
  let base = cache.get(decl)
  if (!base) {
    const out: Record<string, string> = {}
    for (const raw of decl.split(';')) {
      const part = raw.trim()
      if (!part) continue
      const idx = part.indexOf(':')
      if (idx < 0) continue
      const prop = part.slice(0, idx).trim()
      const value = part.slice(idx + 1).trim()
      if (!prop) continue
      const key = prop.startsWith('--')
        ? prop
        : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      out[key] = value
    }
    base = out as CSSProperties
    cache.set(decl, base)
  }
  return extra ? { ...base, ...extra } : base
}

export default css
