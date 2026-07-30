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
payouts, My Week. Needs your input: Square keys (real payments), an SMS provider
in Supabase Auth (client phone OTP), custom domain (optional).

This is the runbook to take the app live on **your Supabase project** with
payments deferred. It's written so that adding Square later is just a few env
vars and a redeploy — no code change.

## What works at each stage

| | Supabase only (now) | + Square (later) |
|---|---|---|
| Business/admin sign-in (email + password) | ✅ real | ✅ real |
| Client sign-in (phone OTP) | ✅ real¹ | ✅ real |
| Data + Row-Level Security (homes, jobs, reports…) | ✅ real | ✅ real |
| Save card on file | ⚠️ simulated² | ✅ real (Square) |
| Check-in capture · approve release · concierge close | ⚠️ simulated² | ✅ real charges |

¹ Phone OTP needs an **SMS provider configured in Supabase Auth** (Twilio,
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
9. `supabase/seed.sql` — the organization + The Kee Method™ (reference data)

**Already ran `setup.sql` before?** Do **not** re-run it — it would stop at
`type "user_role" already exists`. Run **`supabase/upgrade.sql`** instead: it
contains only the newer parts (invitations, SMS consent, and the checklist's
phase columns), is safe to run more than once, and leaves your data untouched.
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
| Sign-in | Email + password (business) routes by real role: `org_admin` → admin dashboard, `cleaner` → route, `owner` → client home. Phone OTP works once an SMS provider is enabled in Supabase Auth. |
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

### Text messages (Twilio)

Two independent things, both optional:

**1. Client phone-code sign-in** — no code involved. Supabase → Authentication →
Sign In / Providers → **Phone**, set the SMS provider to Twilio and paste your
Account SID, Auth Token, and a Messaging Service SID (or a Verify Service SID —
Verify manages the codes and expiry for you). The app's phone login starts
working immediately; no redeploy.

**2. The app texting people** — set these in Netlify:

| Var | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | your account SID |
| `TWILIO_AUTH_TOKEN` | your auth token |
| `TWILIO_MESSAGING_SERVICE_SID` | preferred — handles sender selection |
| `TWILIO_FROM` | or a single sending number instead |

With none of these set, sending is a **no-op** that reports `not_configured` —
notifications can never break a booking or a payment.

What gets sent, each triggered by a real event (there is deliberately no
"send arbitrary text" endpoint — the recipient and wording are always resolved
server-side):

| Event | Who hears |
|---|---|
| She sends an invitation | the client gets their link |
| Check-in succeeds | the owner: she's arrived, and the one charge went through |
| Card declined at check-in | the owner: nothing was charged, how to fix it |
| Owner approves | the cleaner: final released (and the tip, separately) |
| 48h auto-release | both sides |

**Consent is enforced, not assumed.** `users.sms_consent` is recorded with a
timestamp when Ahleyia ticks that the client agreed, and `sms_opted_out` (a STOP
reply) **always** overrides consent. Every message carries "Reply STOP to opt
out". Before texting US numbers at any volume you also need **A2P 10DLC brand +
campaign registration** in the Twilio console — unregistered traffic gets
filtered.

### Still needs your input

1. **Square keys** — payments run on the mock adapter until then (see §6). Real
   DB rows are written with mock processor refs; **no money moves**.
2. **SMS provider** in Supabase Auth for client phone-code login.
3. **Custom domain** (optional) — Netlify → Domain settings.
