#!/usr/bin/env python3
"""
Color Create Studio - Shopify collection generator.

Emits:
  - collections_reference.csv : the 16 automated collections + their tag rules
  - COLLECTIONS_SETUP.md       : click-by-click native Shopify setup (no app)

Every product in products_import.csv is tagged with its collection name, so each
collection below is an AUTOMATED (smart) collection with one rule:
    Product tag is equal to "<collection name>"
New products that carry the tag file themselves automatically.
"""

import csv

# (handle, title, tag, body, seo_description)
COLLECTIONS = [
    ("custom-celebration-design", "Custom Celebration Design", "Custom Celebration Design",
     "Personalized designs for life's biggest moments. Custom shirts, signage, party suites, and details for birthdays, graduations, baby showers, reunions, and every milestone worth marking.",
     "Shop custom celebration & party designs by Color Create Studio - personalized shirts, signs & full party suites for birthdays, graduations & milestones."),
    ("custom-event-graphics", "Custom Event Graphics", "Custom Event Graphics",
     "Invitations, flyers, signage, and digital graphics that set the vibe and fill your guest list - designed to match your theme down to the detail.",
     "Custom event graphics by Color Create Studio - invitations, flyers, welcome signs & announcements. Digital, print-ready, or printed & shipped."),
    ("custom-party-favor-designs", "Custom Party Favor Designs", "Custom Party Favor Designs",
     "Make the little things look high-end. Custom labels, wrappers, toppers, and tags that tie your whole party theme together.",
     "Custom party favor designs - chip bag labels, water bottle labels, wrappers, toppers & tags themed to match your party. By Color Create Studio."),
    ("memorial-tribute-design", "Memorial & Tribute Design", "Memorial & Tribute Design",
     "Designed with warmth and respect. Programs, keepsakes, shirts, and tributes that honor a life and comfort everyone who gathers.",
     "Memorial & tribute designs by Color Create Studio - programs, prayer cards, keepsakes & celebration-of-life pieces created with care."),
    ("business-design-services", "Business Design Services", "Business Design Services",
     "Look like a big brand overnight. Flyers, menus, business cards, social templates, and brand graphics for small businesses, creators, and vendors.",
     "Small business design services - flyers, menus, business cards, social templates & brand graphics. Look established overnight. Color Create Studio."),
    ("canva-templates", "Canva Templates", "Canva Templates",
     "Self-editable designs you control. Edit your text, colors, and photos in Canva, then export print-ready - invitations, party favors, business, and creative templates.",
     "Editable Canva templates by Color Create Studio - invitations, party favors, business & creative designs you customize yourself and download instantly."),
    ("digital-print-send", "Digital Print + Send", "Digital Print + Send",
     "Want the finished design without editing it yourself? Get a print-ready file delivered digitally, ready to print at home or anywhere.",
     "Digital print + send designs by Color Create Studio - finished, print-ready files delivered to you. No editing required. Print anywhere."),
    ("print-ship", "Print + Ship", "Print + Ship",
     "Done-for-you and delivered. We print and ship the finished product to your door - shirts, signs, favors, cards, books, and more.",
     "Print + ship products by Color Create Studio - done-for-you shirts, signs, favors, cards & books printed and shipped to your door."),
    ("nova-lai-kids-collection", "Nova Lai Kids Collection", "Nova Lai Kids Collection",
     "The children's branch of Color Create Studio. Screen-free coloring books, activity packs, and personalized creative products kids love.",
     "Nova Lai kids collection - coloring books, activity packs & personalized creative products. Screen-free fun by Color Create Studio."),
    ("childrens-story-books", "Children's Story Books", "Children's Story Books",
     "Emotionally driven stories about imagination, abundance, confidence, and family - plus custom story book writing, illustration, and design services.",
     "Children's story books by Color Create Studio - imagination, abundance & family stories, personalized editions & custom book creation."),
    ("trap-n-chill-adult-collection", "Trap N' Chill Adult Collection", "Trap N' Chill Adult Collection",
     "The adult branch of Color Create Studio. Bold-and-easy coloring books, self-care activities, stickers, and bundles made to help you unwind.",
     "Trap N' Chill adult collection - bold-and-easy coloring & activity books, self-care, stickers & bundles. Unwind and create. Color Create Studio."),
    ("dreamland-manifestation-collection", "Dreamland / Manifestation Collection", "Dreamland / Manifestation Collection",
     "Turn intention into ritual. Manifestation and self-care activity books, journals, affirmation cards, and printables to dream on purpose.",
     "Dreamland manifestation collection - self-care & manifestation activity books, journals, affirmation cards & printables. Color Create Studio."),
    ("journals-workbooks", "Journals & Workbooks", "Journals & Workbooks",
     "Guided journals and workbooks for self-trust, manifestation, confidence, money mindset, and reflection - plus custom journal and workbook design.",
     "Guided journals & workbooks by Color Create Studio - self-trust, manifestation, confidence & money-mindset journals, plus custom designs."),
    ("stickers", "Stickers", "Stickers",
     "Ready-made and custom stickers, sticker sheets, and mystery packs - waterproof, holographic, printable, and print-and-cut options.",
     "Stickers by Color Create Studio - custom & ready-made sticker sheets, waterproof vinyl, holographic & mystery packs. Design or print + ship."),
    ("bundles", "Bundles", "Bundles",
     "More value, one cohesive look. Curated bundles of matching designs and products - party, event, kids, self-care, and business sets.",
     "Design & product bundles by Color Create Studio - party, event, kids, self-care & business sets. More value, one cohesive look."),
    ("custom-book-product-creation", "Custom Book & Product Creation Services", "Custom Book & Product Creation Services",
     "Bring your own book, journal, or digital product to life. Done-for-you writing, illustration, layout, covers, and print-ready files.",
     "Custom book & product creation by Color Create Studio - done-for-you coloring books, journals, workbooks, covers, layout & print-ready files."),
]

SORT = "best-selling"

# ---- Reference CSV -----------------------------------------------------------
cols = ["Handle", "Title", "Body (HTML)", "Collection Type", "Sort Order",
        "Match Rule", "Published", "SEO Title", "SEO Description"]
with open("shopify/collections_reference.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    for handle, title, tag, body, seo in COLLECTIONS:
        w.writerow({
            "Handle": handle, "Title": title,
            "Body (HTML)": f"<p>{body}</p>",
            "Collection Type": "smart (automated)", "Sort Order": SORT,
            "Match Rule": f'Product tag is equal to "{tag}"',
            "Published": "FALSE",
            "SEO Title": f"{title} | Color Create Studio"[:70],
            "SEO Description": seo,
        })

# ---- Setup guide -------------------------------------------------------------
lines = [
    "# Color Create Studio - Collections Setup",
    "",
    "All 16 collections are **automated (smart) collections**. Each one has a single rule:",
    "**Product tag is equal to the collection name.** Because every product in",
    "`products_import.csv` already carries its collection name as a tag, products file",
    "themselves the moment you create the collection - and any new product you add later",
    "with that tag joins automatically.",
    "",
    "## Native Shopify setup (no app needed)",
    "For each collection in the table below:",
    "1. Shopify Admin -> **Products -> Collections -> Create collection**.",
    "2. Enter the **Title** and paste the **Description**.",
    "3. Under **Collection type**, choose **Smart (automated)**.",
    "4. Set **Conditions** to **Product tag** / **is equal to** / the **Tag** value.",
    "5. Set **Sort: " + SORT + "** (optional).",
    "6. Scroll to **Search engine listing** -> **Edit** -> paste the SEO title & description.",
    "7. Leave it **unpublished** until you've reviewed products, then publish.",
    "",
    "> Tip: keep collections unpublished while products are still Draft, then publish",
    "> collections and products together when you're ready to go live.",
    "",
    "## Bulk option (Matrixify / Excelify app)",
    "`collections_reference.csv` lists every field. If you use the Matrixify app, map",
    "these columns to its smart-collection import (Title, Body HTML, Collection Type =",
    "smart, the tag rule, Sort Order, SEO Title, SEO Description). Without the app, use",
    "the native steps above - it takes ~10 minutes for all 16.",
    "",
    "## The 16 collections",
    "",
    "| # | Collection | Tag rule (Product tag = ) | SEO description |",
    "|---|---|---|---|",
]
for i, (handle, title, tag, body, seo) in enumerate(COLLECTIONS, 1):
    lines.append(f"| {i} | **{title}** | `{tag}` | {seo} |")
lines.append("")
lines.append("## Descriptions (paste into each collection)")
lines.append("")
for handle, title, tag, body, seo in COLLECTIONS:
    lines.append(f"### {title}")
    lines.append(f"- **Handle:** `{handle}`")
    lines.append(f"- **Body:** {body}")
    lines.append(f"- **SEO title:** {title} | Color Create Studio")
    lines.append(f"- **SEO description:** {seo}")
    lines.append("")

with open("shopify/COLLECTIONS_SETUP.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Wrote shopify/collections_reference.csv ({len(COLLECTIONS)} collections)")
print("Wrote shopify/COLLECTIONS_SETUP.md")
