# CCC Final Assembly — Delivery Note

**One deployed build, on the v3.6.1 engine, restyled to look and feel like the Color Create
Studio design (the "SKIN"), with real cleared photos in every department and all commerce math
unchanged.** This note confirms the three things the brief asked for, plus one flag.

## ✅ Commerce core preserved (one owner-directed price change)
`netlify/functions/api.ts` is **byte-identical** to the export manifest (`f6d1c6cb…071fac`), and the
**restyle itself changed no pricing or checkout logic**. The only pricing edit is a deliberate,
owner-approved change to `backend/pricing.ts` (with the matching frontend `teamEstimate` kept in
lockstep): **DTF team bundles are now round** — base + $15 per extra shirt, sizes and personalization
included, no per-size surcharge. `backend/pricing.ts` therefore intentionally differs from its
original manifest hash `2781e2b5…d926f` (that hash documents the as-delivered snapshot).

Everything else is unchanged: Stripe checkout, tax codes (physical `txcd_99999999` vs digital
`txcd_10506002`/`10505001`), order metadata (full config chunked into Stripe metadata), the
design-intake gate (idea required + upload-permission checkbox), quantity rules (paper
12/24/36/48/60; bundle min 14), the `3d-approved-team-shirt` product, and the 3D bundles' +$10
extended-size charge.

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
| DTF bundle 16 roster, one 2XL, one name+number | **$300** (owner: round DTF bundles) ✓ |
| 3D front bundle 14 roster, one 2XL (scope guard) | **$430** — unchanged ✓ |

### DTF bundle → even $300 (owner decision)
The flagged case (originally $302 in the as-delivered engine; the brief expected $312) was resolved
by the owner as **an even $300**. Reaching exactly $300 forces one mechanism: **DTF bundles no longer
add a per-size surcharge** — they price at `base + $15 per extra shirt`, with sizes and
personalization included (`270 + 2×$15 = $300` for a 16-shirt roster). This was applied to **DTF
bundles only**; the 3D bundles keep their +$10 extended-size charge (verified: 14-roster 3D-front
with one 2XL is still $430). Server and frontend were changed identically so the displayed and
charged totals match.

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
