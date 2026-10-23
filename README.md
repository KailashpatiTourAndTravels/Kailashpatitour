# Kailashpati Tour & Travels

Static brand website with a destination enquiry flow and a Netlify Functions backend. Enquiries are not bookings: the team confirms itinerary, availability and quotation manually.

## Local setup

Requirements: Node.js 22.13+ and npm. Install dependencies, link the directory to the existing Netlify site (needed for local Blobs access), then start the Netlify development server:

```powershell
npm install
npx netlify login
npx netlify link
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:8888`. Do not use a basic static server to test submission: it cannot run the function or persist enquiries.

Run the data validator and tests:

```powershell
npm run validate:destinations
npm test
```

## Destination data

Edit `data/destinations.json`. `npm run publish:destinations` validates the records and writes the website dataset to `data/destinations.published.json`; Netlify runs the same publish step before deploy. Only verified records with an official HTTPS source and verification date are published. Supplied coordinates, distance, seasonal claims and images are checked when present. Images must be local under `images/` and include credit, license and source metadata. Keep unknown values `null`.

The initial curated records include Baidyanath Dham, Netarhat, Betla National Park, Hundru Waterfall, Kedarnath, Badrinath, Rishikesh and Nainital. Each record links to a government or state tourism source. More destination research is needed to reach the Phase 1 target of 100–200 verified destinations. Unlisted states show a clear empty state and phone contact.

## Enquiry flow and storage

The browser collects state, a verified destination, start/end dates, customer name, WhatsApp number, optional email/travellers/requirements, and explicit contact consent. `/api/enquiries` rewrites to `netlify/functions/enquiries.mjs`, which validates the payload again, enforces same-origin requests, uses Netlify’s function rate limit, reserves an idempotency key, and saves a reference-numbered record in the site-wide `travel-enquiries` Netlify Blobs store. Netlify Blobs encrypt data at rest and in transit; the function exposes no read endpoint. Keep store access limited to the Netlify project team and set a retention policy for stored enquiries.

The store is in `ap-southeast-1` (Singapore) by default; set `BLOBS_REGION` if the project has a different data-residency requirement.

## Configure owner notifications

Copy `.env.example` to `.env` for local development and set the same values in Netlify Site configuration → Environment variables for production. Select `NOTIFICATION_METHOD=none`, `email`, `whatsapp` or `both`.

- **Email:** set `RESEND_API_KEY`, `OWNER_EMAIL` and a verified `EMAIL_FROM` sender. Credentials remain server-side.
- **WhatsApp API:** set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `OWNER_WHATSAPP`, `WHATSAPP_TEMPLATE_NAME` and `WHATSAPP_TEMPLATE_LANGUAGE`. The approved WhatsApp Business template body needs 12 sequential text placeholders for the enquiry reference, timestamp, customer details, destination, dates, duration, travellers and requirements.
- **Manual WhatsApp fallback:** set `OWNER_WHATSAPP`. If automatic notification is not sent, the form provides a prefilled message link. The customer must review and press Send in WhatsApp; the site never says that fallback messages were delivered.

Successful storage is confirmed independently from notification delivery. Notification failures are logged by reference and the saved enquiry remains available in Netlify Blobs. There is no automated quotation, payment or booking confirmation.

## Deployment and remaining setup

Deploy this directory to Netlify so the configured function and persistent Blobs store are available. Before accepting real enquiries, link the correct Netlify site, set notification environment variables and test delivery with the owner. Create and approve the WhatsApp template if that channel is selected. No provider credentials are present in this repository, so automatic email/WhatsApp delivery is not enabled by default.

The public source fields and association for the initial records were checked against the linked official sources in `data/destinations.json`. No coordinates, road distances, seasons or destination photos are published until those values and image rights are verified.
