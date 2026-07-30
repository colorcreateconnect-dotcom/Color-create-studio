/* Par-level inventory, and the reorder that falls out of it.
 *
 * Nobody types a shopping list — they count what's in the cupboard and the gap
 * to par IS the list. So the arithmetic has to be right, and linens have to stay
 * out of the grocery link: sending someone to buy hotel sheets at a supermarket
 * is worse than not offering the link at all. */
import { describe, it, expect } from 'vitest'
import {
  isLow, shortBy, lowItems, groceryPart, supplierPart,
  reorderLines, tally, STARTER_SUPPLIES, type SupplyItem,
} from './supplies'
import { InstacartDeepLink, MockGrocery } from './grocery'

const item = (name: string, parLevel: number, onHand: number, supplierOnly = false): SupplyItem =>
  ({ id: 'si-' + name, propertyId: 'p1', name, parLevel, onHand, supplierOnly })

describe('isLow / shortBy', () => {
  it('is low below par, not at it', () => {
    expect(isLow(item('Paper towels', 6, 2))).toBe(true)
    expect(isLow(item('Paper towels', 6, 6))).toBe(false)
    expect(isLow(item('Paper towels', 6, 9))).toBe(false)
  })

  it('buys back up to par and no further', () => {
    expect(shortBy(item('Paper towels', 6, 2))).toBe(4)
    expect(shortBy(item('Paper towels', 6, 6))).toBe(0)
  })

  it('never asks for a negative quantity when a cupboard is overstocked', () => {
    // An extra dozen rolls is not a reason to return anything.
    expect(shortBy(item('Toilet paper', 12, 24))).toBe(0)
  })
})

describe('lowItems', () => {
  const list = [
    item('Coffee', 2, 2),
    item('Paper towels', 6, 1),
    item('Dish soap', 2, 1),
  ]

  it('lists only what is short', () => {
    expect(lowItems(list).map((i) => i.name)).toEqual(['Paper towels', 'Dish soap'])
  })

  it('puts the biggest shortfall first — most likely to run out mid-clean', () => {
    expect(lowItems(list)[0].name).toBe('Paper towels')
  })

  it('copes with an empty or absent cupboard', () => {
    expect(lowItems([])).toEqual([])
    expect(lowItems(undefined as any)).toEqual([])
  })
})

describe('groceryPart / supplierPart — linens do not come from a supermarket', () => {
  const list = [
    item('Paper towels', 6, 0),
    item('Sheet sets', 2, 0, true),
    item('Bath towels', 6, 6, true),   // at par, so not on any list
  ]

  it('keeps linens out of the grocery list', () => {
    expect(groceryPart(list).map((i) => i.name)).toEqual(['Paper towels'])
  })

  it('routes linens to the supplier list instead', () => {
    expect(supplierPart(list).map((i) => i.name)).toEqual(['Sheet sets'])
  })

  it('leaves an at-par linen off both', () => {
    expect(groceryPart(list).concat(supplierPart(list)).map((i) => i.name)).not.toContain('Bath towels')
  })
})

describe('reorderLines — what gets recorded', () => {
  it('records the name and quantity, so the record survives a later rename', () => {
    const lines = reorderLines([item('Paper towels', 6, 2), item('Coffee', 2, 2)])
    expect(lines).toEqual([
      { supplyItemId: 'si-Paper towels', name: 'Paper towels', quantity: 4, supplierOnly: false },
    ])
  })

  it('marks a linen line so it is not mistaken for groceries later', () => {
    expect(reorderLines([item('Sheet sets', 2, 0, true)])[0].supplierOnly).toBe(true)
  })
})

describe('tally', () => {
  it('counts what is short and where it has to go', () => {
    expect(tally([
      item('Paper towels', 6, 0),
      item('Dish soap', 2, 1),
      item('Sheet sets', 2, 0, true),
      item('Coffee', 2, 2),
    ])).toEqual({ total: 4, low: 3, grocery: 2, supplier: 1, stocked: false })
  })

  it('calls a home stocked only when it actually has an inventory', () => {
    expect(tally([item('Coffee', 2, 2)]).stocked).toBe(true)
    // No inventory at all is "not set up yet", not "fully stocked".
    expect(tally([]).stocked).toBe(false)
  })
})

describe('STARTER_SUPPLIES', () => {
  it('gives a brand-new home something to adjust rather than a blank screen', () => {
    expect(STARTER_SUPPLIES.length).toBeGreaterThan(10)
    expect(STARTER_SUPPLIES.every((i) => i.parLevel > 0)).toBe(true)
    expect(STARTER_SUPPLIES.every((i) => i.onHand === 0)).toBe(true)
  })

  it('marks the linens as supplier-only, so day one already routes correctly', () => {
    const linens = STARTER_SUPPLIES.filter((i) => i.supplierOnly).map((i) => i.name)
    expect(linens).toContain('Sheet sets')
    expect(linens).toContain('Bath towels')
    expect(STARTER_SUPPLIES.find((i) => i.name === 'Paper towels')!.supplierOnly).toBe(false)
  })
})

describe('the Instacart handoff', () => {
  const low = [item('Paper towels', 6, 2), item('Dish soap', 2, 0)]
  const asGrocery = (l: SupplyItem[]) => reorderLines(l).map((r) => ({ name: r.name, quantity: r.quantity }))

  it('opens instacart.com — an https link, so the phone hands it to the app', () => {
    // A custom instacart:// scheme would fail with nothing to show on a phone
    // without the app; a universal link falls back to the web.
    const h = new InstacartDeepLink().buildHandoff(asGrocery(low))
    expect(h.url.startsWith('https://www.instacart.com/')).toBe(true)
    expect(h.provider).toBe('Instacart')
    expect(h.itemCount).toBe(2)
  })

  it('builds a per-item link, which is how the list is actually shopped', () => {
    const url = new InstacartDeepLink().buildItemLink({ name: 'Paper towels', quantity: 4, brand: 'Bounty' })
    expect(url).toContain('Bounty')
    expect(url).toContain('Paper%20towels')
    expect(url.startsWith('https://www.instacart.com/')).toBe(true)
  })

  it('escapes what it puts in the query', () => {
    const url = new InstacartDeepLink().buildItemLink({ name: 'soap & water', quantity: 1 })
    expect(url).not.toContain(' ')
    expect(url).toContain('%26')
  })

  it('drops a line with nothing to buy', () => {
    expect(new InstacartDeepLink().buildHandoff([{ name: 'Coffee', quantity: 0 }]).itemCount).toBe(0)
  })

  it('the mock stays local — no sandbox run ever opens a real store', () => {
    expect(new MockGrocery().buildItemLink({ name: 'Coffee', quantity: 1 })).not.toContain('instacart')
  })
})
