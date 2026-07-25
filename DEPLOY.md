# Deploy — Supabase now, Square later

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

In the Supabase dashboard → **SQL Editor**, run these files in order (paste each
file's contents and Run):

1. `supabase/migrations/0001_schema.sql`  — tables + types
2. `supabase/migrations/0002_rls.sql`     — Row-Level Security
3. `supabase/migrations/0003_photos.sql`  — photos (marketing_consent default false)
4. `supabase/migrations/0004_concierge.sql` — concierge line items
5. `supabase/migrations/0005_auth_users.sql` — **auth → app user linkage (required)**
6. `supabase/seed.sql` — the organization + The Kee Method™ (reference data)

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
