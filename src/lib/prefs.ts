/* How a home is cleaned: the product approach and the finishing scent.
 *
 * These are the client's own choices about their own home, and they live on the
 * `properties` row as enums (`product_preference`, `signature_scent`). The
 * screen shows them as human labels. This module is the only place the two
 * vocabularies meet, so a label can never be written to the database and an
 * unrecognised enum can never blank the screen.
 *
 * Unknown values fall back to the schema's own defaults rather than to nothing,
 * because a home always has SOME standard — a blank here would read as "no
 * preference recorded", which is a different and untrue statement. */

export type ProductPreference = 'eco_non_toxic' | 'standard_disinfectant'
export type Scent = 'eucalyptus_mint' | 'fresh_linen' | 'citrus' | 'lavender' | 'unscented'

export const DEFAULT_PRODUCT: ProductPreference = 'eco_non_toxic'
export const DEFAULT_SCENT: Scent = 'eucalyptus_mint'

const SCENT_LABELS: Record<Scent, string> = {
  eucalyptus_mint: 'Eucalyptus-mint',
  fresh_linen: 'Fresh linen',
  citrus: 'Citrus',
  lavender: 'Lavender',
  unscented: 'Unscented',
}

/** Every scent, in the order the picker shows them. */
export const SCENTS: Scent[] = ['eucalyptus_mint', 'fresh_linen', 'citrus', 'lavender', 'unscented']

/** The label for a stored scent. */
export function scentLabel(value: unknown): string {
  return SCENT_LABELS[value as Scent] || SCENT_LABELS[DEFAULT_SCENT]
}

/** The stored value for a label the picker produced. */
export function scentValue(label: unknown): Scent {
  const found = SCENTS.find((s) => SCENT_LABELS[s] === String(label ?? '').trim())
  return found || DEFAULT_SCENT
}

/** Is this home on the eco standard? Anything unrecognised is treated as eco,
 *  which is both the schema default and the studio's actual practice. */
export function isEco(value: unknown): boolean {
  return value !== 'standard_disinfectant'
}

export function productValue(eco: boolean): ProductPreference {
  return eco ? 'eco_non_toxic' : 'standard_disinfectant'
}

export function productLabel(value: unknown): string {
  return isEco(value) ? 'Eco & non-toxic' : 'Standard disinfectant'
}

/** The one-line summary under "Products & scent" on the home screen. */
export function prefsLine(product: unknown, scent: unknown): string {
  return productLabel(product) + ' · ' + scentLabel(scent)
}

/** What to put under the Products & Scent header.
 *
 *  One home: its name. Several: say so rather than picking one arbitrarily —
 *  the preference is per home, and naming only the first would misrepresent
 *  which one is being edited. None yet: don't invent a property. */
export function productsSubtitle(homeNames: string[]): string {
  const names = (homeNames || []).filter((n) => !!n && String(n).trim())
  if (names.length === 1) return names[0] + ' · how your home is cleaned'
  if (names.length > 1) return names.length + ' homes · how they’re cleaned'
  return 'How your home is cleaned'
}
