#!/usr/bin/env python3
"""
Color Create Studio - Shopify Product Import CSV generator.

Consolidates the catalog into variant-based products (Format / Edition /
Handedness) instead of duplicate listings, prices across an affordable->premium
ladder, and emits a Shopify-compatible product import CSV.

Everything is generated as Status=draft / Published=FALSE so nothing goes live
until the owner reviews and publishes. Collections are encoded as tags so the
owner can build automated (tag-based) collections after import.
"""

import csv
import re

VENDOR = "Color Create Studio"


def _strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def _meta(plain, limit=158):
    """Trim a plain-text string into a clean SEO meta description."""
    if len(plain) <= limit:
        return plain
    return plain[:limit].rsplit(" ", 1)[0].rstrip(".,;:-") + "..."

# Shopify product import header (standard columns).
HEADER = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type",
    "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker",
    "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description", "Status",
]

rows = []
seo_ref = []  # one entry per product, for the SEO reference export
_sku_seen = set()


def _body(pitch, bullets=None, vak=None):
    html = f"<p>{pitch}</p>"
    if bullets:
        html += "<ul>" + "".join(f"<li>{b}</li>" for b in bullets) + "</ul>"
    if vak:
        html += f"<p><em>{vak}</em></p>"
    return html


def add(handle, title, body, ptype, tags, collection,
        option_names, variants, vendor=VENDOR, seo_title=None, seo_desc=None):
    """
    variants: list of (values_tuple, price, requires_shipping, grams)
    option_names: list of 1-3 option names matching values_tuple length
    """
    all_tags = list(tags) + [collection, ptype]
    tag_str = ", ".join(dict.fromkeys(all_tags))  # de-dupe, keep order
    seo_title = (seo_title or f"{title} | Color Create Studio")[:70]
    if not seo_desc:
        seo_desc = _meta(_strip_html(body))
    # Image alt text: descriptive, accessibility- and SEO-friendly.
    alt_text = _meta(f"{title} - {ptype.lower()} by Color Create Studio", 125)
    seo_ref.append({
        "Handle": handle, "Title": title, "Collection": collection,
        "SEO Title": seo_title, "SEO Description": seo_desc,
        "Image Alt Text": alt_text,
    })
    first = True
    for i, (values, price, ship, grams) in enumerate(variants, start=1):
        base = handle.upper().replace("-", "")[:14]
        sku = f"{base}-{i:02d}"
        while sku in _sku_seen:
            sku += "X"
        _sku_seen.add(sku)
        row = {c: "" for c in HEADER}
        if first:
            row.update({
                "Handle": handle, "Title": title, "Body (HTML)": body,
                "Vendor": vendor, "Type": ptype, "Tags": tag_str,
                "Published": "FALSE", "SEO Title": seo_title,
                "SEO Description": seo_desc, "Image Alt Text": alt_text,
                "Status": "draft",
            })
            first = False
        else:
            row.update({"Handle": handle, "Published": "FALSE", "Status": "draft"})
        for j, oname in enumerate(option_names, start=1):
            row[f"Option{j} Name"] = oname
            row[f"Option{j} Value"] = values[j - 1]
        row.update({
            "Variant SKU": sku, "Variant Grams": str(grams),
            "Variant Inventory Tracker": "", "Variant Inventory Qty": "",
            "Variant Inventory Policy": "continue",
            "Variant Fulfillment Service": "manual",
            "Variant Price": f"{price:.2f}", "Variant Requires Shipping":
            "TRUE" if ship else "FALSE", "Variant Taxable": "TRUE",
            "Gift Card": "FALSE",
        })
        rows.append(row)


# ---- Reusable variant ladders -------------------------------------------------

def design_print(handle, title, pitch, tags, collection, design=35, ship=55,
                 vak=None, bullets=None, vendor=VENDOR):
    add(handle, title, _body(pitch, bullets, vak), "Custom Design Service",
        tags, collection, ["Format"],
        [(("Design File Only (You Print)",), design, False, 0),
         (("Printed Shirt + Shipping",), ship, True, 200)], vendor=vendor)


def book_editions(handle, title, pitch, tags, collection, vendor=VENDOR,
                  digital=9, ship=22, premium=49, vak=None, bullets=None,
                  ptype="Handmade Physical Product", handed=False):
    if handed:
        opts = ["Edition", "Handedness"]
        variants = [
            (("Digital Download", "Standard"), digital, False, 0),
            (("Print + Ship", "Right-Handed"), ship, True, 350),
            (("Print + Ship", "Left-Handed"), ship, True, 350),
            (("Premium Handmade", "Right-Handed"), premium, True, 450),
            (("Premium Handmade", "Left-Handed"), premium, True, 450),
        ]
    else:
        opts = ["Edition"]
        variants = [
            (("Digital Download",), digital, False, 0),
            (("Print + Ship",), ship, True, 350),
            (("Premium Handmade",), premium, True, 450),
        ]
    add(handle, title, _body(pitch, bullets, vak), ptype, tags, collection,
        opts, variants, vendor=vendor)


def simple(handle, title, pitch, ptype, tags, collection, price, ship=False,
           grams=0, option=("Type", "Standard"), vak=None, bullets=None,
           vendor=VENDOR):
    add(handle, title, _body(pitch, bullets, vak), ptype, tags, collection,
        [option[0]], [((option[1],), price, ship, grams)], vendor=vendor)


def delivery_product(handle, title, pitch, ptype, tags, collection,
                     digital=12, printready=22, printship=38, vak=None,
                     bullets=None, vendor=VENDOR):
    add(handle, title, _body(pitch, bullets, vak), ptype, tags, collection,
        ["Delivery"],
        [(("Digital Download",), digital, False, 0),
         (("Print-Ready File",), printready, False, 0),
         (("Print + Ship",), printship, True, 150)], vendor=vendor)


def custom_design(handle, title, pitch, tags, collection, template=25,
                  bespoke=45, bespoke_ship=62, vak=None, bullets=None,
                  vendor=VENDOR, ptype="Custom Design Service"):
    """Three service levels:
    - Studio Template Edit: I personalize a Canva template + send within 24 hrs (low end)
    - Bespoke Custom Design (Digital): fully curated, built for that person
    - Bespoke Custom Design + Print/Ship: bespoke design printed & shipped
    """
    add(handle, title, _body(pitch, bullets, vak), ptype, tags, collection,
        ["Service Level"],
        [(("Studio Template Edit - Digital (24-hr)",), template, False, 0),
         (("Bespoke Custom Design - Digital",), bespoke, False, 0),
         (("Bespoke Custom Design - Print + Ship",), bespoke_ship, True, 150)],
        vendor=vendor)


# =============================================================================
# 1. CUSTOM CELEBRATION DESIGN
# =============================================================================
C1 = "Custom Celebration Design"
add("custom-celebration-design-package", "Custom Celebration Design Package",
    _body("Two ways to level up your celebration. The PREMIUM SUITE adds a coordinated set of statement pieces on top of your party - think a custom shirt, a welcome sign, and treat-table accents that tie the whole theme together. The FULL PARTY EXPERIENCE is the party: banners, backdrops, signage, favors, stickers, and keepsakes - the entire array, designed from a blank page as one cohesive world built around your story.",
          vak="Picture the room, hear the gasps, feel the moment land - we design every touchpoint to hit."),
    "Bundle", ["celebration", "event", "package", "custom", "suite"], C1,
    ["Package"],
    [(("Premium Suite - Party Accents",), 295, True, 400),
     (("Full Party Experience - The Works",), 750, True, 1200)])

shirt_occasions = [
    ("custom-birthday-shirt", "Custom Birthday Shirt", "birthday"),
    ("custom-memorial-shirt", "Custom Memorial Shirt", "memorial"),
    ("custom-graduation-shirt", "Custom Graduation Shirt", "graduation"),
    ("custom-family-reunion-shirt", "Custom Family Reunion Shirt", "family reunion"),
    ("custom-baby-shower-shirt", "Custom Baby Shower Shirt", "baby shower"),
    ("custom-couple-matching-family-shirt", "Custom Couple / Matching Family Shirt", "matching"),
    ("custom-business-promo-shirt", "Custom Business Promo Shirt", "business"),
    ("custom-event-merch-shirt", "Custom Event Merch Shirt", "event merch"),
    ("custom-group-trip-shirt", "Custom Group Trip Shirt", "group trip"),
    ("custom-kids-birthday-shirt", "Custom Kids Birthday Shirt", "kids birthday"),
    ("custom-cancer-survivor-shirt", "Custom Cancer Survivor Celebration Shirt", "survivor"),
    ("custom-photo-collage-shirt", "Custom Photo Collage Shirt", "photo collage"),
]
for h, t, tag in shirt_occasions:
    design_print(h, t,
                 f"A {tag} shirt that turns heads and tells your story. Custom-built around your names, colors, and theme - with meaning worked into every element, not pulled off a template. Printed on premium DTF for full-color, crack-resistant results.",
                 ["shirt", "apparel", tag, "custom", "dtf"], C1, design=25, ship=35,
                 vak="Bold visuals that pop in photos, a message people read out loud, a design you feel proud to wear.")

# Vinyl + DTF are file-format flavors of custom apparel -> one product, variants
add("custom-shirt-file-format", "Custom DTF / Transfer-Ready Shirt File",
    _body("Production-ready shirt artwork built to press. Get a full-color DTF/transfer-ready file - color-corrected and sized to go straight to production - or a layered vinyl-ready cut file. DTF is our go-to for vivid, durable, full-color prints.",
          vak="Crisp edges your eyes love, a clean transfer you can feel, zero guesswork at the press."),
    "Print-Ready File", ["shirt", "dtf", "vinyl", "transfer", "file"], C1,
    ["File Type"],
    [(("DTF / Full-Color Transfer File",), 38, False, 0),
     (("Vinyl-Ready Cut File",), 38, False, 0)])

simple("custom-apparel-design-consultation", "Custom Apparel Design Consultation",
       "Not sure where to start? Book a focused session and we map your concept, colors, placement, and production plan before a single pixel is drawn.",
       "Consultation", ["consultation", "apparel", "strategy"], C1, 65,
       option=("Session", "30 Minutes"))

# =============================================================================
# 2. CUSTOM EVENT GRAPHICS
# =============================================================================
C2 = "Custom Event Graphics"
event_graphics = [
    ("custom-invitation-design", "Custom Invitation Design", "invitation", "A first impression people screenshot. A custom invite designed around your theme, colors, and wording."),
    ("custom-birthday-invitation", "Custom Birthday Invitation", "birthday invitation", "Set the whole vibe before the party starts with a birthday invite that matches your theme perfectly."),
    ("custom-baby-shower-invitation", "Custom Baby Shower Invitation", "baby shower invitation", "Soft, sweet, and unmistakably yours - a baby shower invite that feels like a warm hug."),
    ("custom-graduation-invitation", "Custom Graduation Invitation", "graduation invitation", "Celebrate the milestone in style with a polished, photo-ready graduation invite."),
    ("custom-memorial-invitation", "Custom Memorial / Celebration of Life Invitation", "memorial invitation", "A graceful, dignified invitation that honors a life with warmth and respect."),
    ("custom-digital-party-flyer", "Custom Digital Party Flyer", "party flyer", "A scroll-stopping flyer built to share, save, and fill your guest list."),
    ("custom-business-event-flyer", "Custom Business Event Flyer", "business flyer", "Promote your event like a pro with a flyer that looks expensive and converts."),
    ("custom-social-event-announcement", "Custom Social Media Event Announcement", "social announcement", "A platform-ready announcement graphic sized for the feed and built to drive RSVPs."),
    ("custom-welcome-sign", "Custom Welcome Sign Design", "welcome sign", "Greet every guest with a statement welcome sign that anchors your decor."),
    ("custom-table-sign", "Custom Table Sign Design", "table sign", "Tie the tablescape together with coordinated signage."),
    ("custom-menu-card", "Custom Menu Card Design", "menu card", "Elevated menu cards that make the spread feel like an event."),
    ("custom-thank-you-card-event", "Custom Thank-You Card Design", "thank you card", "Send guests home remembered with a matching thank-you card."),
    ("custom-itinerary-card", "Custom Itinerary Card Design", "itinerary", "Keep the day flowing with a beautiful at-a-glance itinerary."),
    ("custom-party-game-card", "Custom Party Game Card Design", "party game", "Custom game cards that get the whole room laughing and playing."),
    ("custom-milestone-board", "Custom Milestone Board Design", "milestone board", "A keepsake board that tells the story from day one to today."),
    ("custom-birthday-board", "Custom Birthday Board Design", "birthday board", "A statement birthday board built for the photo wall."),
    ("custom-graduation-board", "Custom Graduation Board Design", "graduation board", "Showcase the journey with a proud, photo-ready graduation board."),
    ("custom-photo-collage-poster", "Custom Photo Collage Poster", "photo collage", "Your favorite memories, arranged into one striking poster."),
    ("custom-event-poster", "Custom Event Poster", "event poster", "A bold, large-format poster that markets your event everywhere it hangs."),
    ("custom-digital-backdrop", "Custom Digital Backdrop Design", "backdrop", "A custom step-and-repeat or themed backdrop for an unforgettable photo moment."),
]
for h, t, tag, pitch in event_graphics:
    custom_design(h, t, pitch, ["event", "graphics", tag, "custom"], C2,
                  template=22, bespoke=45, bespoke_ship=62,
                  vak="Vivid color that reads across the room, wording that sounds great out loud, details guests reach out to touch.")

simple("custom-printable-event-bundle", "Custom Printable Event Bundle",
       "Every printable your event needs in one coordinated, money-saving bundle - invites, signs, menus, favors, and more, all matching.",
       "Bundle", ["event", "printable", "bundle"], C2, 165,
       option=("Bundle", "Full Event Set"),
       vak="One cohesive look your guests see, talk about, and remember.")

# =============================================================================
# 3. CUSTOM PARTY FAVOR DESIGNS
# =============================================================================
C3 = "Custom Party Favor Designs"
simple("custom-party-favor-design-package", "Custom Party Favor Design Package",
       "A fully matching set of favor designs - labels, wrappers, toppers, and tags - built around one theme so every little detail ties together.",
       "Custom Design Service", ["party favor", "package", "custom"], C3, 145,
       option=("Package", "Full Favor Suite"))

favor_items = [
    ("custom-chip-bag-label", "Custom Chip Bag Label Design", "chip bag"),
    ("custom-water-bottle-label", "Custom Water Bottle Label Design", "water bottle label"),
    ("custom-juice-pouch-label", "Custom Juice Pouch Label Design", "juice pouch"),
    ("custom-candy-bar-wrapper", "Custom Candy Bar Wrapper Design", "candy wrapper"),
    ("custom-treat-bag-topper", "Custom Treat Bag Topper Design", "treat bag topper"),
    ("custom-favor-tag", "Custom Favor Tag Design", "favor tag"),
    ("custom-sticker-label", "Custom Sticker Label Design", "sticker label"),
    ("custom-cake-topper", "Custom Cake Topper Design", "cake topper"),
    ("custom-cupcake-topper", "Custom Cupcake Topper Design", "cupcake topper"),
    ("custom-favor-box-label", "Custom Favor Box Label Design", "favor box"),
    ("custom-thank-you-sticker", "Custom Thank-You Sticker Design", "thank you sticker"),
]
for h, t, tag in favor_items:
    custom_design(h, t,
                  f"A {tag} design that makes the little things look high-end. Themed to match your party perfectly.",
                  ["party favor", tag, "custom"], C3,
                  template=15, bespoke=30, bespoke_ship=42,
                  vak="Tiny details with big visual punch - the touches guests pick up, read, and keep.")

simple("custom-party-activity-sheet", "Custom Party Activity Sheet",
       "A themed activity sheet that keeps guests busy and entertained - personalized to your event.",
       "Digital Download", ["party", "activity"], C3, 10,
       option=("Delivery", "Digital Download"))
simple("custom-kids-party-coloring-page", "Custom Kids Party Coloring Page",
       "A custom coloring page matched to your party theme - the easy win that keeps little hands happy.",
       "Digital Download", ["party", "kids", "coloring"], C3, 8,
       option=("Delivery", "Digital Download"))
simple("custom-party-favor-assembly", "Custom Party Favor Assembly Add-On",
       "Let us assemble your favors for you - printed, cut, and put together so they arrive ready to hand out.",
       "Add-On", ["party favor", "assembly", "add-on"], C3, 35, ship=True, grams=100,
       option=("Add-On", "Assembly Service"))
simple("custom-full-party-favor-bundle", "Custom Full Party Favor Bundle",
       "Every favor design you need, bundled and discounted - all matching, all yours.",
       "Bundle", ["party favor", "bundle"], C3, 125,
       option=("Bundle", "Full Set"))

# =============================================================================
# 4. MEMORIAL & TRIBUTE DESIGN
# =============================================================================
C4 = "Memorial & Tribute Design"
simple("custom-memorial-design-package", "Custom Memorial Design Package",
       "A complete, coordinated memorial suite handled with care - program, cards, signage, and keepsakes designed to honor a life beautifully.",
       "Custom Design Service", ["memorial", "tribute", "package"], C4, 285,
       option=("Package", "Full Memorial Suite"),
       vak="Dignified imagery, words that comfort when read aloud, keepsakes loved ones can hold.")

memorial_items = [
    ("memorial-shirt", "Memorial Shirt Design", "memorial shirt"),
    ("celebration-of-life-flyer", "Celebration of Life Flyer", "celebration of life"),
    ("memorial-program", "Memorial Program Design", "memorial program"),
    ("memorial-prayer-card", "Memorial Prayer Card Design", "prayer card"),
    ("memorial-thank-you-card", "Memorial Thank-You Card Design", "thank you card"),
    ("memorial-photo-collage-poster", "Memorial Photo Collage Poster", "photo collage"),
    ("memorial-candle-label", "Memorial Candle Label Design", "candle label"),
    ("memorial-favor-tag", "Memorial Favor Tag Design", "favor tag"),
    ("memorial-keepsake-card", "Memorial Keepsake Card Design", "keepsake"),
    ("custom-tribute-illustration", "Custom Tribute Illustration", "tribute illustration"),
]
for h, t, tag in memorial_items:
    custom_design(h, t,
                  f"A {tag} created with warmth and respect to honor your loved one and comfort everyone who gathers.",
                  ["memorial", "tribute", tag], C4,
                  template=24, bespoke=46, bespoke_ship=62)

simple("memorial-social-announcement", "Memorial Social Media Announcement",
       "A graceful announcement graphic to share service details with family and friends online.",
       "Digital Download", ["memorial", "social"], C4, 14,
       option=("Delivery", "Digital Download"))
simple("memorial-remembrance-coloring-page", "Custom Remembrance Coloring Page",
       "A gentle coloring page that gives children - and adults - a quiet way to remember and process.",
       "Digital Download", ["memorial", "coloring"], C4, 8,
       option=("Delivery", "Digital Download"))

# =============================================================================
# 5. BUSINESS DESIGN SERVICES
# =============================================================================
C5 = "Business Design Services"
simple("small-business-design-starter-pack", "Small Business Design Starter Pack",
       "Everything a new brand needs to look established overnight - flyer, business card, social templates, and a thank-you card, all matching your brand.",
       "Bundle", ["business", "starter", "branding"], C5, 195,
       option=("Package", "Starter Pack"),
       vak="A look that says professional at a glance, a message that sounds confident, assets you can put to work today.")

biz_items = [
    ("custom-business-flyer", "Custom Business Flyer", "flyer"),
    ("custom-price-list", "Custom Price List Design", "price list"),
    ("custom-service-menu", "Custom Service Menu Design", "service menu"),
    ("custom-product-menu", "Custom Product Menu Design", "product menu"),
    ("custom-business-thank-you-card", "Custom Thank-You Card Design", "thank you card"),
    ("custom-business-card", "Custom Business Card Design", "business card"),
    ("custom-product-launch-graphic", "Custom Product Launch Graphic", "product launch"),
    ("custom-testimonial-graphic", "Custom Testimonial Graphic", "testimonial"),
    ("custom-brand-announcement-graphic", "Custom Brand Announcement Graphic", "announcement"),
    ("custom-product-mockup", "Custom Product Mockup Design", "mockup"),
    ("custom-packaging-label", "Custom Packaging Label Design", "packaging"),
    ("custom-digital-product-cover", "Custom Digital Product Cover Design", "cover"),
    ("custom-ebook-workbook-cover", "Custom E-book / Workbook Cover Design", "ebook cover"),
]
for h, t, tag in biz_items:
    custom_design(h, t,
                  f"A polished {tag} that makes your small business look like a big brand - on time and on point.",
                  ["business", tag], C5,
                  template=24, bespoke=45, bespoke_ship=60)

add("custom-instagram-templates", "Custom Instagram Post & Story Templates",
    _body("Branded, editable Instagram templates so your feed and stories stay consistent and on-brand without starting from scratch every time.",
          vak="A scroll-stopping look your audience sees, a voice they recognize, a system you can reuse."),
    "Canva Editable Template", ["business", "instagram", "template", "social"], C5,
    ["Set"],
    [(("Post Template Set",), 18, False, 0),
     (("Story Template Set",), 18, False, 0),
     (("Post + Story Bundle",), 30, False, 0)])

simple("custom-canva-business-template", "Custom Canva Business Template",
       "A fully editable, on-brand Canva template built for your business so you can update and reuse it anytime.",
       "Canva Editable Template", ["business", "canva", "template"], C5, 22,
       option=("Delivery", "Canva Link"))
simple("custom-brand-graphic-mini-pack", "Custom Brand Graphic Mini Pack",
       "A small, mighty set of matching brand graphics to refresh your socials fast.",
       "Bundle", ["business", "branding", "bundle"], C5, 75,
       option=("Pack", "Mini Pack"))
simple("social-media-visual-refresh", "Social Media Visual Refresh Package",
       "A full refresh of your social presence - cohesive templates, highlight covers, and post graphics that make your brand look brand new.",
       "Bundle", ["business", "social", "refresh"], C5, 165,
       option=("Package", "Full Refresh"))

# =============================================================================
# 6. CANVA TEMPLATES (editable, digital)
# =============================================================================
C6 = "Canva Templates"
canva_templates = [
    ("canva-invitation-template", "Editable Canva Invitation Template", "invitation"),
    ("canva-birthday-invitation-template", "Editable Canva Birthday Invitation Template", "birthday"),
    ("canva-baby-shower-invitation-template", "Editable Canva Baby Shower Invitation Template", "baby shower"),
    ("canva-graduation-invitation-template", "Editable Canva Graduation Invitation Template", "graduation"),
    ("canva-memorial-flyer-template", "Editable Canva Memorial Flyer Template", "memorial"),
    ("canva-party-flyer-template", "Editable Canva Party Flyer Template", "party flyer"),
    ("canva-welcome-sign-template", "Editable Canva Welcome Sign Template", "welcome sign"),
    ("canva-thank-you-card-template", "Editable Canva Thank-You Card Template", "thank you card"),
    ("canva-favor-tag-template", "Editable Canva Favor Tag Template", "favor tag"),
    ("canva-party-game-template", "Editable Canva Party Game Template", "party game"),
    ("canva-itinerary-template", "Editable Canva Itinerary Template", "itinerary"),
    ("canva-menu-card-template", "Editable Canva Menu Card Template", "menu card"),
    ("canva-birthday-board-template", "Editable Canva Birthday Board Template", "birthday board"),
    ("canva-milestone-board-template", "Editable Canva Milestone Board Template", "milestone board"),
    ("canva-graduation-board-template", "Editable Canva Graduation Board Template", "graduation board"),
    ("canva-chip-bag-template", "Editable Canva Chip Bag Template", "chip bag"),
    ("canva-water-bottle-label-template", "Editable Canva Water Bottle Label Template", "water bottle"),
    ("canva-juice-pouch-label-template", "Editable Canva Juice Pouch Label Template", "juice pouch"),
    ("canva-candy-wrapper-template", "Editable Canva Candy Wrapper Template", "candy wrapper"),
    ("canva-treat-bag-topper-template", "Editable Canva Treat Bag Topper Template", "treat topper"),
    ("canva-sticker-label-template", "Editable Canva Sticker Label Template", "sticker label"),
    ("canva-cake-topper-template", "Editable Canva Cake Topper Template", "cake topper"),
    ("canva-cupcake-topper-template", "Editable Canva Cupcake Topper Template", "cupcake topper"),
    ("canva-price-list-template", "Editable Canva Price List Template", "price list"),
    ("canva-service-menu-template", "Editable Canva Service Menu Template", "service menu"),
    ("canva-product-menu-template", "Editable Canva Product Menu Template", "product menu"),
    ("canva-business-flyer-template", "Editable Canva Business Flyer Template", "business flyer"),
    ("canva-instagram-post-template", "Editable Canva Instagram Post Template", "instagram post"),
    ("canva-instagram-story-template", "Editable Canva Instagram Story Template", "instagram story"),
    ("canva-product-launch-template", "Editable Canva Product Launch Template", "product launch"),
    ("canva-testimonial-template", "Editable Canva Testimonial Template", "testimonial"),
    ("canva-coloring-page-template", "Editable Canva Coloring Page Template", "coloring page"),
    ("canva-activity-page-template", "Editable Canva Activity Page Template", "activity page"),
    ("canva-journal-page-template", "Editable Canva Journal Page Template", "journal page"),
    ("canva-planner-page-template", "Editable Canva Planner Page Template", "planner page"),
    ("canva-affirmation-card-template", "Editable Canva Affirmation Card Template", "affirmation card"),
    ("canva-sticker-sheet-template", "Editable Canva Sticker Sheet Template", "sticker sheet"),
    ("canva-workbook-template", "Editable Canva Workbook Template", "workbook"),
]
for h, t, tag in canva_templates:
    simple(h, t,
           f"A fully editable {tag} Canva template - swap your text, colors, and photos in minutes and export print-ready. Instant download, edit forever.",
           "Canva Editable Template", ["canva", "template", tag, "editable"], C6,
           12, option=("Delivery", "Canva Link"),
           vak="See it come together instantly, follow simple prompts, drag and drop until it feels like yours.")

# Canva bundles
for h, t, price, tag in [
    ("canva-party-favor-bundle-template", "Editable Canva Party Favor Bundle Template", 35, "party favor"),
    ("canva-business-starter-bundle-template", "Editable Canva Business Starter Template Bundle", 39, "business"),
    ("canva-digital-product-bundle-template", "Editable Canva Digital Product Template Bundle", 39, "digital product"),
]:
    simple(h, t,
           f"A money-saving bundle of editable {tag} Canva templates - everything matching, everything reusable.",
           "Canva Editable Template", ["canva", "template", "bundle", tag], C6,
           price, option=("Delivery", "Canva Link"))

# =============================================================================
# 7 + 8. DIGITAL PRINT + SEND  /  PRINT + SHIP  (merged via Delivery variants)
# =============================================================================
C7 = "Digital Print + Send"
C8 = "Print + Ship"
# These two collections are mostly the same items at different delivery levels.
# Consolidate each item into one product with Digital + Send / Print + Ship.
fulfill_items = [
    ("fulfill-invitation-set", "Invitation Set", "invitation", 12, 32),
    ("fulfill-thank-you-cards", "Thank-You Cards", "thank you card", 10, 28),
    ("fulfill-welcome-sign", "Welcome Sign", "welcome sign", 14, 38),
    ("fulfill-party-signs", "Party Signs", "party sign", 14, 36),
    ("fulfill-party-game-cards", "Party Game Cards", "party game", 9, 26),
    ("fulfill-favor-tags", "Favor Tags", "favor tag", 8, 24),
    ("fulfill-sticker-labels", "Sticker Labels", "sticker label", 8, 24),
    ("fulfill-party-favor-labels", "Party Favor Labels", "favor label", 9, 26),
    ("fulfill-chip-bag-labels", "Chip Bag Labels", "chip bag", 9, 26),
    ("fulfill-water-bottle-labels", "Water Bottle Labels", "water bottle", 9, 26),
    ("fulfill-juice-pouch-labels", "Juice Pouch Labels", "juice pouch", 9, 26),
    ("fulfill-candy-wrappers", "Candy Wrappers", "candy wrapper", 9, 26),
    ("fulfill-custom-posters", "Custom Posters", "poster", 14, 40),
    ("fulfill-memorial-cards", "Memorial Cards", "memorial card", 12, 32),
    ("fulfill-business-cards", "Business Cards", "business card", 12, 34),
    ("fulfill-business-flyers", "Business Flyers", "business flyer", 12, 34),
    ("fulfill-stickers", "Stickers", "sticker", 6, 18),
    ("fulfill-sticker-sheets", "Sticker Sheets", "sticker sheet", 8, 22),
    ("fulfill-shirts", "Custom Shirts", "shirt", 25, 35),
    ("fulfill-handmade-books", "Handmade Books", "handmade book", 18, 45),
    ("fulfill-journals", "Journals", "journal", 16, 38),
    ("fulfill-coloring-books", "Coloring Books", "coloring book", 14, 32),
    ("fulfill-activity-books", "Activity Books", "activity book", 14, 32),
]
for h, name, tag, digital, ship in fulfill_items:
    add(h, name, _body(
        f"Your {tag}, your way. Get the finished design delivered digitally to print yourself, or let us print and ship the done-for-you product straight to your door.",
        vak="Sharp, ready-to-print visuals, clear delivery options, a product you can hold and hand out."),
        "Print + Ship Product",
        ["fulfillment", "print", "ship", "Digital Print + Send", tag], C8,
        ["Delivery"],
        [(("Digital Print + Send",), digital, False, 0),
         (("Print + Ship",), ship, True, 250)])

# Bundle-style fulfillment products kept separate (higher value)
simple("digital-printable-bundle-send", "Digital Printable Bundle + Send",
       "A full set of coordinated printables delivered digitally - print at home, print anywhere.",
       "Bundle", ["digital", "printable", "bundle"], C7, 45,
       option=("Delivery", "Digital + Send"))
simple("print-ship-event-bundle", "Print + Ship Event Bundle",
       "The whole event, printed and shipped to you - invites, signs, favors, and more, done for you.",
       "Bundle", ["print", "ship", "event", "bundle"], C8, 145, ship=True, grams=600,
       option=("Bundle", "Full Event"))
simple("print-ship-creative-bundle", "Print + Ship Creative Bundle",
       "A mix of our handmade creative products, printed, bound, and shipped ready to enjoy or gift.",
       "Bundle", ["print", "ship", "creative", "bundle"], C8, 65, ship=True, grams=500,
       option=("Bundle", "Creative Set"))

# =============================================================================
# 9. NOVA LAI KIDS COLLECTION
# =============================================================================
NL = "Nova Lai"
C9 = "Nova Lai Kids Collection"
book_editions("nova-lai-sweet-squad-starter-pack", "Nova Lai Sweet Squad Starter Pack",
              "The sweetest way to meet the Nova Lai world - a starter pack of coloring, activities, and characters kids fall in love with.",
              ["nova lai", "kids", "starter", "coloring"], C9, vendor=NL,
              digital=10, ship=24, premium=42,
              vak="Bright candy colors to see, playful prompts to read together, hands-on pages they can't put down.")
nova_books = [
    ("nova-lai-sweet-treats-coloring-book", "Nova Lai Sweet Treats Coloring Book", "coloring book"),
    ("nova-lai-sweet-treats-activity-pack", "Nova Lai Sweet Treats Activity Pack", "activity pack"),
    ("the-fun-files-activity-book", "The Fun Files Activity Book", "activity book"),
    ("word-on-the-street-activity-book", "Word on the Street Activity Book", "activity book"),
    ("snack-attack-activity-book", "Snack Attack Activity Book", "activity book"),
]
for h, t, tag in nova_books:
    book_editions(h, t,
                  f"A Nova Lai {tag} packed with screen-free fun - bold, easy, and made to keep kids creating for hours.",
                  ["nova lai", "kids", tag], C9, vendor=NL,
                  digital=9, ship=22, premium=39)

# Custom kids pages -> consolidate digital/print
for h, t, tag in [
    ("custom-kids-coloring-page", "Custom Kids Coloring Page", "coloring page"),
    ("custom-kids-activity-sheet", "Custom Kids Activity Sheet", "activity sheet"),
    ("personalized-name-coloring-page", "Personalized Name Coloring Page", "name page"),
]:
    add(h, t, _body(
        f"A personalized {tag} made just for your child - their name, their theme, their imagination.",
        vak="Their name in big bold letters, a story you read together, pages they color with their own hands."),
        "Personalized Product", ["nova lai", "kids", "custom", tag], C9,
        ["Delivery"],
        [(("Digital Download",), 8, False, 0),
         (("Print + Ship",), 22, True, 200)], vendor=NL)

for h, t, tag, price in [
    ("custom-kids-birthday-activity-pack", "Custom Kids Birthday Activity Pack", "birthday", 18),
    ("custom-classroom-activity-pack", "Custom Classroom Activity Pack", "classroom", 22),
    ("custom-homeschool-activity-pack", "Custom Homeschool Activity Pack", "homeschool", 22),
    ("custom-screen-free-activity-bundle", "Custom Screen-Free Activity Bundle", "screen-free", 28),
]:
    simple(h, t,
           f"A custom {tag} activity pack designed to keep kids engaged, learning, and away from screens.",
           "Digital Download", ["nova lai", "kids", tag], C9, price,
           option=("Delivery", "Digital Download"), vendor=NL)

book_editions("personalized-kids-coloring-book", "Personalized Kids Coloring Book",
              "A whole coloring book starring your child - personalized pages they'll be obsessed with.",
              ["nova lai", "kids", "personalized", "coloring"], C9, vendor=NL,
              digital=14, ship=30, premium=48,
              ptype="Personalized Product")
book_editions("top-bound-kids-activity-book", "Top-Bound Kids Activity Book",
              "A premium top-bound activity book built for little hands and big imaginations.",
              ["nova lai", "kids", "activity"], C9, vendor=NL,
              digital=12, ship=28, premium=45)

# =============================================================================
# 10. CHILDREN'S STORY BOOKS
# =============================================================================
C10 = "Children's Story Books"
book_editions("my-imagination-is-mia", "My Imagination Is M.I.A.",
              "A heartfelt story that reignites a child's imagination when it goes missing - a modern classic about creativity and wonder.",
              ["story book", "imagination", "children"], C10,
              digital=12, ship=28, premium=52,
              vak="Rich illustrations to gaze at, a rhythm made for reading aloud, a story kids feel in their chest.")
book_editions("the-river-of-plenty", "The River of Plenty",
              "A beautiful tale of abundance and gratitude that teaches children there is always more than enough.",
              ["story book", "abundance", "gratitude", "children"], C10,
              digital=12, ship=28, premium=52,
              vak="Lush riverside art, a soothing read-aloud cadence, a lesson kids carry with them.")
book_editions("personalized-childrens-story-book", "Personalized Children's Story Book",
              "Make your child the hero of their own story - personalized name, look, and adventure in a keepsake book.",
              ["story book", "personalized", "children"], C10,
              digital=18, ship=42, premium=75, ptype="Personalized Product",
              vak="Their face on the page, their name in the story, a book they hold long after bedtime.")

# Children's book CREATION services (high-end suites)
story_services = [
    ("custom-childrens-story-writing", "Custom Children's Story Book Writing Package", "writing", 450),
    ("custom-childrens-story-illustration", "Custom Children's Story Book Illustration Package", "illustration", 650),
    ("custom-childrens-story-design-layout", "Custom Children's Story Book Design + Layout", "layout", 350),
    ("childrens-book-cover-design", "Children's Book Cover Design", "cover", 165),
    ("childrens-book-interior-formatting", "Children's Book Interior Formatting", "formatting", 145),
    ("childrens-story-character-sheet", "Children's Story Book Character Sheet", "character", 95),
    ("childrens-story-scene-reference", "Children's Story Book Scene Reference Package", "scene", 145),
]
for h, t, tag, price in story_services:
    simple(h, t,
           f"Professional children's book {tag} - we bring your story to life with craft, heart, and publish-ready quality.",
           "Custom Design Service", ["story book", "custom", "service", tag], C10,
           price, option=("Service", "Custom Project"))

for h, t, tag, price in [
    ("childrens-story-companion-activity", "Children's Story Book Companion Activity Pack", "activity", 12),
    ("childrens-story-coloring-add-on", "Children's Story Book Coloring Page Add-On", "coloring", 8),
    ("childrens-story-worksheet-add-on", "Children's Story Book Printable Worksheet Add-On", "worksheet", 8),
]:
    simple(h, t, f"A {tag} companion that extends the story off the page.",
           "Digital Download", ["story book", tag, "add-on"], C10, price,
           option=("Delivery", "Digital Download"))

for h, t, tag, price in [
    ("father-daughter-story-collection", "Father-Daughter Story Book Collection", "father-daughter", 95),
    ("abundance-gratitude-story-collection", "Abundance & Gratitude Story Book Collection", "abundance", 95),
    ("imagination-creativity-story-collection", "Imagination & Creativity Story Book Collection", "imagination", 95),
    ("custom-bedtime-story-gift-book", "Custom Bedtime Story Gift Book", "bedtime gift", 65),
]:
    simple(h, t,
           f"A {tag} story collection made to be treasured, gifted, and read again and again.",
           "Bundle", ["story book", "collection", tag], C10, price, ship=True,
           grams=700, option=("Edition", "Gift Collection"))

# =============================================================================
# 11. TRAP N' CHILL ADULT COLLECTION
# =============================================================================
TC = "Trap N' Chill"
C11 = "Trap N' Chill Adult Collection"
tnc_books = [
    ("trap-n-chill-coloring-activity-book", "Trap N' Chill Coloring & Activity Book", "coloring & activity"),
    ("beauty-glam-coloring-activity-book", "Beauty & Glam Coloring & Activity Book", "beauty & glam"),
    ("sweet-treats-adult-coloring-book", "Sweet Treats Adult Coloring & Activity Book", "sweet treats"),
    ("zaza-and-chill-activity-pack", "ZaZa and Chill Activity Pack", "zaza & chill"),
    ("midnight-munchies-coloring-book", "Midnight Munchies Coloring & Activity Book", "midnight munchies"),
    ("sentence-enhancers-activity-book", "Sentence Enhancers Adult Activity Book", "sentence enhancers"),
]
for h, t, tag in tnc_books:
    book_editions(h, t,
                  f"Trap N' Chill {tag} - bold-and-easy adult coloring and activities made to help you unwind, laugh, and vibe.",
                  ["trap n chill", "adult", "coloring", tag], C11, vendor=TC,
                  digital=12, ship=26, premium=49, handed=True,
                  vak="High-contrast art easy on the eyes, a relaxed mood you can almost hear, big open spaces your hands love to fill.")

# Trap N' Chill add-on style products
for h, t, tag, price, ptype, ship, grams in [
    ("trap-n-chill-sticker-sheet", "Trap N' Chill Sticker Sheet", "sticker", 8, "Print + Ship Product", True, 30),
    ("trap-n-chill-mystery-sticker-pack", "Trap N' Chill Mystery Sticker Pack", "mystery sticker", 12, "Print + Ship Product", True, 50),
    ("trap-n-chill-affirmation-cards", "Trap N' Chill Affirmation Cards", "affirmation", 18, "Print + Ship Product", True, 120),
    ("trap-n-chill-printable-ritual-pack", "Trap N' Chill Printable Ritual Pack", "ritual", 14, "Digital Download", False, 0),
]:
    simple(h, t,
           f"A Trap N' Chill {tag} pack to add to your self-care lineup - good vibes, bold design.",
           ptype, ["trap n chill", "adult", tag], C11, price, ship=ship, grams=grams,
           option=("Type", "Standard"), vendor=TC)

# Trap N' Chill bundles
for h, t, tag, price in [
    ("trap-n-chill-girls-night-bundle", "Trap N' Chill Girls Night In Bundle", "girls night", 55),
    ("trap-n-chill-baddie-bundle", "Trap N' Chill Baddie Bundle", "baddie", 55),
    ("trap-n-chill-self-care-bundle", "Trap N' Chill Self-Care Bundle", "self-care", 49),
    ("trap-n-chill-coloring-party-pack", "Trap N' Chill Coloring Party Pack", "coloring party", 65),
    ("trap-n-chill-digital-starter-pack", "Trap N' Chill Digital Starter Pack", "digital starter", 29),
    ("trap-n-chill-premium-gift-bundle", "Trap N' Chill Premium Gift Bundle", "premium gift", 95),
]:
    ship = "digital" not in tag
    simple(h, t,
           f"The Trap N' Chill {tag} bundle - everything you need to relax, create, and treat yourself, all in one.",
           "Bundle", ["trap n chill", "adult", "bundle", tag], C11, price,
           ship=ship, grams=400 if ship else 0, option=("Bundle", "Full Set"),
           vendor=TC)

# =============================================================================
# 12. DREAMLAND / MANIFESTATION COLLECTION
# =============================================================================
DL = "Dreamland"
C12 = "Dreamland / Manifestation Collection"
book_editions("dreamland-self-care-manifestation-book", "Dreamland Self-Care & Manifestation Activity Book",
              "Dream it, write it, color it into being - a self-care and manifestation activity book that turns intention into ritual.",
              ["dreamland", "manifestation", "self-care", "activity"], C12, vendor=DL,
              digital=14, ship=30, premium=52, handed=True,
              vak="Dreamy visuals to focus on, affirmations made to say aloud, pages you physically fill with your future.")
book_editions("made-you-wish-manifestation-book", "Made You Wish Manifestation Activity Book",
              "A playful, powerful manifestation activity book that makes wishing on purpose a daily habit.",
              ["dreamland", "manifestation", "activity"], C12, vendor=DL,
              digital=14, ship=30, premium=52, handed=True)
book_editions("be-you-creatively-journal", "Be-You-Creatively Self-Care Discovery Journal",
              "A guided discovery journal that helps you reconnect with who you are through creativity and self-care.",
              ["dreamland", "journal", "self-care"], C12, vendor=DL,
              digital=14, ship=30, premium=52)
book_editions("the-golden-loop-reflection-journal", "The Golden Loop Reflection Journal",
              "A reflection journal built on a simple golden loop - notice, reflect, grow - day after day.",
              ["dreamland", "journal", "reflection"], C12, vendor=DL,
              digital=14, ship=30, premium=52)

for h, t, tag, price, ptype, ship, grams in [
    ("dreamland-printable-pages", "Dreamland Printable Pages", "printable", 12, "Digital Download", False, 0),
    ("dreamland-affirmation-cards", "Dreamland Affirmation Cards", "affirmation", 18, "Print + Ship Product", True, 120),
    ("dreamland-soft-life-bingo", "Dreamland Soft Life Bingo Printable", "bingo", 9, "Digital Download", False, 0),
    ("dreamland-self-care-worksheet-pack", "Dreamland Self-Care Worksheet Pack", "worksheet", 12, "Digital Download", False, 0),
    ("dreamland-manifestation-activity-pack", "Dreamland Manifestation Activity Pack", "activity", 14, "Digital Download", False, 0),
    ("dreamland-sticker-sheet", "Dreamland Sticker Sheet", "sticker", 8, "Print + Ship Product", True, 30),
]:
    simple(h, t, f"A Dreamland {tag} to keep your manifestation practice flowing.",
           ptype, ["dreamland", "manifestation", tag], C12, price, ship=ship,
           grams=grams, option=("Type", "Standard"), vendor=DL)

for h, t, tag, price in [
    ("dreamland-gift-bundle", "Dreamland Gift Bundle", "gift", 65),
    ("dreamland-trilogy-bundle", "Dreamland Trilogy Bundle", "trilogy", 95),
    ("dreamland-manifestation-bundle", "Dreamland Manifestation Bundle", "manifestation", 75),
]:
    simple(h, t, f"The Dreamland {tag} bundle - a complete manifestation experience, beautifully boxed in value.",
           "Bundle", ["dreamland", "bundle", tag], C12, price, ship=True, grams=600,
           option=("Bundle", "Full Set"), vendor=DL)

# =============================================================================
# 13. JOURNALS & WORKBOOKS
# =============================================================================
C13 = "Journals & Workbooks"
journals = [
    ("she-is-me-i-am-her-journal", "She Is Me, I Am Her Journal", "identity"),
    ("30-day-self-trust-journal", "30-Day Self-Trust Journal", "self-trust"),
    ("30-day-manifestation-journal", "30-Day Manifestation Journal", "manifestation"),
    ("self-worth-journal", "Self-Worth Journal", "self-worth"),
    ("confidence-journal", "Confidence Journal", "confidence"),
    ("money-mindset-journal", "Money Mindset Journal", "money mindset"),
    ("boundary-era-journal", "Boundary Era Journal", "boundaries"),
    ("main-character-money-journal", "Main Character Money Journal", "money"),
]
for h, t, tag in journals:
    book_editions(h, t,
                  f"A guided {tag} journal that turns daily pages into real change - prompts that push, space that frees.",
                  ["journal", "self-development", tag], C13,
                  digital=12, ship=28, premium=45,
                  vak="A cover you're proud to display, prompts that sound like a coach, pages you fill in your own hand.")

for h, t, tag, price in [
    ("emergency-mindset-reset-pages", "Emergency Mindset Reset Pages", "reset", 9),
    ("alter-ego-file-printable", "Alter Ego File Printable", "alter ego", 9),
    ("3-daily-wins-printable", "3 Daily Wins Printable", "daily wins", 7),
    ("weekly-self-care-reflection-pages", "Weekly Self-Care Reflection Pages", "reflection", 9),
    ("printable-journal-page-pack", "Printable Journal Page Pack", "journal pack", 12),
]:
    simple(h, t, f"A printable {tag} pack you can use again and again - instant download, lifetime use.",
           "Digital Download", ["journal", "printable", tag], C13, price,
           option=("Delivery", "Digital Download"))

# Custom journal/workbook services
for h, t, tag, price in [
    ("custom-guided-journal-design", "Custom Guided Journal Design", "guided journal", 425),
    ("custom-workbook-design", "Custom Workbook Design", "workbook", 450),
    ("custom-journal-template", "Custom Journal Template", "template", 59),
]:
    simple(h, t, f"A done-for-you custom {tag} - designed around your brand, voice, and method.",
           "Custom Design Service", ["journal", "custom", tag], C13, price,
           option=("Service", "Custom Project"))

# =============================================================================
# 14. STICKERS
# =============================================================================
C14 = "Stickers"
for h, t, tag in [
    ("custom-sticker-design", "Custom Sticker Design", "custom sticker"),
    ("custom-name-sticker-sheet", "Custom Name Sticker Sheet", "name sticker"),
    ("custom-party-sticker-labels", "Custom Party Sticker Labels", "party sticker"),
    ("custom-business-sticker-labels", "Custom Business Sticker Labels", "business sticker"),
    ("custom-product-label-stickers", "Custom Product Label Stickers", "product label"),
]:
    add(h, t, _body(
        f"A {tag} designed to your theme and printed how you want it - digital file, print-ready, or peel-and-stick shipped to you.",
        vak="Colors that pop on any surface, a design people point out, a finish you can feel."),
        "Custom Design Service", ["sticker", tag, "custom"], C14,
        ["Delivery"],
        [(("Digital File",), 14, False, 0),
         (("Print-Ready File",), 22, False, 0),
         (("Print + Ship",), 34, True, 60)])

for h, t, tag, price, ship, grams in [
    ("waterproof-vinyl-stickers", "Waterproof Vinyl Stickers", "waterproof vinyl", 12, True, 40),
    ("holographic-sticker-sheet", "Holographic Sticker Sheet", "holographic", 14, True, 40),
    ("mystery-sticker-pack", "Mystery Sticker Pack", "mystery", 12, True, 50),
    ("nova-lai-sticker-sheet", "Nova Lai Sticker Sheet", "nova lai", 8, True, 30),
    ("zaza-dollz-sticker-sheet", "ZaZa Dollz Sticker Sheet", "zaza dollz", 9, True, 30),
    ("printable-sticker-sheet", "Printable Sticker Sheet", "printable", 6, False, 0),
]:
    simple(h, t, f"A {tag} sticker sheet built to stick, shine, and show off your style.",
           "Print + Ship Product" if ship else "Digital Download",
           ["sticker", tag], C14, price, ship=ship, grams=grams,
           option=("Type", "Standard"))

simple("bundle-add-on-sticker-pack", "Bundle Add-On Sticker Pack",
       "Add a coordinating sticker pack to any order at a bundle-friendly price.",
       "Add-On", ["sticker", "add-on", "bundle"], C14, 7, ship=True, grams=30,
       option=("Add-On", "Sticker Pack"))

# =============================================================================
# 15. BUNDLES
# =============================================================================
C15 = "Bundles"
bundles = [
    ("kids-creative-bundle", "Kids Creative Bundle", "kids creative", 45, NL),
    ("nova-lai-birthday-bundle", "Nova Lai Birthday Bundle", "nova lai birthday", 39, NL),
    ("nova-lai-screen-free-bundle", "Nova Lai Screen-Free Activity Bundle", "screen-free", 35, NL),
    ("nova-lai-story-activity-bundle", "Nova Lai Story + Activity Bundle", "story + activity", 42, NL),
    ("nova-lai-coloring-sticker-bundle", "Nova Lai Coloring + Sticker Bundle", "coloring + sticker", 35, NL),
    ("custom-party-bundle", "Custom Party Bundle", "party", 95, VENDOR),
    ("custom-event-design-bundle", "Custom Event Design Bundle", "event", 120, VENDOR),
    ("custom-memorial-bundle", "Custom Memorial Bundle", "memorial", 110, VENDOR),
    ("business-starter-design-bundle", "Business Starter Design Bundle", "business starter", 145, VENDOR),
    ("canva-template-bundle", "Canva Template Bundle", "canva", 49, VENDOR),
    ("digital-printable-bundle", "Digital Printable Bundle", "digital printable", 39, VENDOR),
    ("handmade-book-sticker-bundle", "Handmade Book + Sticker Bundle", "book + sticker", 55, VENDOR),
    ("mystery-creative-bundle", "Mystery Creative Bundle", "mystery", 35, VENDOR),
]
for h, t, tag, price, vendor in bundles:
    ship = "canva" not in tag and "digital" not in tag
    simple(h, t,
           f"The {tag} bundle - more value, one cohesive look, everything that goes together in a single offer.",
           "Bundle", ["bundle", tag], C15, price, ship=ship,
           grams=500 if ship else 0, option=("Bundle", "Full Set"), vendor=vendor)

# =============================================================================
# 16. CUSTOM BOOK & PRODUCT CREATION SERVICES (high-end suites)
# =============================================================================
C16 = "Custom Book & Product Creation Services"
creation_services = [
    ("custom-coloring-book-design", "Custom Coloring Book Design", "coloring book", 450),
    ("custom-kids-coloring-book-design", "Custom Kids Coloring Book Design", "kids coloring book", 450),
    ("custom-adult-coloring-book-design", "Custom Adult Coloring Book Design", "adult coloring book", 525),
    ("custom-activity-book-design", "Custom Activity Book Design", "activity book", 525),
    ("custom-journal-design-service", "Custom Journal Design", "journal", 425),
    ("custom-workbook-design-service", "Custom Workbook Design", "workbook", 450),
    ("custom-printable-pack-design", "Custom Printable Pack Design", "printable pack", 195),
    ("custom-digital-product-design", "Custom Digital Product Design", "digital product", 245),
    ("custom-book-cover-design", "Custom Book Cover Design", "book cover", 165),
    ("custom-book-interior-layout", "Custom Book Interior Layout", "interior layout", 195),
    ("custom-book-mockup-design", "Custom Book Mockup Design", "mockup", 65),
    ("custom-canva-book-template", "Custom Canva Book Template", "canva book", 95),
]
for h, t, tag, price in creation_services:
    simple(h, t,
           f"A done-for-you custom {tag} - from concept to print-ready files. You bring the idea; we build the product.",
           "Custom Design Service", ["custom", "creation", "service", tag], C16,
           price, option=("Service", "Custom Project"),
           vak="A finished product you can see, a process you're walked through, a deliverable you can hold and sell.")

# Single-page creation add-ons
for h, t, tag, price in [
    ("custom-activity-page-design", "Custom Activity Page Design", "activity page", 18),
    ("custom-word-search-page", "Custom Word Search Page", "word search", 12),
    ("custom-crossword-page", "Custom Crossword Page", "crossword", 12),
    ("custom-maze-page", "Custom Maze Page", "maze", 12),
    ("custom-bingo-page", "Custom Bingo Page", "bingo", 12),
    ("custom-affirmation-card-design", "Custom Affirmation Card Design", "affirmation card", 18),
    ("custom-character-bio-page", "Custom Character Bio Page", "character bio", 25),
]:
    simple(h, t, f"A custom {tag} designed to slot right into your book or product.",
           "Custom Design Service", ["custom", "page", tag], C16, price,
           option=("Service", "Single Page"))

simple("book-design-consultation", "Book Design Consultation",
       "Map your entire book project in one focused session - scope, format, timeline, and budget, before you commit a dime to production.",
       "Consultation", ["consultation", "book", "strategy"], C16, 95,
       option=("Session", "45 Minutes"))

# =============================================================================
# 17. ADD-ON PRODUCT PAGES
# =============================================================================
C17 = "Add-Ons"
design_addons = [
    ("rush-design-fee", "Rush Design Fee", "Need it fast? Jump the queue and get your design prioritized.", 25),
    ("extra-revision", "Extra Revision", "An additional round of revisions beyond your included edits.", 15),
    ("additional-design-concept", "Additional Design Concept", "A second original concept direction to choose from.", 30),
    ("canva-editable-link-add-on", "Canva Editable Link Add-On", "Get an editable Canva link so you can tweak your design anytime.", 12),
    ("extra-file-format-add-on", "Extra File Format Add-On", "Receive your design in an additional file format (PNG, PDF, SVG, etc.).", 8),
    ("commercial-use-license", "Commercial Use License", "License your design for commercial use and resale.", 45),
    ("ownership-transfer-fee", "Ownership Transfer Fee", "Full ownership transfer of the source files and rights.", 75),
    ("custom-illustration-add-on", "Custom Illustration Add-On", "Add a hand-crafted custom illustration to your design.", 35),
    ("custom-character-design-add-on", "Custom Character Design Add-On", "Add an original custom character to your project.", 45),
    ("photo-cleanup-add-on", "Photo Cleanup Add-On", "Professional cleanup, retouch, and color-correction of your photo.", 15),
    ("background-removal-add-on", "Background Removal Add-On", "Clean background removal on your provided image.", 8),
    ("matching-social-graphic-add-on", "Matching Social Media Graphic Add-On", "A matching social graphic to promote your design.", 18),
    ("matching-thank-you-card-add-on", "Matching Thank-You Card Add-On", "A coordinating thank-you card to complete the set.", 14),
    ("matching-sticker-add-on", "Matching Sticker Design Add-On", "A matching sticker design to round out your order.", 12),
    ("matching-party-favor-add-on", "Matching Party Favor Design Add-On", "A matching favor design to extend your theme.", 16),
    ("mockup-image-add-on", "Mockup Image Add-On", "A realistic mockup image of your design in use.", 12),
]
for h, t, pitch, price in design_addons:
    simple(h, t, pitch, "Add-On", ["add-on", "design"], C17, price,
           option=("Add-On", "Service"))

print_addons = [
    ("print-upgrade", "Print Upgrade", "Upgrade your order to higher-quality printing.", 8),
    ("premium-cardstock-upgrade", "Premium Cardstock Upgrade", "Thicker, premium cardstock for a luxe feel.", 6),
    ("matte-paper-upgrade", "Matte Paper Upgrade", "Smooth, glare-free matte finish.", 5),
    ("glossy-paper-upgrade", "Glossy Paper Upgrade", "Vibrant, high-shine glossy finish.", 5),
    ("sticker-paper-upgrade", "Sticker Paper Upgrade", "Print your design on adhesive sticker paper.", 6),
    ("waterproof-sticker-upgrade", "Waterproof Sticker Paper Upgrade", "Durable, waterproof sticker material.", 8),
    ("holographic-sticker-upgrade", "Holographic Sticker Upgrade", "Eye-catching holographic finish.", 9),
    ("lamination-add-on", "Lamination Add-On", "Protective lamination for durability and shine.", 6),
    ("cutting-add-on", "Cutting Add-On", "Precision cutting so your prints arrive ready to use.", 6),
    ("assembly-add-on", "Assembly Add-On", "We assemble your product so it arrives ready to go.", 18),
    ("gold-spiral-binding-add-on", "Gold Spiral Binding Add-On", "Premium gold spiral binding for a standout finish.", 10),
    ("book-binding-add-on", "Book Binding Add-On", "Professional binding for your book or journal.", 12),
    ("gift-packaging-add-on", "Gift Packaging Add-On", "Gift-ready packaging so it arrives ready to give.", 10),
    ("shipping-upgrade", "Shipping Upgrade", "Faster, tracked, or priority shipping.", 12),
]
for h, t, pitch, price in print_addons:
    simple(h, t, pitch, "Add-On", ["add-on", "print", "production"], C17, price,
           ship=True, grams=20, option=("Add-On", "Upgrade"))

simple("local-pickup-option", "Local Pickup Option",
       "Skip shipping and pick up your order locally.",
       "Add-On", ["add-on", "pickup", "delivery"], C17, 0,
       option=("Delivery", "Local Pickup"))

# =============================================================================
# Write CSV
# =============================================================================
OUT = "shopify/products_import.csv"
import os
os.makedirs("shopify", exist_ok=True)
with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=HEADER)
    w.writeheader()
    for r in rows:
        w.writerow(r)

# SEO + alt-text reference (one row per product) for easy manual use when
# uploading images/mockups in the Shopify admin.
SEO_OUT = "shopify/seo_reference.csv"
seo_cols = ["Handle", "Title", "Collection", "SEO Title", "SEO Description",
            "Image Alt Text"]
with open(SEO_OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=seo_cols)
    w.writeheader()
    for r in seo_ref:
        w.writerow(r)
print(f"Wrote {SEO_OUT} ({len(seo_ref)} products)")

# Summary
products = len(set(r["Handle"] for r in rows))
print(f"Wrote {OUT}")
print(f"Products: {products}")
print(f"Variant rows: {len(rows)}")
prices = [float(r["Variant Price"]) for r in rows if r["Variant Price"]]
print(f"Price range: ${min(prices):.2f} - ${max(prices):.2f}")
