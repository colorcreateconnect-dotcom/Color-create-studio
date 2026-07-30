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

## Backend integration (UI ↔ Supabase + Square + functions)

The UI is wired to the real backend **behind config detection** (`src/lib/config.ts`).
With no env vars it runs entirely on in-memory seed data (the sandbox/demo);
when the env vars are present the same screens talk to live services. Nothing to
toggle — `isSupabaseConfigured()` / `isSquareConfigured()` decide per call site,
so the clickable prototype never breaks.

- **Auth** (`src/lib/supabase.ts`) — dependency-free GoTrue over REST.
  **Everyone signs in with an email and a password** — client, cleaner and
  business alike. Texted one-time codes were removed deliberately: they made
  getting into the app depend on an SMS provider and a per-message cost, and a
  client Ahleyia added already sets their own password on the invite link she
  sends them. The session is persisted to `sb-access-token`, the key the
  anon-key data reads carry, so **RLS always runs as the signed-in user**.
- **Identity** (`v.me` in `src/app/model.tsx`) — one place the whole app reads
  who is signed in from: name, first name, initials, role, and what it says
  under their name. It exists because the name was hardcoded in a dozen screens,
  so every cleaner Ahleyia hired saw "Ahleyia Kee · Founder" on their own
  profile. With no backend it falls back to the seed persona so the demo still
  reads as her studio.
- **Views** (`src/lib/views.ts`) — which of the four zones an account may look
  at. With no backend all four are reachable, because that build IS the design
  review and switching on seed data is the point. On a live deployment they are
  not interchangeable: the zone comes from the signed-in role, `?role=` /
  `?chrome=` / `?fill=` are ignored, and the switcher offers only the account
  you are. The single exception is real — an `org_admin` is both the business
  and the housekeeper, so she has two views of one account. `mayRunBusiness()`
  reads the same rule, so the menu, the screens and the switcher cannot
  disagree about what an account is.
- **Contractors** (`0010_contractor_book.sql`) — a cleaner is an independent
  contractor, so their clients are theirs. `managed_by` on `users` and
  `properties` says whose book a client or a home is in (NULL = the studio's);
  `created_by` on `jobs` says who booked a clean. The policies changed from "any
  staff, same org" to "the org admin sees the organization; a contractor sees
  their own book plus the client and home of a clean assigned to them" — which
  also means internal pricing on a job a contractor booked is theirs and the
  studio's is not.
- **Availability** (`src/lib/availability.ts`) — busy windows come from two
  places and are answered as one list: the cleans a contractor is on (their own
  clients AND the studio's, because it is one person) and hours they have
  blocked with no job behind them. `dayAvailability()` turns that into the five
  arrival windows with a reason on each, and `book-clean` applies the same
  function server-side, so the calendar being stale cannot double-book anyone.
- **Signup grants nothing** (`0011_signup_cannot_pick_a_role.sql`) — the trigger
  that creates a `users` row used to read `role` and `org_id` out of the auth
  account's metadata. That metadata is written by whoever calls the signup
  endpoint, which is public, so it was an escalation path: read your own org_id,
  sign up again claiming `org_admin` in it. Nothing in metadata distinguishes a
  real provisioning call from a forged one, so none of it is read. Everyone who
  signs up is an `owner` with no org; the privileged functions set role and org
  afterwards, which is what they already did.
- **A studio of your own** (`become-contractor.ts`) — the consequence of the
  above is that an independent housekeeper cannot sign up *as* one, so the
  promotion is a separate authorized step. It only ever creates a NEW
  organization — no parameter names an existing one — and refuses a caller who
  is already in a studio. Signup may not return a session (email confirmation),
  so the intent parks in `localStorage` and completes on first sign-in.
- **Proof photos** (`src/lib/photo.ts`, `0012_proof_storage.sql`) — the file
  goes browser → private bucket directly, because a function is the wrong place
  to carry megabytes. The object key is `<org>/<job>/<step>-<nonce>.<ext>` and
  the storage policy reads that first segment, so the key is what scopes one
  studio's photos from another's; `photoKeyFor()` is the only thing that builds
  one and refuses a non-uuid. `attach-photo` writes the row with the two fields
  that must not be the browser's to choose — consent always false, and the kind
  derived from the checklist phase so a 'before' cannot be filed as an 'after'.
  Reads are five-minute signed links from `photo-url`, which is where a client's
  right to see their own proof is granted; Storage itself never lets a client
  in. `missingProof()` stops a clean closing while a photo moment is empty.
- **Roles** — `org_admin` owns the business; `cleaner` works. The app hides the
  Business group (dashboard, client book, hiring, pricing) from a cleaner AND
  the endpoints that create people (`create-client`, `create-staff`,
  `send-invite`) require `isOwnerOfBusiness`, so the menu is not the only thing
  enforcing it. A cleaner's route is narrowed to jobs assigned to them — RLS
  lets staff read every org job because the scheduling calendar needs that, so
  the narrowing lives in the view where the difference matters.
- **Notifications** (`src/lib/push.ts`, `netlify/functions/_shared/notify.ts`) —
  two layers, and the first always works. Every notice is a row in
  `notifications` that its recipient owns (RLS: read your own, mark your own
  read; only staff in the org may write one, so a client cannot forge a notice
  that appears to come from Ahleyia). On top of that, **Web Push** — no
  provider, no per-message cost, and skipped entirely when no VAPID keypair is
  configured. `users.notify_prefs` is a map of opt-outs read by the server
  before it sends; an absent key means send, so a new kind of notice reaches
  people rather than being withheld until they find a toggle. Notice wording
  lives server-side and is unit-tested to carry no amount and no address,
  because a push can sit on a lock screen someone else is holding.
- **Hydration** (`src/app/backend.ts`) — on load, when signed in, the store
  pulls the real identity, card on file, and jobs, and picks the active job id
  that the money-path actions operate on. Falls back to seed data otherwise.
- **Money path → functions** (`src/lib/api.ts`) — the browser only ever sends
  intent; the service-role key stays in the functions:
  - **Save card** — `SquareCardForm` mounts Square's Web Payments field,
    tokenizes in the browser (raw PAN never hits our servers), records consent,
    and posts the single-use token to `save-card` (CREDIT-only enforced there).
  - **Check-in** — the cleaner button reads `navigator.geolocation` and calls
    `checkin`, which recomputes the geofence server-side and does the one capture.
  - **Approve** — the owner button calls `approve` (final 50% release + a
    separate tip charge if present, parsed from the tip label).
  - **Concierge close** — calls `concierge-close`, capturing the sum of non-tip
    line items at close.
- **Data mapping** (`src/lib/data/index.ts`) — PostgREST returns snake_case;
  typed mappers convert to the camelCase domain shapes, and the client-safe
  `PaymentMethod` mapper drops the processor token / consent text (price-privacy).
- **Row mappers, config, phone/tip parsing** are unit-tested
  (`src/lib/integration.test.ts`) alongside the financial core.

**Still on seed data / follow-on wiring** (same pattern, not yet bound):
read-heavy secondary screens (homes list, reports, receipts, messages, schedule)
still render seed data until each is pointed at `getData()`; and the concierge
**expense receipt** needs a Supabase Storage upload to produce the `storageKey`
the `concierge-add-expense` function already requires (server rule is enforced +
tested). End-to-end money verification needs a live Supabase + Square sandbox
(can't be provisioned here).

---

# Go-live checklist (what needs live services)

This sandbox has no Supabase project, Square account, or Netlify site, so the
end-to-end money flow can't be exercised here. The UI wiring above is in place;
what remains is provisioning + credentials:

1. **Supabase**: create a project; run `supabase/migrations/0001_schema.sql`,
   `0002_rls.sql`, then `supabase/seed.sql`. Create a Storage bucket `proof`
   (private; serve via signed, expiring URLs). Email + password auth is on by
   default and is all the app uses. `0005_auth_users.sql` installs the trigger
   that inserts a `users` row on signup.
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
