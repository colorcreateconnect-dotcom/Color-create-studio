# Color Create Connect v3.6.1 on Netlify

This folder is prepared as a Vite + React project with Netlify Functions and Netlify Blobs.

## Deploy the ZIP

1. Unzip the downloaded package.
2. Sign in to Netlify.
3. Open Netlify Drop.
4. Drag the entire unzipped `CCC_Creator_Studio_v3_6_1_Netlify` folder into the drop area.
5. Netlify reads `netlify.toml`, runs `npm run build`, publishes `dist`, and bundles the API function.

The folder can also be pushed to GitHub and imported into Netlify for easier future updates.

## Environment variables

Add these under Netlify Project configuration > Environment variables and make them available to Functions.

- `STRIPE_SECRET_KEY`: required for live Stripe Checkout. Without it, checkout stays in safe preview mode and saves the order without charging the customer.
- `RESEND_API_KEY`: optional, sends quote confirmation emails.
- `CCC_FROM_EMAIL`: optional, the verified sender address used with Resend.

Never place secret values directly inside the source files.

## Storage

Netlify Blobs stores:

- `ccc-orders`
- `ccc-quotes`
- `ccc-uploads`

## Reference-upload limit

This Netlify export limits each reference image to 4 MB because encoded uploads must stay within Netlify Functions request limits. Customers may still attach up to five images.

## Commerce notes

- Approved-team DTF and 3D shirts require a team graphic code before entering the cart.
- Approved-team 3D shirts are $10 less than newly designed personalized 3D shirts.
- DTF back-dropdown options are included.
- Sublimation back options add $15 once per shirt.
- Stripe Automatic Tax remains enabled in the checkout function.
- No Stripe webhook or payment-reconciliation dashboard is included yet.

## Package build note

This export is source-first. Netlify should run the configured build command during deployment. A prebuilt `dist` folder is intentionally not included so an older compiled storefront cannot be published over the current source.
