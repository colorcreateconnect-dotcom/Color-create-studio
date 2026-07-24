import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { priceCart } from '../../backend/pricing';

const ok=(data:unknown,status=200)=>Response.json(data,{status});
const fail=(message:string,status=400)=>ok({error:message},status);
const compactSummary=(value:unknown)=>{const text=JSON.stringify(value);return text.length>450?text.slice(0,447)+'...':text};
const addChunkedMetadata=(params:URLSearchParams,prefix:string,value:unknown)=>{const text=JSON.stringify(value);for(let i=0;i<Math.min(5,Math.ceil(text.length/450));i++)params.set(`metadata[${prefix}_${i}]`,text.slice(i*450,(i+1)*450))};
const safeFilename=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-100)||'reference-file';
const designRequired=(id:string)=>id==='single-custom-shirt'||id==='supporter-shirt'||id==='3d-single'||id==='group-apparel'||id.startsWith('printed-')||id.startsWith('digital-')||id.startsWith('keepsake-')||id.startsWith('sports-')||['dtf-bundle','3d-front-bundle','3d-full-bundle'].includes(id);
const validateDesignIntake=(items:any[])=>{for(const item of items){const id=String(item.productId||'');const configuration=item.configuration||{};if(['individual-team-shirt','3d-approved-team-shirt'].includes(id)&&!String(configuration.graphicReference||'').trim())throw new Error('Team or approved graphic reference is required');if(designRequired(id)&&!String(configuration.designIdea||'').trim())throw new Error('Design details are required for '+id);if(Array.isArray(configuration.referenceFileNames)&&configuration.referenceFileNames.length&&!configuration.usagePermission)throw new Error('Upload permission is required')}};
const parse=async(request:Request)=>{try{return await request.json() as any}catch{return {}}};
const route=(request:Request)=>new URL(request.url).pathname.replace(/\/$/,'');

async function sendQuoteConfirmation(email:string,reference:string){const key=process.env.RESEND_API_KEY;const from=process.env.CCC_FROM_EMAIL;if(!key||!from)return false;try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Color Create Connect quote request received',text:'We received your Color Create Connect project request. Reference: '+reference+'. Expect a response within 1 to 2 business days.'})});return response.ok}catch{return false}}

export default async function handler(request:Request){
  if(request.method!=='POST')return fail('Method not allowed',405);
  const path=route(request);
  try{
    if(path.endsWith('/uploads')){
      const input=await parse(request) as {filename?:string;contentType?:string;content?:string};
      if(!input.filename||!input.contentType||!input.content)return fail('File information is required');
      const approxBytes=Math.floor(input.content.length*.75);
      if(approxBytes>4*1024*1024)return fail('Reference files must be 4 MB or smaller on Netlify');
      if(!['image/jpeg','image/png','image/heic','image/heif','application/octet-stream'].includes(input.contentType))return fail('Unsupported reference file type');
      const key='uploads/'+Date.now()+'-'+crypto.randomUUID()+'-'+safeFilename(input.filename);
      await getStore('ccc-uploads').set(key,input.content,{metadata:{filename:input.filename,contentType:input.contentType,encoding:'base64'}});
      return ok({path:key,filename:input.filename,contentType:input.contentType});
    }
    if(path.endsWith('/price')){
      const body=await parse(request);const priced=priceCart(body.items||[]);return ok({items:priced,subtotal:priced.reduce((s:number,x:any)=>s+x.amount,0)});
    }
    if(path.endsWith('/quotes')){
      const quote=await parse(request) as Record<string,unknown>;
      if(!quote.name||!quote.email||!quote.details)return fail('Name, email, and project details are required');
      const quoteId=crypto.randomUUID();
      await getStore('ccc-quotes').setJSON('quotes/'+quoteId,{...quote,status:'new',createdAt:Date.now()});
      const quoteRef=quoteId.slice(0,8).toUpperCase();
      const emailConfirmationSent=await sendQuoteConfirmation(String(quote.email),quoteRef);
      return ok({ok:true,quoteRef,emailConfirmationSent});
    }
    if(path.endsWith('/checkout')){
      const input=await parse(request) as any;
      validateDesignIntake(input.items||[]);
      const priced=priceCart(input.items||[]);
      const subtotal=priced.reduce((s:number,x:any)=>s+x.amount,0);
      const digitalOnly=priced.length>0&&priced.every((x:any)=>String(x.productId).startsWith('digital-'));
      const shipping=digitalOnly||input.fulfillment==='pickup'||subtotal>=75?0:8;
      const orderId=crypto.randomUUID();
      await getStore('ccc-orders').setJSON('orders/'+orderId,{items:priced,subtotal,shipping,total:subtotal+shipping,fulfillment:input.fulfillment,status:'pending-payment',configurationComplete:true,createdAt:Date.now()});
      const stripeKey=process.env.STRIPE_SECRET_KEY;
      if(!stripeKey)return ok({mode:'preview',orderRef:orderId.slice(0,8).toUpperCase(),subtotal,shipping,total:subtotal+shipping});
      const origin=typeof input.origin==='string'&&/^https?:\/\//.test(input.origin)?input.origin:new URL(request.url).origin;
      const params=new URLSearchParams();
      priced.forEach((x:any,i:number)=>{params.set(`line_items[${i}][quantity]`,'1');params.set(`line_items[${i}][price_data][currency]`,'usd');params.set(`line_items[${i}][price_data][unit_amount]`,String(Math.round(x.amount*100)));params.set(`line_items[${i}][price_data][product_data][name]`,String(x.productId));params.set(`line_items[${i}][price_data][product_data][description]`,compactSummary(x.configuration));params.set(`line_items[${i}][price_data][product_data][tax_code]`,String(x.productId).startsWith('digital-')?(String(x.productId).includes('invitation')||String(x.productId).includes('card')?'txcd_10506002':'txcd_10505001'):'txcd_99999999');addChunkedMetadata(params,'item'+i,x.configuration)});
      if(shipping>0){const i=priced.length;params.set(`line_items[${i}][quantity]`,'1');params.set(`line_items[${i}][price_data][currency]`,'usd');params.set(`line_items[${i}][price_data][unit_amount]`,'800');params.set(`line_items[${i}][price_data][product_data][name]`,'Shipping')}
      params.set('metadata[order_id]',orderId);params.set('mode','payment');params.set('automatic_tax[enabled]','true');params.set('automatic_payment_methods[enabled]','true');params.set('success_url',origin+'?checkout=success');params.set('cancel_url',origin+'?checkout=cancel');params.set('client_reference_id',orderId);if(!digitalOnly&&input.fulfillment!=='pickup')params.set('shipping_address_collection[allowed_countries][0]','US');
      const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+stripeKey,'Content-Type':'application/x-www-form-urlencoded'},body:params});
      const session=await response.json() as any;if(!response.ok)return fail(session.error?.message||'Stripe checkout failed',502);return ok({url:session.url,orderRef:orderId.slice(0,8).toUpperCase()});
    }
    return fail('Not found',404);
  }catch(error){return fail(error instanceof Error?error.message:'Request failed',400)}
}

export const config:Config={path:['/api/uploads','/api/price','/api/quotes','/api/checkout']};
