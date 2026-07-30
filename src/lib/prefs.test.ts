/* Product approach and signature scent.
 *
 * The screen speaks in labels, the database in enums. If those two ever cross,
 * a client's stated preference for their own home is either lost or written
 * wrong — so the crossing point is pinned here. */
import { describe, it, expect } from 'vitest'
import {
  SCENTS, scentLabel, scentValue, isEco, productValue, productLabel,
  prefsLine, productsSubtitle, DEFAULT_SCENT,
} from './prefs'

describe('scent labels and values round-trip', () => {
  it('survives a trip through the picker and back', () => {
    SCENTS.forEach((s) => expect(scentValue(scentLabel(s))).toBe(s))
  })

  it('shows the stored value as a human label', () => {
    expect(scentLabel('eucalyptus_mint')).toBe('Eucalyptus-mint')
    expect(scentLabel('unscented')).toBe('Unscented')
  })

  it('never writes a label into the database', () => {
    // scentValue is the only thing that produces a stored value, and it can
    // only ever return one of the enum members.
    expect(SCENTS).toContain(scentValue('Citrus'))
    expect(SCENTS).toContain(scentValue('something nobody offers'))
  })

  it('falls back to the schema default rather than blanking the screen', () => {
    expect(scentLabel(null)).toBe('Eucalyptus-mint')
    expect(scentLabel('a_scent_added_later')).toBe('Eucalyptus-mint')
    expect(scentValue(undefined)).toBe(DEFAULT_SCENT)
  })
})

describe('product preference', () => {
  it('reads the two real values', () => {
    expect(isEco('eco_non_toxic')).toBe(true)
    expect(isEco('standard_disinfectant')).toBe(false)
    expect(productLabel('standard_disinfectant')).toBe('Standard disinfectant')
  })

  it('treats anything unrecognised as eco — the schema default and the practice', () => {
    expect(isEco(null)).toBe(true)
    expect(isEco('')).toBe(true)
    expect(isEco('something_new')).toBe(true)
  })

  it('round-trips', () => {
    expect(isEco(productValue(true))).toBe(true)
    expect(isEco(productValue(false))).toBe(false)
  })
})

describe('prefsLine', () => {
  it('summarises both in one line for the home screen', () => {
    expect(prefsLine('eco_non_toxic', 'eucalyptus_mint')).toBe('Eco & non-toxic · Eucalyptus-mint')
    expect(prefsLine('standard_disinfectant', 'citrus')).toBe('Standard disinfectant · Citrus')
  })
})

describe('productsSubtitle — no invented property names', () => {
  it('names the home when there is exactly one', () => {
    expect(productsSubtitle(['Okafor Residence'])).toBe('Okafor Residence · how your home is cleaned')
  })

  it('does NOT pick one arbitrarily when there are several', () => {
    // Naming only the first would misrepresent which home is being edited.
    const s = productsSubtitle(['Okafor Residence', 'Skyline Loft 12B'])
    expect(s).toBe('2 homes · how they’re cleaned')
    expect(s).not.toContain('Okafor')
  })

  it('invents nothing when the client has no homes yet', () => {
    expect(productsSubtitle([])).toBe('How your home is cleaned')
    expect(productsSubtitle(undefined as any)).toBe('How your home is cleaned')
  })

  it('ignores blank names rather than rendering an empty separator', () => {
    expect(productsSubtitle(['', '  ', 'Okafor Residence'])).toBe('Okafor Residence · how your home is cleaned')
  })
})
