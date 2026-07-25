# She's Maid In ATL — the app

An eco-conscious boutique luxury housekeeping studio's app, built from the
`design_handoff_shes_maid_in_atl_app` handoff. One codebase, **three zones**:

| Zone | Who | What they can do |
| --- | --- | --- |
| **Public** | Anyone who scans her card or opens the link | Browse services, create an account, sign in |
| **Cleaner** (staff + admin) | Ahleyia and her assistant | Today's route, check-in, The Kee Method™ checklists, supplies, payouts, inbox — plus the business side (dashboard, calendar, assign, team, clients, pricing) on the same login |
| **Owner** (client) | Hosts & homeowners | Homes, schedule, quotes, photo-verified reports, supplies, receipts, messages |

The promise the product keeps: **the home looks exactly right every time, and
here's the proof** — the method, the photo proof, the reports, the single clean
charge, the tailored quote.

## Tech

- **Vite + React 18 + TypeScript** — a phone-first web app that renders the
  device frame and all three zones exactly as the design prototype does.
- The brand **design tokens** (`src/ds/tokens/*.css`) are the handoff's own
  files, unchanged — every colour, font, radius, shadow and motion value
  resolves through a CSS variable.
- The **30-component design system** (`src/ds/components.tsx`) is ported 1:1
  from the handoff bundle (`PhoneFrame`, `DetailHeader`, `TabBar`, `JobCard`,
  `PhaseAccordion`, `ChecklistTask`, `PriceBox`, `Sheet`, …).
- All app state, seed data, navigation history stack and the derived view-model
  live in one store hook (`src/app/model.tsx`) — a faithful port of the
  prototype's logic class. In a production build this per-domain state would
  move behind an API; here it is held in one store so the whole app is
  clickable end to end.

## Non-negotiable product rules (preserved in the build)

1. **Price privacy** — clients never see hourly rates, hours, or the assistant
   split. Owners see one tailored flat number; the math lives only in the
   cleaner's Quote Builder (badged 🔒 Private).
2. **Money language** — the card is charged **once, in full, on arrival, never
   twice**. Everything after is a *release* (50% on arrival, 50% on approval,
   auto at 48h). Tips are a separate charge, 100% to the cleaner.
3. **The Kee Method™ is fixed content** — phase names, order and step wording
   don't change; per-home standards ride on top.
4. **Credit cards only**, staffing is business-side, two-hour arrival windows,
   the 48h auto-release line appears wherever approval is requested, and the
   cancellation policy (free >24h, 50% inside 24h, one courtesy waiver, no fee
   when it's her side).

The app stays **light only** — the cream and pink *is* the identity. The only
dark surfaces are the two the OS owns: the lock screen and push notifications.

## Production architecture

This is a full-stack build, not just the front-end clone. **See
[`ARCHITECTURE.md`](./ARCHITECTURE.md)** for the whole picture: the Supabase
Postgres schema + Row-Level Security + Kee Method™ seed (`supabase/`), the
Square payment adapter and Netlify Functions for the money model
(`netlify/functions/`), the tested financial-core logic (`src/lib/`), the
installable PWA with offline checklist + photo sync (`public/sw.js`), and a
**go-live checklist** for the parts that need live Supabase / Square / Netlify
credentials (which can't be provisioned in a sandbox). Highlights:

- **Money model** — one capture on arrival, 50/50 *release* schedule, 48h
  auto-release, separate tip charge, CREDIT-cards-only, recorded consent. A
  typed state machine makes illegal transitions impossible. `npm test` proves it.
- **Price privacy** — enforced at the DB (internal pricing in tables owners
  can't select), at the serializer (`stripForClient`), and in the UI.
- **GPS geofence** gates check-in (recomputed server-side).
- **Row-Level Security** isolates every owner's data at the database.
- Verified in-sandbox: the schema/RLS/seed apply cleanly to real Postgres, and
  all financial-core tests pass.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview the production build
npm test          # financial-core + integration unit tests
```

**Deploying?** See [`DEPLOY.md`](./DEPLOY.md) — a step-by-step runbook for going
live on Supabase now with Square added later (payments run in a safe simulated
mode until the Square keys are in; the switch is env-driven, no code change).

### Deep links

The stage (device switcher + the "Every screen" index) shows by default. Query
params let you open straight into a zone:

- `?role=owner` · `?role=cleaner` · `?role=visitor` — pick the starting zone
- `?chrome=0` — hide the surrounding review chrome (just the phone)
- `?fill=1` — pre-tick the Kee Method™ steps (handy for the report/approval flow)

Example: `/?role=cleaner&chrome=0`.

## Structure

```
src/
  ds/
    tokens/*.css        design tokens (verbatim from the handoff)
    styles.css          token entry point
    components.tsx      the 30 design-system components
  app/
    model.tsx           state, seed data, handlers, view-model (the logic class)
    css.ts              parses the prototype's inline-style strings -> React style
    App.tsx             the shell: stage, role switcher, PhoneFrame, tab bars
    screens/
      public.tsx        Welcome, Services, sign-in/up, verify, onboarding, splash
      cleaner.tsx       working + admin screens
      owner.tsx         client screens
      shared.tsx        thread, compose, calendar (shared by both roles)
      chrome.tsx        sheets, camera overlay, toast, "Every screen" index
public/
  assets/brand/         app icon, sticker, share-card QR (real brand assets)
```

*Every clean follows **The Kee Method™**. Luxury rooted in generations of excellence.*
