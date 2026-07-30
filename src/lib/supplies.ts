/* Par-level inventory for a home, and what to reorder.
 *
 * A home has a par level for each thing it should always have (six rolls of
 * paper towels, two hand soaps) and a count of what is actually there. The gap
 * between the two IS the reorder list — nobody types a shopping list, they
 * count what's in the cupboard and the list falls out.
 *
 * Two kinds of item, and they go different places. Most are groceries, which
 * the owner buys through Instacart. Linens are `supplierOnly` — they come from a
 * linen supplier, not a supermarket, and putting them in a grocery link would
 * send someone to buy hotel sheets at Kroger. */

export interface SupplyItem {
  id: string
  propertyId: string
  name: string
  icon?: string | null
  parLevel: number
  onHand: number
  /** Linens and the like: routed to a supplier, never to the grocery link. */
  supplierOnly: boolean
}

/** Is this below the level the home is supposed to hold? */
export const isLow = (it: SupplyItem) => Number(it.onHand) < Number(it.parLevel)

/** How many to buy to get back to par. Never negative — an overstocked
 *  cupboard is not a reason to return anything. */
export const shortBy = (it: SupplyItem) => Math.max(0, Number(it.parLevel) - Number(it.onHand))

/** Everything below par, worst first, so the top of the list is the thing most
 *  likely to run out mid-clean. */
export function lowItems(items: SupplyItem[]): SupplyItem[] {
  return (items || []).filter(isLow).sort((a, b) => shortBy(b) - shortBy(a))
}

/** The part of the reorder that a supermarket can actually fill. */
export const groceryPart = (items: SupplyItem[]) => lowItems(items).filter((i) => !i.supplierOnly)

/** The part that has to go to the linen supplier instead. */
export const supplierPart = (items: SupplyItem[]) => lowItems(items).filter((i) => i.supplierOnly)

/** One line of a reorder, as it is stored on the `reorders` row. Kept plain so
 *  the record of what was asked for survives the item being renamed or the par
 *  level changing afterwards. */
export interface ReorderLine {
  supplyItemId: string
  name: string
  quantity: number
  supplierOnly: boolean
}

export function reorderLines(items: SupplyItem[]): ReorderLine[] {
  return lowItems(items).map((i) => ({
    supplyItemId: i.id,
    name: i.name,
    quantity: shortBy(i),
    supplierOnly: !!i.supplierOnly,
  }))
}

export interface SupplyTally {
  total: number
  low: number
  grocery: number
  supplier: number
  /** True when the cupboard is at par and there is nothing to send anywhere. */
  stocked: boolean
}

export function tally(items: SupplyItem[]): SupplyTally {
  const list = items || []
  const low = lowItems(list)
  const supplier = low.filter((i) => i.supplierOnly).length
  return {
    total: list.length,
    low: low.length,
    grocery: low.length - supplier,
    supplier,
    stocked: list.length > 0 && low.length === 0,
  }
}

/** What a home is set up with on day one.
 *
 *  A brand-new property has no inventory at all, and asking someone to type
 *  fifteen rows on a phone before the feature does anything is how a feature
 *  goes unused. This is the standard par-stock for the Kee Method — adjustable
 *  the moment it lands, because every home is different. */
export const STARTER_SUPPLIES: Array<Omit<SupplyItem, 'id' | 'propertyId' | 'onHand'> & { onHand: number }> = [
  { name: 'Paper towels', icon: '🧻', parLevel: 6, onHand: 0, supplierOnly: false },
  { name: 'Toilet paper', icon: '🧻', parLevel: 12, onHand: 0, supplierOnly: false },
  { name: 'Hand soap', icon: '🧼', parLevel: 3, onHand: 0, supplierOnly: false },
  { name: 'Dish soap', icon: '🧴', parLevel: 2, onHand: 0, supplierOnly: false },
  { name: 'Dishwasher pods', icon: '🧴', parLevel: 1, onHand: 0, supplierOnly: false },
  { name: 'Laundry detergent', icon: '🧺', parLevel: 1, onHand: 0, supplierOnly: false },
  { name: 'Trash bags', icon: '🗑', parLevel: 2, onHand: 0, supplierOnly: false },
  { name: 'Sponges', icon: '🧽', parLevel: 4, onHand: 0, supplierOnly: false },
  { name: 'Glass cleaner', icon: '🪟', parLevel: 1, onHand: 0, supplierOnly: false },
  { name: 'All-purpose cleaner', icon: '🌱', parLevel: 2, onHand: 0, supplierOnly: false },
  { name: 'Coffee', icon: '☕', parLevel: 2, onHand: 0, supplierOnly: false },
  { name: 'Bath towels', icon: '🛁', parLevel: 6, onHand: 0, supplierOnly: true },
  { name: 'Hand towels', icon: '🛁', parLevel: 4, onHand: 0, supplierOnly: true },
  { name: 'Sheet sets', icon: '🛏', parLevel: 2, onHand: 0, supplierOnly: true },
]
