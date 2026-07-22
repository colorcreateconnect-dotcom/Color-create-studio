# Color Create Connect Creator Studio v3.6.1

## Latest collection, storefront, and Sports routing package

This is the Netlify-ready source project matching the current Creator Studio experience, including:

- Homepage collection doors with dedicated collection hubs
- Direct homepage routing from SHOW UP LOUD to Sports Social Studio
- Creator Studio visual styling across Sports
- Individual custom shirts and individual custom-item checkout
- Paper Lane firm-price ordering
- Celebration Suites beginning at two distinct item types
- Five-chapter custom-project inquiry with collection preselection
- Approved-team DTF and sublimation graphic-code checkout
- Approved-team 3D shirts priced $10 below new personalized 3D shirts
- DTF back options included and sublimation backs adding $15 once per shirt
- Sports Player Pride, Team Identity, keepsakes, and fourteen-shirt roster bundles
- Server-validated pricing and checkout configuration
- Netlify Functions for uploads, quotes, pricing, and Stripe Checkout
- Netlify Blobs persistence for orders, quotes, and uploads

Read `NETLIFY-SETUP.md` before deployment.

## Local development

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The AppDeploy backend source remains in `backend/` for audit reference. Netlify runs `netlify/functions/api.ts`, which imports `backend/pricing.ts` for server-side price validation.
