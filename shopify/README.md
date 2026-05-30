# Shopify Product Import — Color Create Studio

This folder generates a **Shopify-ready product import CSV** for the full catalog,
consolidated into variant-based products (so each offer keeps its own SEO page, but
format/edition duplicates collapse into variants).

## Files
- `generate_products_csv.py` — the catalog + CSV generator (edit prices/copy here)
- `products_import.csv` — the file you upload to Shopify
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

## To regenerate after edits
```bash
python3 generate_products_csv.py
```

## Notes / next steps
- **Images** aren't included (CSV has empty `Image Src`). Add product photos after import,
  or add image URLs to the generator if you host them somewhere.
- Prices are a starting ladder — see `PRICING_GUIDE.md` for the reasoning before changing.
- Want me to also generate **collection definitions**, **SEO descriptions** for every
  product, or **image alt text**? Just ask.
