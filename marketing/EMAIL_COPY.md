# Email & Notification Copy — Color Create Studio

Brand voice: warm, personal, "made by hand, built from stories." Paste into Shopify
**Settings → Notifications** (edit the template, or use the custom message field) and into your
email app for the abandoned-cart sequence.

> Tokens like `{{ customer.first_name }}` and `{{ order.name }}` are Shopify Liquid variables —
> keep them as-is and Shopify fills them in.

---

## 1. Order Confirmation (paste into the Order Confirmation notification)
**Subject:** Yes! We got your order, {{ customer.first_name }} 🎨

Hi {{ customer.first_name }},

Thank you so much — order **{{ order.name }}** is officially in my hands. 🙌

Every piece here is made by hand and built from your story, so I pour real care into each one.
Here's what happens next:

- **Custom design orders:** I'll review your details and reach out within 24 hours if I need
  anything (names, photos, colors, dates) before I start creating.
- **Digital / template orders:** keep an eye on your inbox — your files are on the way.
- **Print + ship orders:** I'll get these into production and send tracking once they're on the move.

Questions? Just reply to this email — it comes straight to me.

Made by hand, built from stories,
**Yanna Camile** · Color Create Studio

---

## 2. Custom-Order "We're On It" (send manually, or set up for custom items)
**Subject:** Let's bring your design to life ✨ ({{ order.name }})

Hi {{ customer.first_name }},

So excited to create this for you! To make it perfect, please reply with:

1. **Names / wording** exactly as you want them
2. **Date(s)** if any
3. **Colors or theme** you're going for
4. **Photos or inspiration** (attach anything you love)
5. Anything that makes it personal — the little details are my favorite part

Once I have these, I'll send your first proof for approval before anything is finalized or printed.
You'll always see it before you receive it.

Talk soon,
**Yanna** · Color Create Studio

---

## 3. Shipping Confirmation (paste into the Shipping Confirmation notification)
**Subject:** It's on the way! 📦 {{ order.name }}

Hi {{ customer.first_name }},

Your order just shipped — handmade, packed with care, and headed your way.

**Track it here:** {{ order.fulfillment.tracking_url }}

When it arrives, I'd love to see it in action — tag **@colorcreatestudio** and I might reshare it. 💛

Thank you for supporting a small, hands-on studio.
**Yanna** · Color Create Studio

---

## 4. Digital Download Delivery (for download/Canva-link items)
**Subject:** Your download is ready, {{ customer.first_name }} ⬇️

Hi {{ customer.first_name }},

Your files are ready! Grab them here:

**[ Download / Open in Canva ]** — (link)

A few quick tips:
- Save a copy to your own device/Canva account before editing.
- These are for personal use unless you added a commercial license.
- Need a tweak or a format you don't see? Just reply.

Enjoy creating,
**Color Create Studio**

---

## 5. Abandoned Cart Sequence (3 emails)

### Email 1 — 1 hour later
**Subject:** You left something beautiful behind 👀
Hi {{ customer.first_name }}, your cart's still here and ready when you are. Every design is
made by hand and built around *your* story — let's finish bringing it to life.
**[ Return to my cart ]**

### Email 2 — 24 hours later
**Subject:** Still thinking it over? Here's a little help 💛
Custom, handmade, and made just for you — that's what's waiting in your cart. If you had a
question before checking out, just reply and I'll personally help. Want to see it first? I can
walk you through how custom orders work.
**[ Complete my order ]**

### Email 3 — 48 hours later (gentle offer)
**Subject:** Last call — your cart expires soon ⏳
Hi {{ customer.first_name }}, I'd hate for you to miss this. Here's **10% off** to finish your
order in the next 24 hours: **WELCOME10**
**[ Use my code ]**
*(One-time, new customers. Made by hand, built from stories.)*

---

## 6. Post-Purchase / Review Request (5–7 days after delivery)
**Subject:** Did it make the moment, {{ customer.first_name }}? ⭐
Hi {{ customer.first_name }}, I hope your order was everything you imagined. If it brought a
smile, would you leave a quick review or send a photo? It means the world to a small studio —
and helps the next person find us. **[ Leave a review ]** Thank you for trusting me with your story. 💛

---

## Notes
- Set the **WELCOME10** code in Shopify → Discounts (limit: one use, new customers) before
  sending Email 3.
- Abandoned-cart Email 1 can run natively in Shopify (Marketing → Automations); the full
  3-email flow is easiest in an email app (Shopify Email, Klaviyo, etc.).
- The custom-order email maps directly to **PRISM's** future inbox/lead workflow — same
  questions, automated drafting, your approval before send.
