# CCC Final Assembly — Delivery Note

**One deployed build, on the v3.6.1 engine, restyled to look and feel like the Color Create
Studio design (the "SKIN"), with real cleared photos in every department and all commerce math
unchanged.** This note confirms the three things the brief asked for, plus one flag.

## ✅ Engine untouched (source of truth preserved)
The audited commerce core was **not modified** — verified byte-for-byte against the export manifest:

| File | SHA256 (matches `EXPORT-MANIFEST.txt`) |
|---|---|
| `backend/pricing.ts` | `2781e2b5…d926f` ✓ |
| `netlify/functions/api.ts` | `f6d1c6cb…071fac` ✓ |

Stripe checkout, tax codes (physical `txcd_99999999` vs digital `txcd_10506002`/`10505001`),
order metadata (full config chunked into Stripe metadata), the design-intake gate (idea required +
upload-permission checkbox), quantity rules (paper 12/24/36/48/60; bundle min 14), and the
`3d-approved-team-shirt` product are all intact. Frontend pricing/estimate logic and the
configuration objects sent to checkout were **not** altered — only look, layout, copy, motion, and
brand.

## ✅ Step 6 totals verified (math did not change)
Run against the real `backend/pricing.ts` (type-stripped, executed directly):

| Check | Result |
|---|---|
| Supporter 6 adult (auto 10%) | **$189** ✓ |
| Paper invitations qty 24 | **$78** ✓ |
| 3D single adult 2XL + back | **$75** ✓ |
| 3D approved-team adult front+back | **$55** ✓ |
| New personalized 3D adult front+back | **$65** ✓ |
| Digital custom card (no shipping step) | **$10** ✓ |
| DTF bundle 16 roster, one 2XL, one name+number | **$302** — see flag ⚠️ |

### ⚠️ One flag: the DTF-bundle case computes **$302**, not $312
This is **pre-existing in the engine, not caused by the restyle.** In v3.6.1, roster
name/name+number on a **team bundle** is labeled *"included"* and priced at **$0** in both the
frontend (`teamEstimate`) and the server (`pricing.ts`). So the case totals `270 + 2×$15 (extra
shirts) + $2 (one 2XL) = $302`. The brief's $312 assumes name+number adds $10 on a bundle, which
the engine does not do. Because the brief forbids touching the engine's math — and doing so could
ship a wrong price to real customers — this was **left exactly as the engine computes it** and is
flagged for your decision. If bundle name+number *should* add $10, that's a deliberate `pricing.ts`
change to make and re-audit, not a restyle fix.

## ✅ Only CLEAR / OK-OWN photos published
27 real client mockups were sourced from the design handoff and placed in the hero collage, the home
proof wall, the Portfolio (Graduation leads, per brief), the Sports "See the real thing" showcase,
and the Celebration Suites headline. Every published image is **CLEAR** or owner-approved **OK-OWN**
(the design set was already curated — the **PERM** items, Grillfather-worn / Best Dad worn+collage /
reunion group tee, were never in the bundle and are **not** published). The Paw Patrol
"Slippery Paw-ty" suite appears as a **portfolio example only** (badged "Example only"), never as a
buyable product. The Photo Integrity Promise (footer + quote acknowledgment) and the
upload-permission checkbox are kept.

## What the restyle changed (look only)
- **Typography** → DM Serif Display (display), Montserrat (labels/nav), Dancing Script (script
  accents), Inter (body).
- **Palette** → cream canvas + warm cocoa neutrals + gold accent + CCC-vibrant pink→purple gradient;
  Tailwind `amber`/`stone` remapped in `tailwind.config.js`, brand tokens added.
- **Brand** → "Color Create Studio" identity, CCC logo lockup, active-nav gold underline + pink,
  cocoa "Start a Project" pill, gradient headline accents, pink primary CTAs with a chrome sheen.
- **Scoped fun kept** → stadium chrome-and-blue in Sports only, starburst "Set of 12" chips in Paper
  Lane, gold "show up loud" script badge, hero photo collage, light hero parallax.
- **Motion** → the engine's cinematic intro / chapter reveals / story-spine quote were preserved and
  restyled; `prefers-reduced-motion` guards are present and extended.
- **Retired language** → no "starting at" inside configurators/carts (firm totals shown); browse
  teasers say "From $X"; two design rounds sitewide; suites show product counts, not credits.

## Step 7 — launch dependencies (owner-side, currently blocking full go-live)
Checkout runs in **safe preview mode** until these are done (see `NETLIFY-SETUP.md`):
1. Branded domain **colorcreatestudio.com** + SSL + redirect.
2. **Apple Pay** domain verification on that domain.
3. **Georgia sales-tax** registration added in Stripe Tax.
4. **Stripe account verification** with the business bank account (set `STRIPE_SECRET_KEY`).
Optional: `RESEND_API_KEY` + `CCC_FROM_EMAIL` enable quote-confirmation emails.

## Run / deploy
```bash
npm install
npm run dev      # local
npm run build    # production (Netlify runs this; publishes dist/, bundles the API function)
```
