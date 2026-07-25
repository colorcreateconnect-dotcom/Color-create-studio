/* Grocery reorder handoff — behind an adapter boundary.
 *
 * CORRECTION (CODE-UPDATE §1): there is NO Instacart partnership. The earlier
 * "corporate partner with Instacart" line is not currently true (it came via a
 * prior role and lapsed). So we build only the STANDARD path: a reorder list
 * becomes a pre-filled cart / deep link, and the owner confirms payment and
 * delivery window inside Instacart. We do NOT architect partner-level order
 * placement, tracking or invoicing.
 *
 * Everything stays behind this interface so a real agreement — or a different
 * grocery partner — can drop in later without touching the rest of the app. */

export interface GroceryItem {
  name: string
  quantity: number
  brand?: string
  size?: string
}

export interface GroceryHandoff {
  /** A URL the owner opens to review + check out in the grocery app/site. */
  url: string
  provider: string
  itemCount: number
}

export interface GroceryAdapter {
  readonly name: string
  /** Build a ready-to-checkout handoff from a reorder list. */
  buildHandoff(items: GroceryItem[]): GroceryHandoff
}

/** Instacart via the standard, unauthenticated deep-link path (no partnership).
 * Uses a universal-link search prefill; the Developer Platform "Create Shopping
 * List" API can replace `buildHandoff` later behind this same interface. */
export class InstacartDeepLink implements GroceryAdapter {
  readonly name = 'instacart'
  buildHandoff(items: GroceryItem[]): GroceryHandoff {
    const terms = items
      .filter((i) => i.quantity > 0)
      .map((i) => [i.brand, i.name, i.size].filter(Boolean).join(' '))
    const q = encodeURIComponent(terms.join(', '))
    return { url: `https://www.instacart.com/store/search?k=${q}`, provider: 'Instacart', itemCount: terms.length }
  }
}

/** Deterministic mock for local/sandbox. */
export class MockGrocery implements GroceryAdapter {
  readonly name = 'mock'
  buildHandoff(items: GroceryItem[]): GroceryHandoff {
    const n = items.filter((i) => i.quantity > 0).length
    return { url: 'about:blank#grocery-handoff', provider: 'Mock', itemCount: n }
  }
}

export function getGroceryAdapter(): GroceryAdapter {
  return new InstacartDeepLink()
}
