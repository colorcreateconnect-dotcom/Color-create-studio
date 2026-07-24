# Color Create Studio — Shopify theme kit

A bespoke Shopify (Online Store 2.0) theme that reproduces the Color Create Studio look —
cream canvas, pink→purple gradient, gold + sage/blush accents, DM Serif Display / Montserrat /
Inter, your hero collage, portfolio strip, and the Photo Integrity Promise footer. Native Shopify:
real cart + checkout, no Netlify.

## Install (upload the zip)
1. Package a zip of **the contents of this folder** (folders `assets/ config/ layout/ locales/
   sections/ snippets/ templates/` must sit at the **root** of the zip, not inside a parent folder).
2. Shopify admin → **Online Store → Themes → Add theme → Upload zip file** → choose the zip.
3. It uploads as an **unpublished** theme. Click **Customize** to preview / **Actions → Preview**.
4. When you love it: **Actions → Publish**.

Nothing goes live until you publish — your current theme stays put.

## What's set up out of the box
- **Homepage**: hero + tagline, featured collections (Customs, Bundles, Sweet Beginnings,
  The Function), portfolio strip, "how it works," and a custom-project CTA. Every section is
  editable in **Customize** (drag, edit text, swap images).
- **Header**: logo (uses `assets/logo.jpg`, or set your own in Customize → Header), menu (uses your
  store's **main menu**), "Start a Project" button, cart.
- **Product / collection / cart / search / 404 / blog / account** pages, all branded.
- **Contact template**: a "Start a Project" page — create a Page, assign the **Contact** template.

## After publishing — to actually sell
1. **Settings → Payments** — activate a payment provider (Shopify Payments).
2. **Online Store → Preferences** — remove the store password.
3. Set your **navigation** (Online Store → Navigation) — the header/footer use your menus.

## Notes
- The custom celebration/quote flow (deep configurators, running totals) is not a native Shopify
  page — that continues through the **quote → draft order** path (`SHOPIFY-SETUP.md`). The theme's
  "Start a Project" links currently point to the Customs collection; repoint them to your quote/
  contact page in Customize when it's ready.
- Colors, fonts, and section content are all editable without code (Customize + section settings).
