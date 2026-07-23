import type { Config } from '@netlify/functions';
import { priceCart } from '../../backend/pricing';

// Turns a website quote (or a priced cart) into a Shopify Draft Order via the
// Admin GraphQL API. Prices are recomputed server-side with the audited
// `priceCart` engine — the client-sent amount is never trusted.
//
// This is a Web-standard fetch handler (Request -> Response), so the same file
// runs on Netlify Functions today and drops into a Cloudflare Worker / Vercel
// / Deno handler unchanged when the site moves off Netlify.
//
// Config (environment variables):
//   SHOPIFY_STORE_DOMAIN  the *.myshopify.com domain, e.g. v0rx6u-nk.myshopify.com
//   SHOPIFY_ADMIN_TOKEN   custom-app Admin API access token (shpat_...)
//   SHOPIFY_API_VERSION   optional, defaults to 2025-10

const ok = (data: unknown, status = 200) => Response.json(data, { status });
const fail = (message: string, status = 400) => ok({ ok: false, error: message }, status);
const parse = async (request: Request) => { try { return await request.json() as any; } catch { return {}; } };

const DRAFT_MUTATION = `mutation CreateQuoteDraftOrder($input: DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{id name invoiceUrl status totalPriceSet{presentmentMoney{amount currencyCode}}}userErrors{field message}}}`;

const clip = (value: unknown, max = 255) => String(value == null ? '' : value).trim().slice(0, max);
const attr = (key: string, value: unknown) => { const v = clip(value); return v ? { key, value: v } : null; };
const humanize = (value: string) => value.replace(/[-_]/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/^./, c => c.toUpperCase());
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function configToAttrs(configuration: any): { key: string; value: string }[] {
  if (!configuration || typeof configuration !== 'object') return [];
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(configuration)) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) {
      if (k === 'roster') {
        out.push({ key: 'Roster', value: (v as any[]).map((r: any, i: number) => `${i + 1}. ${r.name || '-'} #${r.number || '-'} ${r.size || ''} ${r.personalization && r.personalization !== 'none' ? r.personalization : ''}`.replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 255) });
      } else if (k === 'names') {
        out.push({ key: 'Guest names', value: (v as any[]).join(', ').slice(0, 255) });
      } else if (v.length) {
        out.push({ key: humanize(k), value: (v as any[]).map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(', ').slice(0, 255) });
      }
      continue;
    }
    if (typeof v === 'object') { out.push({ key: humanize(k), value: JSON.stringify(v).slice(0, 255) }); continue; }
    if (typeof v === 'boolean') { out.push({ key: humanize(k), value: v ? 'Yes' : 'No' }); continue; }
    out.push({ key: humanize(k), value: clip(v) });
  }
  return out.slice(0, 20);
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return fail('Method not allowed', 405);

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2025-10';
  // Not yet wired up: succeed quietly so the existing quote flow is never blocked.
  if (!domain || !token) return ok({ ok: false, configured: false, reason: 'Shopify Admin API not configured' });

  const body = await parse(request);
  try {
    const currencyCode = 'USD';
    const email = clip(body.email);
    const name = clip(body.name);
    const service = clip(body.service);
    const eventType = clip(body.eventType);
    const isOrder = Array.isArray(body.items) && body.items.length > 0;

    let lineItems: any[];
    if (isOrder) {
      // Priced cart -> recompute every line with the audited engine.
      const priced = priceCart(body.items);
      lineItems = priced.map((x: any) => ({
        title: String(x.productId),
        quantity: 1,
        requiresShipping: !String(x.productId).startsWith('digital-'),
        taxable: true,
        originalUnitPriceWithCurrency: { amount: Number(x.amount).toFixed(2), currencyCode },
        customAttributes: configToAttrs(x.configuration),
      }));
    } else {
      // Open quote -> $0 placeholder line; the studio sets the real price before
      // sending the invoice (Basic plan has no custom-pricing at checkout).
      lineItems = [{
        title: 'Custom Project Inquiry' + (eventType ? ' — ' + eventType : ''),
        quantity: 1,
        requiresShipping: false,
        taxable: true,
        originalUnitPriceWithCurrency: { amount: '0.00', currencyCode },
        customAttributes: [attr('Service', service), attr('Event type', eventType), attr('Needed by', body.neededBy), attr('Budget range', body.budget)].filter(Boolean) as any[],
      }];
    }

    const note = [
      'Website ' + (isOrder ? 'order' : 'quote request') + ' via colorcreatestudio.com',
      name && ('Contact: ' + name),
      body.phone && ('Phone: ' + body.phone),
      body.contact && ('Preferred contact: ' + body.contact),
      eventType && ('Event: ' + eventType),
      service && ('Service: ' + service),
      body.neededBy && ('Needed by: ' + body.neededBy),
      body.fulfillment && ('Fulfillment: ' + body.fulfillment),
      body.budget && ('Budget range: ' + body.budget),
      body.quoteRef && ('Quote reference: ' + body.quoteRef),
      '',
      clip(body.details, 8000),
    ].filter(v => v !== undefined && v !== null && v !== false).join('\n');

    const customAttributes = [
      attr('Source', 'colorcreatestudio.com'),
      attr('Quote reference', body.quoteRef),
      attr('Contact name', name),
      attr('Phone', body.phone),
      attr('Preferred contact', body.contact),
      attr('Event type', eventType),
      attr('Service', service),
      attr('Needed by', body.neededBy),
      attr('Fulfillment', body.fulfillment),
      attr('Budget range', body.budget),
    ].filter(Boolean) as any[];

    const tags = ['website', isOrder ? 'order' : 'quote', ...(service ? [slug(service)] : [])];

    const input: any = { tags, note, customAttributes, lineItems, visibleToCustomer: false };
    if (email) input.email = email;

    const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DRAFT_MUTATION, variables: { input } }),
    });
    const result = await response.json() as any;
    if (!response.ok) return fail('Shopify API error: ' + (result?.errors?.[0]?.message || response.status), 502);
    const errs = result?.data?.draftOrderCreate?.userErrors;
    if (errs && errs.length) return fail(errs.map((e: any) => e.message).join('; '), 400);
    const draft = result?.data?.draftOrderCreate?.draftOrder;
    return ok({
      ok: true,
      configured: true,
      draftName: draft?.name,
      draftId: draft?.id,
      invoiceUrl: draft?.invoiceUrl,
      status: draft?.status,
      total: draft?.totalPriceSet?.presentmentMoney?.amount,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Draft order request failed', 400);
  }
}

export const config: Config = { path: ['/api/quote-draft'] };
