# Shopify Product Import — Color Create Studio

This folder generates a **Shopify-ready product import CSV** for the full catalog,
consolidated into variant-based products (so each offer keeps its own SEO page, but
format/edition duplicates collapse into variants).

## Files
- `generate_products_csv.py` — the catalog + CSV generator (edit prices/copy here)
- `products_import.csv` — the file you upload to Shopify (products, variants, SEO, alt text)
- `seo_reference.csv` — one row per product: SEO title, meta description, image alt text
- `generate_collections.py` — builds the collection files below
- `collections_reference.csv` — the 16 collections + their automated tag rules
- `COLLECTIONS_SETUP.md` — click-by-click native Shopify collection setup (no app)
- `PRICING_GUIDE.md` — pricing strategy & rationale

## What's inside the CSV
- **303 products / 536 variants** across all 16 product collections
- Consolidation examples:
  - *Custom Birthday Shirt* = one product, **Format** variant (Design File / Print + Ship)
  - Books = one product, **Edition** variant (Digital / Print + Ship / Premium Handmade),
    with **Handedness** (Left/Right) on adult coloring books
  - Fulfillment items = one product, **Delivery** variant (Digital + Send / Print + Ship)
- Collections are stored as **tags** so you can build automated (tag-based) collections.
- Everything is **Status = draft / Published = FALSE** — nothing goes live until you review.

## How to import
1. Shopify Admin → **Products** → **Import**.
2. Upload `products_import.csv`. Choose to **publish later** (they're drafts anyway).
3. Review products, add images, then **set to Active** when ready.
4. Build collections: Products → Collections → New → **Automated** → "Product tag is equal to"
   the collection name (e.g., `Memorial & Tribute Design`).

## Collections
All 16 collections are **automated (smart)** collections keyed off the collection-name tag
each product already carries. See `COLLECTIONS_SETUP.md` for native setup (≈10 min, no app).
New products with the tag join their collection automatically.

## SEO & image alt text
- Every product imports with an **SEO title** and **meta description** already filled in.
- **Image alt text** is generated per product (in `products_import.csv` and `seo_reference.csv`).
  Shopify only applies alt text to an image, so when you upload your product photos/mockups in
  the admin, paste the matching alt text from `seo_reference.csv` (or re-import once you have
  hosted image URLs to add to the `Image Src` column).

## To regenerate after edits
```bash
python3 generate_products_csv.py     # products + seo_reference
python3 generate_collections.py      # collections + setup guide
```

## Notes
- **Images** aren't included yet (empty `Image Src`). Add photos/mockups after import.
- Prices are a deliberate ladder — see `PRICING_GUIDE.md` before changing.
