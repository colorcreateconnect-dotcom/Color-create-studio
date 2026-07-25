/* Real portfolio + work photos (CODE-UPDATE §9). These are Ahleyia's own
 * PUBLISHED marketing/portfolio shots — "after-service photography from real
 * Atlanta homes" — NOT client proof photos. Proof photos (report / active
 * clean / gallery) stay private washes; these are the only real images used,
 * and only on the public storefront.
 *
 * Captions are verbatim from the handoff's portfolio page. The full-res files
 * (brand-reference/portfolio) are re-encodes of the page's inline thumbnails,
 * so each file was matched to its caption PERCEPTUALLY (16×16 grayscale cosine
 * signature, optimal bijection — worst distance 0.04, i.e. >96% similar) rather
 * than by fragile filename order. The gallery is emitted in the portfolio
 * page's own narrative order (staging → kitchen → bath → bedrooms → living). */

export interface Shot { src: string; caption: string }

/** Featured hero shots (curated, named work photos — distinct from the gallery,
 *  and not present in the handoff's portfolio page, so captioned descriptively). */
export const WORK_SHOTS: Shot[] = [
  { src: '/photos/work/living-room-900.jpg', caption: 'Living room, reset' },
  { src: '/photos/work/bedroom-view-900.jpg', caption: 'Bedroom, guest-ready' },
  { src: '/photos/work/bed-nightstand-900.jpg', caption: 'Bedside, styled' },
  { src: '/photos/work/floor-shine-900.jpg', caption: 'Floors, mopped to a shine' },
]

/** The full portfolio — 35 real photos with their verbatim captions, in the
 *  portfolio page's narrative order. */
export const PORTFOLIO_SHOTS: Shot[] = [
  ['p2073', 'Towel art on a freshly made bed'],
  ['p2074', 'Linen closet, folded to standard'],
  ['p2075', 'Table set for arrival'],
  ['p2077', 'Welcome florals & staging'],
  ['p2082', 'Dining counter reset'],
  ['p2091', 'Range detailed & styled'],
  ['p2093', 'Guest amenities basket'],
  ['p2094', 'Fresh linens, folded'],
  ['p2081', 'Kitchen reset'],
  ['p2087', 'Kitchen, top to bottom'],
  ['p2096', 'Wall ovens & counters'],
  ['p2098', 'Cooktop degreased'],
  ['p2105', 'Kitchen, guest-ready'],
  ['p2109', 'Open-plan living & kitchen'],
  ['p2078', 'Microwave, inside and out'],
  ['p2079', 'Oven racks & interior'],
  ['p2088', 'Door hardware detailed'],
  ['p2089', 'Doors wiped down'],
  ['p2090', 'Sink polished to a shine'],
  ['p2103', 'Dishwasher detailed'],
  ['p2104', 'Refrigerator, fully cleaned'],
  ['p2083', 'Powder room reset'],
  ['p2084', 'Bathroom, spotless'],
  ['p2099', 'Double vanity'],
  ['p2102', 'Tub & tile'],
  ['p2106', 'Floors & fixtures'],
  ['p2107', 'Vanity detailed'],
  ['p2080', 'Bed made, corners crisp'],
  ['p2095', 'Bedroom with skyline view'],
  ['p2097', 'Guest bedroom staged'],
  ['p2100', 'Primary suite'],
  ['p2101', 'Bedroom, guest-ready'],
  ['p2085', 'Living & kitchen'],
  ['p2086', 'Living room reset'],
  ['p2108', 'Living room, styled'],
].map(([id, caption]) => ({ src: `/photos/portfolio/${id}.jpg`, caption }))
