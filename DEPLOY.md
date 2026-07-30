# Deploy — Supabase now, Square later

## Current status (live at Netlify)

Done and verified on the deployed site:
- Schema + RLS + seed applied to the live Supabase project; auth→user trigger in
- Admin (org_admin) + client (owner) test accounts, routed by role at sign-in
- Real app presentation (no prototype chrome), responsive phone/tablet/desktop
- Live-bound screens: owner Home (real properties + add-property writes to the
  DB), owner Account (real identity/card, add-card state), admin Clients
  (real org clients + property counts), real sign-out
- Money-path endpoints live in functions (simulated adapter until Square keys)

Also live: **the working checklist** (real `job_steps`, ticked straight into
Postgres), **scheduling** (a real calendar of real jobs, booking through
`book-clean`), **manual property entry** (a home added to a client she already
has), messaging (both directions), quotes (admin sends → client sees and
accepts), receipts, the cleaner route and the business dashboard numbers — see
§7 for the full table.

Still seed/sample content (same pattern when needed): service reports, supplies,
payouts, My Week. Needs your input: Square keys (real payments), a VAPID keypair
for phone notifications (§8 — two commands, free), custom domain (optional).

> **Building the clickable demo:** whether the review switches work is decided
> at BUILD time by whether `VITE_SUPABASE_*` are present — and a local
> `.env.local` counts, so an ordinary `npm run build` on a configured machine
> produces a live app in which `?role=` and `?chrome=` do nothing. That is
> correct for the deployed site. For the reviewable bundle use
> **`npm run build:demo`** (→ `dist-demo/`), which builds with those variables
> cleared.

**The app is not a viewer.** With a backend configured, `?role=cleaner` on the
live URL does nothing — it used to open the working day on seed data with no
sign-in at all. The rule lives in `src/lib/views.ts` and is unit-tested: a
cleaner has one view, a client has one view, the owner has her two real ones,
and signed out you get the public storefront.

**Cleaners are independent contractors, not employees.** A contractor's clients
are theirs: they add their own clientele, their own homes and their own cleans,
and neither Ahleyia nor another contractor can read that book. `managed_by` says
whose book a client or a home is in — `NULL` means the studio's — and Row-Level
Security enforces it, so the app hiding a screen is never the only thing
stopping anyone. Their own bookings and the ones the studio assigns them compete
for the same hours, because it is one person, and that is what drives their
availability.

**Every account is a real account.** Ahleyia adds a cleaner, they claim their
link and get their own working day — their name, their route, their checklist,
their notifications. There is deliberately **no way for a stranger to create a
staff account for themselves**: anyone who could would be inside her business,
able to read client homes and access notes. Her invitation is the authorization.

**Texting is no longer part of signing in.** Everyone — client, cleaner,
business — signs in with an email and a password, and a client Ahleyia added
sets their password on the invite link she sends. Nothing about getting into the
app depends on an SMS provider or costs per message.

This is the runbook to take the app live on **your Supabase project** with
payments deferred. It's written so that adding Square later is just a few env
vars and a redeploy — no code change.

## What works at each stage

| | Supabase only (now) | + Square (later) |
|---|---|---|
| Business/admin sign-in (email + password) | ✅ real | ✅ real |
| Client sign-in (email + password) | ✅ real | ✅ real |
| Data + Row-Level Security (homes, jobs, reports…) | ✅ real | ✅ real |
| Save card on file | ⚠️ simulated² | ✅ real (Square) |
| Check-in capture · approve release · concierge close | ⚠️ simulated² | ✅ real charges |

¹ (was: phone OTP needs an **SMS provider configured in Supabase Auth** (Twilio,
MessageBird, etc.). Until then, use the **email + password** business login to
verify the deploy — it needs no SMS.

² With `SQUARE_ACCESS_TOKEN` unset, the functions use the **mock payment
adapter**: `payment_methods`, `charges`, and `payouts` rows are written with
fake processor refs so the whole flow is exercisable on real data, but **no
money moves**. Don't take real bookings until Square is live.

---

## 1 · Environment variables

**Required now** (get these from your Supabase project → Settings → API):

| Where | Var | Value |
|---|---|---|
| Client (`VITE_*`) | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| Client | `VITE_SUPABASE_ANON_KEY` | the anon/public key |
| Server (Netlify) | `SUPABASE_URL` | same URL |
| Server | `SUPABASE_SERVICE_ROLE_KEY` | the **service-role** key (functions only — never `VITE_`) |

**Deferred (add when you have them):** `VITE_SQUARE_APP_ID`,
`VITE_SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_ENV`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`; then `TWILIO_*` / `RESEND_API_KEY` for
notifications, and `VITE_MAPBOX_TOKEN` for the route map. See `.env.example`.

The config auto-detects: the client card field and the server charge path stay
in simulated mode until both the `VITE_SQUARE_*` and `SQUARE_ACCESS_TOKEN`
values are present.

---

## 2 · Apply the database

**Easiest:** in the Supabase dashboard → **SQL Editor → New query**, paste the
whole of **`supabase/setup.sql`** and click **Run**. That one file is all of the
below concatenated in the right order (verified to apply clean in one shot).

Or run the individual files in order if you prefer:

1. `supabase/migrations/0001_schema.sql`  — tables + types
2. `supabase/migrations/0002_rls.sql`     — Row-Level Security
3. `supabase/migrations/0003_photos.sql`  — photos (marketing_consent default false)
4. `supabase/migrations/0004_concierge.sql` — concierge line items
5. `supabase/migrations/0005_auth_users.sql` — **auth → app user linkage (required)**
6. `supabase/migrations/0006_client_invites.sql` — client invitations
7. `supabase/migrations/0007_sms_consent.sql` — recorded consent to be texted
8. `supabase/migrations/0008_job_steps_phase.sql` — the phase on each checklist step
9. `supabase/migrations/0009_notifications.sql` — notices + push subscriptions
10. `supabase/migrations/0010_contractor_book.sql` — contractor-owned clients, homes and jobs; availability
11. `supabase/seed.sql` — the organization + The Kee Method™ (reference data)

**Already ran `setup.sql` before?** Do **not** re-run it — it would stop at
`type "user_role" already exists`. Run **`supabase/upgrade.sql`** instead: it
contains only the newer parts (invitations, SMS consent, the checklist's phase
columns, notifications, and the contractor ownership model), is safe to run more
than once, and leaves your data untouched.
Verified against a database in exactly that state — applied, then applied again
with no errors.

`0005` installs a trigger so every Supabase Auth signup automatically gets a
`public.users` row (self-signups default to role `owner`, no org). Without it,
a signed-in user has no role/org and sees nothing.

Then create a **Storage bucket** named `proof` (Private) — proof photos are
served only via signed, expiring URLs.

---

## 3 · Create the business/admin account (Ahleyia)

The admin must be `org_admin` in the seeded org
(`00000000-0000-0000-0000-0000000000a1`). Two ways:

**A. Pass role + org in metadata at creation** (cleanest — the `0005` trigger
reads it). Dashboard → Authentication → Add user, or via the Admin API, set the
user's `user_metadata` to:

```json
{ "role": "org_admin", "org_id": "00000000-0000-0000-0000-0000000000a1" }
```

**B. Or fix the row after creating the user** (SQL Editor):

```sql
update public.users
   set role = 'org_admin',
       org_id = '00000000-0000-0000-0000-0000000000a1'
 where email = 'ahleyia@atlluxurycleaning.com';
```

Sign in from the app's **Business sign in** screen with that email + password.

> Connecting a **client (owner) to the business**: a self-signed-up owner starts
> with `org_id = null` (they can sign in and manage their own data, but can't be
> billed until they're in an org). Until the invite flow is a function, link
> them manually:
> ```sql
> update public.users set org_id = '00000000-0000-0000-0000-0000000000a1'
>  where phone = '+1XXXXXXXXXX';
> ```

---

## 4 · Deploy to Netlify

1. **New site from Git** → pick this repo, branch `claude/app-build-fi3f02`
   (or your default once merged). `netlify.toml` already sets the build command
   (`npm run build`), publish dir (`dist`), the functions dir, the `@hourly`
   `auto-release` schedule, the SPA redirect, and the no-cache header on `sw.js`.
2. **Site settings → Environment variables**: add the four required vars from
   step 1 (and any deferred ones you already have).
3. Deploy. The functions are bundled automatically (esbuild).

---

## 5 · Verify

- **Admin login** (email + password) → lands on the business dashboard, loading
  your real org.
- **RLS smoke test**: as a signed-in owner, you only ever see your own homes,
  jobs, reports, and card — never another owner's. (The functions use the
  service-role key and bypass RLS by design; the browser only ever holds the
  anon key.)
- **Money path (simulated)**: with a seeded/created job and a saved (mock) card,
  check-in writes an arrival payout and approve writes the final payout — all
  with mock processor refs. Confirm the rows appear; no real charge occurs.

---

## 6 · When the Square keys arrive

1. Add `VITE_SQUARE_APP_ID`, `VITE_SQUARE_LOCATION_ID` (client) and
   `SQUARE_ACCESS_TOKEN`, `SQUARE_ENV` (`sandbox`|`production`),
   `SQUARE_WEBHOOK_SIGNATURE_KEY` (server) in Netlify.
2. In the Square dashboard, point a webhook at
   `https://YOUR-SITE.netlify.app/.netlify/functions/square-webhook`.
3. Redeploy. The card field now mounts Square's Web Payments SDK, tokenization
   is live, and the capture/release path charges real cards. Test end-to-end in
   **sandbox** first (`SQUARE_ENV=sandbox`) before flipping to `production`.

No application code changes — the switch is entirely env-driven.

---

## 7 · What is live now (Supabase phase complete)

Everything that does not depend on Square is wired to the database. Signed in,
these screens read and write real rows under Row-Level Security; signed out (or
with no backend configured) every screen falls back to the seed showcase, so the
demo never breaks.

| Area | Live behavior |
|---|---|
| Sign-in | Email + password for every role, routed by the real role: `org_admin` → admin dashboard, `cleaner` → route, `owner` → client home. Public sign-up creates a real auth user (three steps, no code to wait for). |
| Sign out | Clears the real Supabase session. |
| Client home | Real properties, real empty state, greets the real account. |
| Add a property | Writes a `properties` row (RLS: `owner_id = auth.uid()`), then refreshes. |
| Client account | Real identity, property list, and card-on-file (incl. "No card yet"). |
| Admin clients | The org's real clients with each one's property count. |
| Messaging | One real thread per client (`thread_key = owner:<id>`), both directions, RLS-scoped. |
| Quotes | Admin writes a real `quotes` row + posts it on the client's thread; the client sees the real amount and accepts by replying. |
| Receipts | Real `charges` rows with an honest empty state. |
| Today's route | The org's real jobs for today (or the next ones up), each opening its own checklist. The seed showcase homes never appear on a live account. |
| The checklist | Real `job_steps` rows, grouped into the Kee Method's phases. Each tick is a `PATCH` under RLS; the first tick moves the job to `in_progress`; "Complete" closes it out. A failed write puts the tick back where it was. A job whose checklist never got built can be repaired from the template in one tap. |
| Booking calendar | Real months (never before the current one), real jobs as dots, the day's real bookings listed, and free two-hour windows computed from what's actually booked. Staff pick the home; the button creates a real job. |
| Owner schedule | The client's real upcoming cleans, with window and price. Reschedule / add / cancel open the real thread with the ask written for them. |
| Add a home for a client | Staff write a `properties` row for an existing client (RLS: their own org only). It's bookable immediately. |
| Business dashboard | Real month, real counts, and a "Needs you" list built from what's actually outstanding — unassigned cleans, unclaimed invitations, open quotes. |
| Views are not interchangeable | On a real deployment the zone comes from the signed-in account and nothing else. `?role=`, `?chrome=` and `?fill=` — the design-review switches that open a zone on seed data with no sign-in — are ignored outright. The account button shows your own account; the only second row it can ever show is Ahleyia's other view of her own account (business / working). |
| Every account is its own | The greeting, avatar initials, profile, settings and role label all come from the signed-in account. A cleaner she hires sees their own name and their own route, never "Ahleyia Kee · Founder". |
| A contractor's own book | Their clients, homes and cleans, in the app alongside the studio's work. `managed_by` (a client, a home) and `created_by` (a clean) record whose it is; RLS gives a contractor their own book plus the client and home of a clean the studio assigned them, and nothing else. Verified against real Postgres: one contractor cannot see another's client, home, clean, internal pricing or time off. |
| Availability | Derived, not typed in twice. Every clean a contractor is on blocks its window — their own client's and the studio's alike — and they can block hours with no job behind them (a day off, another commitment). The calendar shows each window free or busy with the reason, and `book-clean` applies the same rule server-side, so a stale calendar can't put anyone in two homes at once. Ahleyia can see when a contractor is unavailable, because she has to schedule around it, but cannot invent time off on their behalf. |
| A hired cleaner's app | Their own route (jobs assigned to them), their checklist, their notifications and settings. The Business group — dashboard, client book, hiring, pricing, service area — is not in their menu, and `create-client` / `create-staff` / `send-invite` reject a non-admin caller, so hiding the button is not the only thing stopping it. |
| Adding a cleaner | The owner adds them (name + a phone or email); the account is provisioned straight away so she can assign work, and they set their own email and password from a single-use link. Anyone with only the code (a link mangled in a chat app) can paste it on **"I'm a cleaner with an invite"**. |
| Notifications | Real `notifications` rows: a feed per person, unread count, mark-read, and a nudge on Home when something is waiting. Written by the functions (arrival, booking, payout, invite claimed) and by Ahleyia ("on my way", "report ready"). |
| Notification settings | The toggles write `users.notify_prefs` — the same map the server checks before it sends anything. |
| Phone notifications | Web Push, once a VAPID keypair is set (§8). Per device, opt-in, and never required: a notice is a database row first and a phone buzz second. |

### Booking a clean (server-side by design)

`jobs` has no client INSERT policy — scheduling is privileged, so it lives in
`netlify/functions/book-clean.ts`, not the browser. It verifies the caller,
authorizes them against the property (staff in its org, or the property's own
owner), prices the job with the same engine the quote screens use, and
instantiates the Kee Method checklist (26 steps / 4 photo moments for a
turnover) so the cleaner's list exists the moment the job does. **Booking never
charges** — the one capture still happens at geofenced check-in.

The booking calendar's "Book <day>" button calls it. Verified against real
Postgres: a 2-bed turnover prices to $142 and instantiates all 26 steps in
Kee Method order, each stamped with its phase.

### The checklist is enforced at the database, not the UI

`job_steps` has a staff-only write policy, so a client can read their own
checklist (it is their proof) but cannot tick it. Verified against real
Postgres: staff tick a step and move a job's status (1 row each); the job's own
owner attempting both changes **0 rows**; a different client of the same studio
sees no steps, no jobs and no properties at all.

### Every privileged function authenticates its caller

The functions hold the service-role key, which bypasses Row-Level Security, so
each one verifies the caller's Supabase token (`_shared/auth.ts`) and then
authorizes the specific action:

| Function | Who may call it |
|---|---|
| `book-clean` | staff in the property's org, or the property's owner |
| `checkin` (captures the card) | the assigned cleaner, or staff in the org |
| `approve` (releases funds) | the job's owner, or staff in the org |
| `save-card` | only the card's own owner |
| `concierge-add-expense` / `concierge-close` | the assigned cleaner, or staff |

The browser sends its token automatically on every function call. Isolation
rules are unit-tested in `src/lib/authz.test.ts`.

### Bringing her existing clients in

Ahleyia's clients from before the app are added from **Add a client you already
have** (business menu / rail). She fills in what she knows — who they are, the
home, the agreed price and how often — and gets a **one-time link** to send them.

The account and home are created immediately, so she can schedule, price and
message that client straight away. The client opens the link and supplies only
what should be theirs: **their email and a password**. Their **card** is added
afterwards from inside the app, by the same endpoint any client uses — so a card
can only ever be saved by its own owner.

Security of the link: the token is 32 random bytes, stored **only as a SHA-256
hash** (a leaked backup cannot claim anyone's account), **single-use** (claimed
atomically, so two people opening the same link cannot both get through), and it
**expires after 14 days**. She can cancel one by setting `revoked_at`.

### Notifications

Notices reach people in two layers, and the first one always works.

**1. In the app (always on).** Every notice is a row in `notifications` that its
recipient owns. That is the record of record — it survives a missed push, a new
phone, and permission never being granted at all. Each person has a
**Notifications** screen (menu → Notifications, or the card that appears on Home
when something is unread) with a real unread count and mark-as-read.

Who writes them:

| Event | Who hears | Raised by |
|---|---|---|
| A clean is booked for a client | the client | `book-clean` |
| Check-in succeeds | the client: she's arrived | `checkin` |
| Ahleyia taps "on my way" | the client | `notify` (staff action) |
| A clean is closed out | the client: the report is ready | `notify` (staff action) |
| Owner approves | the cleaner: a payout is on its way | `approve` |
| A client claims their invite link | every staff member | `claim-invite` |

`users.notify_prefs` decides what gets sent. It's a small JSON map of
**opt-outs** — a missing key means "send it", so a new kind of notice reaches
people instead of being silently withheld until they find a toggle. The
Notifications section of Settings writes it, and the server reads the same map
before sending anything.

**Nothing in a notice carries an amount or an address.** A push payload is
delivered by a third-party push service and can sit on the lock screen of a
phone somebody else is holding, so the wording lives server-side in
`netlify/functions/_shared/notify.ts` and is unit-tested for it. The browser
picks a `kind`, never the text — otherwise the endpoint would be a way to put
arbitrary words on a client's lock screen under Ahleyia's name.

**2. On the phone (Web Push — optional, free, no provider).** The browser's own
push service delivers it. The only credential is a VAPID keypair you generate
once:

```bash
npx web-push generate-vapid-keys
```

Set in Netlify:

| Var | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the public key it printed |
| `VAPID_PRIVATE_KEY` | the private key it printed |
| `VAPID_SUBJECT` | `mailto:ahleyia@atlluxurycleaning.com` |

With none of these set, the app never offers to turn phone notifications on and
notices stay in-app. Nothing breaks.

Each person turns it on per device on the Notifications screen. **On iPhone, push
only works once the app is on the home screen** — the app detects that and says
so rather than firing a permission prompt that can never succeed. A subscription
the push service reports as gone (404/410) is deleted automatically, so a stale
device doesn't fail forever.

### Text messages (Twilio) — optional, and not part of signing in

Signing in never involves a text. The only thing Twilio adds is the app being
able to text an invitation link or an arrival notice **in addition** to the
notification above. Set these in Netlify to enable it:

| Var | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | your account SID |
| `TWILIO_AUTH_TOKEN` | your auth token |
| `TWILIO_MESSAGING_SERVICE_SID` | preferred — handles sender selection |
| `TWILIO_FROM` | or a single sending number instead |

With none of these set, sending is a **no-op** that reports `not_configured`, and
"text it to them" hands off to Ahleyia's own Messages app so she is never
blocked. There is deliberately no "send arbitrary text" endpoint — the recipient
and wording are always resolved server-side.

**Consent is enforced, not assumed.** `users.sms_consent` is recorded with a
timestamp when Ahleyia ticks that the client agreed, and `sms_opted_out` (a STOP
reply) **always** overrides consent. Every message carries "Reply STOP to opt
out". Before texting US numbers at any volume you also need **A2P 10DLC brand +
campaign registration** in the Twilio console — unregistered traffic gets
filtered.

### Still needs your input

1. **Square keys** — payments run on the mock adapter until then (see §6). Real
   DB rows are written with mock processor refs; **no money moves**.
2. **VAPID keypair** (two commands, free, no provider) so notices also reach
   phones. Without it they're in-app only, which still works.
3. **Custom domain** (optional) — Netlify → Domain settings.
