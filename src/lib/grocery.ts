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
  /** A link for one item on its own. On a phone this is how the list is
   *  actually shopped: tap a line, the app opens on that product, add it, come
   *  back. A single search box cannot hold fifteen different products. */
  buildItemLink(item: GroceryItem): string
}

/** Instacart, via the ordinary public web address — no partnership, no API key,
 * nothing to apply for.
 *
 * It opens the APP rather than a browser tab because instacart.com publishes an
 * apple-app-site-association (and the Android equivalent), which makes these
 * universal links: iOS and Android hand an https://instacart.com/... URL to the
 * installed app, and fall back to the web when it isn't installed. That
 * fallback is the reason not to use an `instacart://` scheme — a custom scheme
 * on a phone without the app fails with nothing to show.
 *
 * The honest limit of this path: Instacart's search takes one query, so a
 * fifteen-item list cannot arrive as a filled cart. `buildItemLink` is the
 * real mechanic — one tap per line. The Developer Platform's shopping-list
 * endpoint would return a genuinely shoppable multi-item page, and it can
 * replace `buildHandoff` behind this same interface if a key is ever obtained.
 * That is a link-building call, NOT partner-level order placement: checkout,
 * payment and the delivery window still happen inside Instacart, by the owner. */
export class InstacartDeepLink implements GroceryAdapter {
  readonly name = 'instacart'

  buildHandoff(items: GroceryItem[]): GroceryHandoff {
    const terms = items
      .filter((i) => i.quantity > 0)
      .map((i) => termFor(i))
    const q = encodeURIComponent(terms.join(', '))
    return { url: searchUrl(q), provider: 'Instacart', itemCount: terms.length }
  }

  buildItemLink(item: GroceryItem): string {
    return searchUrl(encodeURIComponent(termFor(item)))
  }
}

/** Deterministic mock for local/sandbox. */
export class MockGrocery implements GroceryAdapter {
  readonly name = 'mock'
  buildHandoff(items: GroceryItem[]): GroceryHandoff {
    const n = items.filter((i) => i.quantity > 0).length
    return { url: 'about:blank#grocery-handoff', provider: 'Mock', itemCount: n }
  }
  buildItemLink(item: GroceryItem): string {
    return 'about:blank#grocery-item-' + encodeURIComponent(item.name)
  }
}

/* The one place the address is written. Verified to resolve to Instacart's own
   search page; the shorter /store/s?k= form does not. */
const SEARCH_BASE = 'https://www.instacart.com/store/search?k='
const searchUrl = (encoded: string) => SEARCH_BASE + encoded
const termFor = (i: GroceryItem) => [i.brand, i.name, i.size].filter(Boolean).join(' ')

export function getGroceryAdapter(): GroceryAdapter {
  return new InstacartDeepLink()
}
