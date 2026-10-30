# Kailashpati Tour & Travels

Kailashpati Tour & Travel is a Node.js-powered travel website for tour packages, pilgrimage trips, destination guides, and customized travel enquiries across India. The site helps visitors plan trips; submitting an enquiry is not a booking. The team confirms itinerary, availability, and quotation manually.

## Local setup

Requirements: Node.js 22.13+ and npm.

```powershell
npm install
Copy-Item .env.example .env
npm run validate:destinations
npm test
npm run dev
```

`npm run dev` serves the static site at `http://localhost:3000`. It does not run the serverless enquiry function, so use a deployed preview to verify enquiry submission. Keep real credentials in local `.env` or the hosting provider's environment settings; never commit `.env`.

## Destination data

Edit `data/destinations.json`. Run `npm run publish:destinations` to validate records and write `data/destinations.published.json`; the Netlify build runs the same publish step before deployment. Only verified records with an official HTTPS source and verification date are published. Keep unknown values `null`. Images must be local under `images/` and include credit, license, and source metadata.

## Enquiry flow and storage

The enquiry form collects the travel dates, customer contact details, destination, and consent. The serverless function validates the request and saves a reference-numbered enquiry. This repository includes deployment adapters for Netlify and Vercel. Vercel storage uses Upstash Redis; set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the hosting environment. Netlify uses its configured function and Blobs integration. Do not expose credentials in client-side code.

## Owner notifications

Set `NOTIFICATION_METHOD` to `none`, `email`, `whatsapp`, or `both` in the hosting environment. For email, configure `RESEND_API_KEY`, `OWNER_EMAIL`, and a verified `EMAIL_FROM` sender. For WhatsApp Business Cloud API, configure the WhatsApp variables listed in `.env.example` and use an approved template. `OWNER_WHATSAPP` can also be used for the manual WhatsApp fallback. Notification delivery is separate from saving the enquiry; there is no automated quotation, payment, or booking confirmation.

## Deployment

The repository contains `netlify.toml` and `vercel.json` deployment configuration. Run the destination validator before deploying and configure the storage and notification environment variables in the selected hosting provider. Confirm that the enquiry endpoint and notification setup work in a preview before accepting real enquiries.
## Customer reviews

Customer review submissions are stored as pending records in the existing Upstash Redis store and are not displayed publicly until an administrator approves them. The public `/api/reviews` endpoint returns approved reviews and calculates the average and star distribution from those records only. The administrator interface is at `/admin-reviews.html`; configure `REVIEWS_ADMIN_PASSWORD` (at least 16 characters) and preferably a separate random `REVIEWS_SESSION_SECRET` (at least 32 characters) in the hosting environment. The admin session is signed, HTTP-only, SameSite strict, and expires after eight hours. Submissions are text-only; customer photo uploads are not enabled. The previous hardcoded testimonials were removed from the public review section because their authenticity could not be confirmed from the repository.
