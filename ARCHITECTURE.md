# Architecture — She's Maid In ATL

Mobile web (installable PWA), not native. React (Vite) + Netlify + Supabase +
Square, architected for a single cleaner today and a certified-cleaner **network**
tomorrow (a config change, not a migration — `organization` is the top object).

```
Browser (PWA)                     Netlify                         Supabase
────────────────                  ───────────────────             ─────────────────
React app (locked UI)  ── anon ─► PostgREST + GoTrue  ◄─ RLS ──►  Postgres
service worker (offline)          Functions (service key) ──────► (bypasses RLS)
Square Web Payments SDK ─ token ─► save-card / checkin /          Storage (photos,
(tokenize card)                    approve / auto-release /        signed URLs)
                                   webhook  ── access token ──►  Square API
```

**Secrets never reach the browser.** The Square access token (can charge cards)
and the Supabase service-role key (bypasses RLS) live only in Netlify env vars,
used only inside functions. The browser holds the anon key (RLS-guarded) and the
Square *application* id (tokenization only).

## What's in the repo

| Layer | Files | Status |
| --- | --- | --- |
| Locked UI (63 screens, 3 zones) | `src/app`, `src/ds` | Built, screenshot-verified |
| Financial-core logic | `src/lib/pricing.ts`, `geofence.ts`, `payments/*`, `privacy.ts`, `consent.ts` | **23 unit tests pass** |
| Database schema + RLS + seed | `supabase/migrations/*`, `supabase/seed.sql` | **Applied clean against real Postgres** (26 steps, 4 photo moments, 30 policies) |
| Payment adapter (Square + mock) | `src/lib/payments/adapter.ts`, `netlify/functions/_shared/square.ts` | Written; needs a Square account to run live |
| Netlify Functions | `netlify/functions/*` | Written; need Supabase + Square env to run live |
| Data layer (Supabase + mock) | `src/lib/data/*`, `src/lib/keeMethod.ts` | Mock runs in-sandbox; Supabase impl needs a project |
| PWA (offline + install) | `public/manifest.webmanifest`, `public/sw.js`, `src/app/pwa.ts` | Ships in the build |

## Money model (the financial core)

One capture, on arrival. The split is a **release schedule**, never a second
charge. Payment state machine (`src/lib/payments/state.ts`):

```
scheduled ─► captured ─► deposit_released ─► awaiting_approval ─► approved ────► final_released ─► settled
    │                                              │            └► auto_approved_48h ─┘
    └► capture_failed (job HELD before the clean)  └► disputed (pauses auto-release)
```

- **Check-in** (`checkin.ts`): GPS geofence is recomputed server-side; only then
  is the full amount captured in one charge, the card re-checked as CREDIT, and
  the arrival 50% released. A declined capture **holds** the job — the cleaner
  never works for free.
- **Approve** (`approve.ts`): releases the final 50%; a tip is a **separate**
  charge, 100% to the cleaner.
- **48h auto-release** (`auto-release.ts`, scheduled hourly): releases the
  balance when there's no owner response and no open dispute.
- **Chargeback defense**: timestamped consent (or 48h auto-approval) + the
  photo-proof report + the GPS check-in are stored immutably per job.

Cards are **CREDIT only** — debit/prepaid/unknown rejected at save *and*
re-checked at charge (`src/lib/payments/cards.ts`; DB `check (card_type='CREDIT')`).
Consent text is versioned + timestamped at card save (`src/lib/consent.ts`).

## Price privacy — enforced in three places

1. **Database**: internal pricing (rate/hours/split) lives in
   `quote_pricing_internal` / `job_pricing_internal`, which have **no owner RLS
   policy** — an owner querying them gets zero rows.
2. **API serializer**: `stripForClient()` deep-removes private fields (and
   derived leaks like clean duration) before any owner/public response;
   `assertClientSafe()` guards it in tests.
3. **UI**: clients only ever see one tailored flat number.

## Pricing engines (`src/lib/pricing.ts`)

- **Airbnb**: tiered auto-quote from bedroom count (Studio–1BR $95–125 · 2BR
  $125–160 · 3BR $160–185 · 4BR+ from $185); Light/Standard/Heavy staging picks
  min/mid/max (2BR → 125/142/160, verbatim). On-site laundry included except
  same-day turnovers (second linen set required); outdoor never included.
- **Residential**: `$50/hr` floor (`$65` deep) → comfort round-up `max(base+10,
  roundTo5(base×1.12))` (3h×$50=$150 → **$170**). Assistant = `max(40%, $50)`.

The store (`src/app/model.tsx`) sources its quote numbers from this engine, so
there's one tested source of truth.

## Row-Level Security

Owner isolation and org scoping at the database (`supabase/migrations/0002_rls.sql`):
an owner can only touch their own properties/jobs/reports/cards/messages; staff
& admin are scoped to their organization; pricing rules + internal pricing are
staff/admin-only. Helper functions (`app_role()`, `app_org()`, `is_staff()`)
key off Supabase `auth.uid()`.

## The Kee Method™ engine

Data, not hardcoded screens: `Method → Edition → Phase → Step` in the schema and
mirrored in `src/lib/keeMethod.ts` (so it works offline/mock). A property
references a base Edition; per-property overrides layer its standard on top; a
job instantiates the template and records completion + photos + timestamps per
step. The 4 photo steps are the proof system.

## PWA / offline

Installable (manifest + apple-touch-icon, standalone, theme `#C81C7E`, bg
`#FFF9F4`). The service worker (`public/sw.js`) caches the app shell (checklist
keeps working offline), never caches money/API calls, and runs a photo **outbox**
(IndexedDB + Background Sync) so proof photos taken offline upload on reconnect.

---

# Go-live checklist (what needs live services)

This sandbox has no Supabase project, Square account, or Netlify site, so the
end-to-end money flow can't be exercised here. To take it live:

1. **Supabase**: create a project; run `supabase/migrations/0001_schema.sql`,
   `0002_rls.sql`, then `supabase/seed.sql`. Create a Storage bucket `proof`
   (private; serve via signed, expiring URLs). Enable phone (OTP) + magic-link
   auth. Add a trigger/edge function to insert a `users` row on signup.
2. **Square**: create an app; get the sandbox access token, application id,
   location id, and webhook signature key. Point a webhook subscription at
   `/.netlify/functions/square-webhook`. Verify the Payments/Cards/Refunds
   endpoints against current docs (they're versioned via `Square-Version`).
3. **Netlify**: connect the repo; set env vars from `.env.example`
   (`SUPABASE_*`, `SQUARE_*` server-side; `VITE_*` client-side). `netlify.toml`
   already wires the build, the functions dir, the hourly `auto-release`
   schedule, the SPA redirect, and the no-cache header on `sw.js`.
4. **Listing detection**: implement `properties`-onboarding parsing of the
   owner-supplied page's public metadata (schema.org / OG / JSON-LD) and/or a
   licensed property-data API — **get legal sign-off on each source's ToS; never
   bulk-crawl**; always offer the manual-confirm fallback (already in the UI).
5. **Notifications**: wire Twilio (SMS) + Resend/Sendgrid (email) for
   money-critical events; Web Push is a bonus.
6. **Maps**: add a Mapbox or Google Maps JS key for the route map; the geofence
   already uses the browser Geolocation API.

## Still-open business decisions (build around, don't block)

Late-cancellation fee · lockout/can't-access trip fee · dispute policy
(re-clean first vs refund) · who funds Instacart supplies · cleaner insurance
requirement · residential hours-per-scope calibration. The schema and UI leave
room for each; none blocks launch.

---

# Delta updates applied (CODE-UPDATE.md)

Corrections (🔴) and new scope (🟡) from the follow-up handoff, all verified:

- **Token collision fixed** — `--text-body` was defined as both a color and a
  `14.5px` size; the size won, so `color:var(--text-body)` was invalid and body
  text rendered pure black. Renamed the size to `--text-body-base`; body text is
  `#2A1720` again. (45 usages, all `color:`, none `font-size:`.)
- **Authoritative PWA kit** adopted — real icons at 152/167/180/192/512 +
  maskable-512 and the head snippet from `home-screen-kit/`.
- **Instacart: no partnership.** The grocery handoff is the standard deep-link /
  shopping-list path only, behind a `GroceryAdapter` (`src/lib/grocery.ts`) so a
  real agreement can drop in later. No partner-level order placement.
- **Price-privacy nuance** — published price ≠ exposed margin. Cleaning cost math
  stays private; **published cleaning prices and the concierge $70/hr hourly
  rate are public** (concierge is time-based). `privacy.ts` documents both sets.
- **Photo privacy is a hard rule** — `photos` table with `kind` and
  `marketing_consent` **default false**; RLS makes every photo private to the
  org + owner (no public/cross-owner policy); a DB check forbids a `before`
  photo ever carrying marketing consent. Serve only via signed, expiring URLs.
- **Public portfolio vs private proof** — the "Her work" storefront screen
  (`screens/portfolio.tsx`, `portfolioData.ts`) uses Ahleyia's **own published
  after-service photography** (39 real images under `public/photos/`), the only
  real photos in the app. Client **proof photos** — reports, the active clean,
  the owner gallery — stay ghosted/private washes and are never surfaced here,
  keeping the two photo streams cleanly separated. Portfolio captions are
  verbatim from the handoff and were paired to their files **perceptually**
  (16×16 grayscale cosine signature, optimal bijection) rather than by fragile
  filename order, then verified against each image.
- **Concierge tier + full catalogue** (`src/lib/concierge.ts`, migration 0004):
  - `$70/hr`, billed in 15-minute increments — the one public rate.
  - Purchases **reimbursed at cost, no markup**; a reimbursable **cannot exist
    without a receipt photo** (enforced at the DB check *and* the add-expense
    function — verified: the insert is rejected).
  - **Capture at close** (not arrival) — the amount is the **sum of non-tip line
    items**, never a stored total. New `captured → settled` transition.
  - Live time is **additive only from the client** (`applyExtension` rejects an
    owner-originated decrease); `added_by` on `concierge_time` keeps it auditable.
  - `estimated_minutes` is a **plan, never a quote** — no total is derived from it.
  - `Job.type` extended (concierge, co_hosting, store_run, delivery_receipt,
    coaching, reset_organization, move_out, window_cleaning, laundry, commercial);
    reset/organization has its own slower hours curve; coaching is a service line.
  - New entities: `JobLineItem`, `ConciergeRequest`, `stored_goods` (goods-in-
    storage, distinct from par-level supplies), with RLS.
- **Acuity** is the incumbent booking tool (`bookatlluxury.as.me`); the
  bedroom-based Airbnb tiers are canon (the Acuity menu is outdated). Storefront
  may link out to Acuity until cutover — set a link-out env var at go-live.

Verified in-sandbox after the deltas: **34 unit tests pass**; migrations
0001–0004 + seed apply clean to real Postgres (**30 tables, 35 RLS policies,
`marketing_consent` default false, receipt-required check enforced**); all
Netlify functions bundle; `vite build` green.

## Processor swap (network phase)

When the first outside cleaner joins and real third-party payouts begin, swap
Square for a marketplace processor (likely Stripe Connect) by implementing the
same `PaymentAdapter` interface in `netlify/functions/_shared/` and pointing
`getAdapter()` at it. Nothing else changes. Re-verify capabilities against
current docs at that time.
