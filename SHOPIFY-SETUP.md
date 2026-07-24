# Shopify Draft Orders — setup (Step 1 of moving off Stripe + Netlify)

This connects the website's **quote form** to your Shopify store: every quote submitted
online creates a **Draft Order** in **Shopify → Orders → Drafts**, carrying the full project
brief. You review it, set the real price, and hit **Send invoice** — the customer pays through
**Shopify** (Shopify Payments / Apple Pay / Shop Pay), Shopify calculates tax, and you get the
order-paid email automatically. No Stripe, no Netlify in that payment path.

Basic plan note: Shopify Functions (custom pricing at checkout) are Plus-only, so custom/variable
work goes through **draft orders** — which are available on every plan and are exactly the right
tool for "quote, then owner approves and invoices."

---

## What you need to do once (about 5 minutes)

### 1. Create a custom app in Shopify
1. Shopify admin → **Settings** → **Apps and sales channels** → **Develop apps**.
2. If prompted, click **Allow custom app development**.
3. **Create an app** → name it e.g. `Website Quotes` → **Create app**.

### 2. Give it draft-order permission
1. On the app → **Configuration** → **Admin API integration** → **Configure**.
2. Under **Admin API access scopes**, check:
   - `write_draft_orders`
   - `read_draft_orders`
3. **Save**.

### 3. Install and copy the token
1. App → **API credentials** → **Install app** → **Install**.
2. Under **Admin API access token**, click **Reveal token once** and copy it.
   It looks like `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
   You can only see it once — store it safely.

### 4. Set the environment variables
Wherever the `/api/quote-draft` function runs (today: **Netlify → Site configuration →
Environment variables**), add:

| Variable | Value |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | `v0rx6u-nk.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | the `shpat_...` token from step 3 |
| `SHOPIFY_API_VERSION` | `2025-10` *(optional; this is the default)* |

> Use the **`.myshopify.com`** domain above, **not** `colorcreatestudio.com`. The Admin API
> only answers on the myshopify domain. (Your public storefront stays on
> colorcreatestudio.com — this is just the API address.)

Redeploy after saving. That's it — quotes now land in Shopify.

---

## How it behaves

- **Nothing set yet?** The site works exactly as before. The `/api/quote-draft` call returns
  `{ configured: false }` and is ignored — the quote still submits, stores, and confirms. So you
  can set the variables whenever you're ready with zero risk.
- **Once set:** submitting a quote creates a draft order with:
  - the customer's **email**,
  - the **full brief** in the order **Notes**,
  - structured fields (event type, service, needed-by, budget, fulfillment, phone) in
    **Additional details**,
  - **tags** `website`, `quote`, and a service tag (e.g. `celebration-suite`) so you can filter.
- **Price:** an open quote comes in as a **$0 placeholder line** ("Custom Project Inquiry — …").
  *You* set the real price on the draft before sending the invoice. That's the correct flow for
  custom work — the customer never sees a wrong auto-price.
- **Prices are never trusted from the browser.** When the priced-cart path is turned on later,
  the function recomputes every line with the audited `backend/pricing.ts` engine server-side.

---

## Try it

1. Set the three variables and redeploy.
2. Submit a test quote on the live site (or the preview).
3. Open **Shopify → Orders → Drafts** — your quote is there.
4. Open it → set the price → **Send invoice** to see the Shopify checkout the customer receives.

There is already one **sample** draft in there (`#D20`, tagged `SAMPLE`, DTF Team Bundle $300)
created during setup — safe to delete anytime.

---

## Where this is going (the rest of the migration)

This is **Step 1**. The remaining pieces to fully retire Stripe + Netlify:

1. **Cart / buy-now → draft orders too.** The same `/api/quote-draft` function already accepts a
   priced `items` array and runs your bundle/paper/per-size math through `priceCart`. Flipping the
   cart's **Continue to secure checkout** button to use it (instead of Stripe) makes every order —
   fixed-price *and* custom — flow through Shopify. (One small frontend change; not done yet so we
   don't touch the audited checkout without your go-ahead.)
2. **Move the storefront onto Shopify hosting** (a Shopify theme, or keep this React app and point
   it at Shopify for data) so Netlify can be dropped entirely. This is the larger, separate piece.
3. **Turn on Shopify Payments + Tax** and verify Apple Pay on `colorcreatestudio.com`.

When those are done, Stripe and Netlify are both out of the loop.

---

## The one small "backend" that remains

Option A keeps a single tiny function (`netlify/functions/shopify-draft.ts`) — it holds the Admin
token (which must never be exposed in the browser) and calls Shopify. It's written as a standard
Web `Request → Response` handler, so when the storefront moves off Netlify it drops into a
**Cloudflare Worker** (free tier) or **Vercel** function unchanged — only the three environment
variables move with it.
