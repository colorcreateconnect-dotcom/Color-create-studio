# Color Create Studio - Collections Setup

All 16 collections are **automated (smart) collections**. Each one has a single rule:
**Product tag is equal to the collection name.** Because every product in
`products_import.csv` already carries its collection name as a tag, products file
themselves the moment you create the collection - and any new product you add later
with that tag joins automatically.

## Native Shopify setup (no app needed)
For each collection in the table below:
1. Shopify Admin -> **Products -> Collections -> Create collection**.
2. Enter the **Title** and paste the **Description**.
3. Under **Collection type**, choose **Smart (automated)**.
4. Set **Conditions** to **Product tag** / **is equal to** / the **Tag** value.
5. Set **Sort: best-selling** (optional).
6. Scroll to **Search engine listing** -> **Edit** -> paste the SEO title & description.
7. Leave it **unpublished** until you've reviewed products, then publish.

> Tip: keep collections unpublished while products are still Draft, then publish
> collections and products together when you're ready to go live.

## Bulk option (Matrixify / Excelify app)
`collections_reference.csv` lists every field. If you use the Matrixify app, map
these columns to its smart-collection import (Title, Body HTML, Collection Type =
smart, the tag rule, Sort Order, SEO Title, SEO Description). Without the app, use
the native steps above - it takes ~10 minutes for all 16.

## The 16 collections

| # | Collection | Tag rule (Product tag = ) | SEO description |
|---|---|---|---|
| 1 | **Custom Celebration Design** | `Custom Celebration Design` | Shop custom celebration & party designs by Color Create Studio - personalized shirts, signs & full party suites for birthdays, graduations & milestones. |
| 2 | **Custom Event Graphics** | `Custom Event Graphics` | Custom event graphics by Color Create Studio - invitations, flyers, welcome signs & announcements. Digital, print-ready, or printed & shipped. |
| 3 | **Custom Party Favor Designs** | `Custom Party Favor Designs` | Custom party favor designs - chip bag labels, water bottle labels, wrappers, toppers & tags themed to match your party. By Color Create Studio. |
| 4 | **Memorial & Tribute Design** | `Memorial & Tribute Design` | Memorial & tribute designs by Color Create Studio - programs, prayer cards, keepsakes & celebration-of-life pieces created with care. |
| 5 | **Business Design Services** | `Business Design Services` | Small business design services - flyers, menus, business cards, social templates & brand graphics. Look established overnight. Color Create Studio. |
| 6 | **Canva Templates** | `Canva Templates` | Editable Canva templates by Color Create Studio - invitations, party favors, business & creative designs you customize yourself and download instantly. |
| 7 | **Digital Print + Send** | `Digital Print + Send` | Digital print + send designs by Color Create Studio - finished, print-ready files delivered to you. No editing required. Print anywhere. |
| 8 | **Print + Ship** | `Print + Ship` | Print + ship products by Color Create Studio - done-for-you shirts, signs, favors, cards & books printed and shipped to your door. |
| 9 | **Nova Lai Kids Collection** | `Nova Lai Kids Collection` | Nova Lai kids collection - coloring books, activity packs & personalized creative products. Screen-free fun by Color Create Studio. |
| 10 | **Children's Story Books** | `Children's Story Books` | Children's story books by Color Create Studio - imagination, abundance & family stories, personalized editions & custom book creation. |
| 11 | **Trap N' Chill Adult Collection** | `Trap N' Chill Adult Collection` | Trap N' Chill adult collection - bold-and-easy coloring & activity books, self-care, stickers & bundles. Unwind and create. Color Create Studio. |
| 12 | **Dreamland / Manifestation Collection** | `Dreamland / Manifestation Collection` | Dreamland manifestation collection - self-care & manifestation activity books, journals, affirmation cards & printables. Color Create Studio. |
| 13 | **Journals & Workbooks** | `Journals & Workbooks` | Guided journals & workbooks by Color Create Studio - self-trust, manifestation, confidence & money-mindset journals, plus custom designs. |
| 14 | **Stickers** | `Stickers` | Stickers by Color Create Studio - custom & ready-made sticker sheets, waterproof vinyl, holographic & mystery packs. Design or print + ship. |
| 15 | **Bundles** | `Bundles` | Design & product bundles by Color Create Studio - party, event, kids, self-care & business sets. More value, one cohesive look. |
| 16 | **Custom Book & Product Creation Services** | `Custom Book & Product Creation Services` | Custom book & product creation by Color Create Studio - done-for-you coloring books, journals, workbooks, covers, layout & print-ready files. |

## Descriptions (paste into each collection)

### Custom Celebration Design
- **Handle:** `custom-celebration-design`
- **Body:** Personalized designs for life's biggest moments. Custom shirts, signage, party suites, and details for birthdays, graduations, baby showers, reunions, and every milestone worth marking.
- **SEO title:** Custom Celebration Design | Color Create Studio
- **SEO description:** Shop custom celebration & party designs by Color Create Studio - personalized shirts, signs & full party suites for birthdays, graduations & milestones.

### Custom Event Graphics
- **Handle:** `custom-event-graphics`
- **Body:** Invitations, flyers, signage, and digital graphics that set the vibe and fill your guest list - designed to match your theme down to the detail.
- **SEO title:** Custom Event Graphics | Color Create Studio
- **SEO description:** Custom event graphics by Color Create Studio - invitations, flyers, welcome signs & announcements. Digital, print-ready, or printed & shipped.

### Custom Party Favor Designs
- **Handle:** `custom-party-favor-designs`
- **Body:** Make the little things look high-end. Custom labels, wrappers, toppers, and tags that tie your whole party theme together.
- **SEO title:** Custom Party Favor Designs | Color Create Studio
- **SEO description:** Custom party favor designs - chip bag labels, water bottle labels, wrappers, toppers & tags themed to match your party. By Color Create Studio.

### Memorial & Tribute Design
- **Handle:** `memorial-tribute-design`
- **Body:** Designed with warmth and respect. Programs, keepsakes, shirts, and tributes that honor a life and comfort everyone who gathers.
- **SEO title:** Memorial & Tribute Design | Color Create Studio
- **SEO description:** Memorial & tribute designs by Color Create Studio - programs, prayer cards, keepsakes & celebration-of-life pieces created with care.

### Business Design Services
- **Handle:** `business-design-services`
- **Body:** Look like a big brand overnight. Flyers, menus, business cards, social templates, and brand graphics for small businesses, creators, and vendors.
- **SEO title:** Business Design Services | Color Create Studio
- **SEO description:** Small business design services - flyers, menus, business cards, social templates & brand graphics. Look established overnight. Color Create Studio.

### Canva Templates
- **Handle:** `canva-templates`
- **Body:** Self-editable designs you control. Edit your text, colors, and photos in Canva, then export print-ready - invitations, party favors, business, and creative templates.
- **SEO title:** Canva Templates | Color Create Studio
- **SEO description:** Editable Canva templates by Color Create Studio - invitations, party favors, business & creative designs you customize yourself and download instantly.

### Digital Print + Send
- **Handle:** `digital-print-send`
- **Body:** Want the finished design without editing it yourself? Get a print-ready file delivered digitally, ready to print at home or anywhere.
- **SEO title:** Digital Print + Send | Color Create Studio
- **SEO description:** Digital print + send designs by Color Create Studio - finished, print-ready files delivered to you. No editing required. Print anywhere.

### Print + Ship
- **Handle:** `print-ship`
- **Body:** Done-for-you and delivered. We print and ship the finished product to your door - shirts, signs, favors, cards, books, and more.
- **SEO title:** Print + Ship | Color Create Studio
- **SEO description:** Print + ship products by Color Create Studio - done-for-you shirts, signs, favors, cards & books printed and shipped to your door.

### Nova Lai Kids Collection
- **Handle:** `nova-lai-kids-collection`
- **Body:** The children's branch of Color Create Studio. Screen-free coloring books, activity packs, and personalized creative products kids love.
- **SEO title:** Nova Lai Kids Collection | Color Create Studio
- **SEO description:** Nova Lai kids collection - coloring books, activity packs & personalized creative products. Screen-free fun by Color Create Studio.

### Children's Story Books
- **Handle:** `childrens-story-books`
- **Body:** Emotionally driven stories about imagination, abundance, confidence, and family - plus custom story book writing, illustration, and design services.
- **SEO title:** Children's Story Books | Color Create Studio
- **SEO description:** Children's story books by Color Create Studio - imagination, abundance & family stories, personalized editions & custom book creation.

### Trap N' Chill Adult Collection
- **Handle:** `trap-n-chill-adult-collection`
- **Body:** The adult branch of Color Create Studio. Bold-and-easy coloring books, self-care activities, stickers, and bundles made to help you unwind.
- **SEO title:** Trap N' Chill Adult Collection | Color Create Studio
- **SEO description:** Trap N' Chill adult collection - bold-and-easy coloring & activity books, self-care, stickers & bundles. Unwind and create. Color Create Studio.

### Dreamland / Manifestation Collection
- **Handle:** `dreamland-manifestation-collection`
- **Body:** Turn intention into ritual. Manifestation and self-care activity books, journals, affirmation cards, and printables to dream on purpose.
- **SEO title:** Dreamland / Manifestation Collection | Color Create Studio
- **SEO description:** Dreamland manifestation collection - self-care & manifestation activity books, journals, affirmation cards & printables. Color Create Studio.

### Journals & Workbooks
- **Handle:** `journals-workbooks`
- **Body:** Guided journals and workbooks for self-trust, manifestation, confidence, money mindset, and reflection - plus custom journal and workbook design.
- **SEO title:** Journals & Workbooks | Color Create Studio
- **SEO description:** Guided journals & workbooks by Color Create Studio - self-trust, manifestation, confidence & money-mindset journals, plus custom designs.

### Stickers
- **Handle:** `stickers`
- **Body:** Ready-made and custom stickers, sticker sheets, and mystery packs - waterproof, holographic, printable, and print-and-cut options.
- **SEO title:** Stickers | Color Create Studio
- **SEO description:** Stickers by Color Create Studio - custom & ready-made sticker sheets, waterproof vinyl, holographic & mystery packs. Design or print + ship.

### Bundles
- **Handle:** `bundles`
- **Body:** More value, one cohesive look. Curated bundles of matching designs and products - party, event, kids, self-care, and business sets.
- **SEO title:** Bundles | Color Create Studio
- **SEO description:** Design & product bundles by Color Create Studio - party, event, kids, self-care & business sets. More value, one cohesive look.

### Custom Book & Product Creation Services
- **Handle:** `custom-book-product-creation`
- **Body:** Bring your own book, journal, or digital product to life. Done-for-you writing, illustration, layout, covers, and print-ready files.
- **SEO title:** Custom Book & Product Creation Services | Color Create Studio
- **SEO description:** Custom book & product creation by Color Create Studio - done-for-you coloring books, journals, workbooks, covers, layout & print-ready files.
