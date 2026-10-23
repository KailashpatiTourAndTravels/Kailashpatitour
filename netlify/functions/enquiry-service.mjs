import { createHash, randomUUID } from 'node:crypto';

const e164 = /^\+[1-9]\d{7,14}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validISODate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});
const safeText = value => String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function validateEnquiry(input, destinations, today) {
  const errors = {};
  const name = safeText(input?.name);
  const phone = safeText(input?.phone).replace(/[\s().-]/g, '');
  const email = safeText(input?.email).toLowerCase();
  const requirements = safeText(input?.requirements);
  const state = safeText(input?.state);
  const destinationId = safeText(input?.destinationId);
  const startDate = safeText(input?.startDate);
  const endDate = safeText(input?.endDate);
  const travelers = input?.travellers === null || input?.travellers === '' || input?.travellers === undefined ? null : Number(input.travellers);
  const destination = destinations.find(place => place.id === destinationId && place.state === state && place.verification_status === 'verified');

  if (!uuidPattern.test(input?.requestId || '')) errors.requestId = 'Refresh the page and try again.';
  if (input?.website) errors.website = 'Invalid submission.';
  if (!destination) errors.destinationId = 'Choose a verified destination for the selected state.';
  if (name.length < 2 || name.length > 100) errors.name = 'Enter your name (2 to 100 characters).';
  if (!e164.test(phone)) errors.phone = 'Enter a valid WhatsApp number with country code, such as +91 98765 43210.';
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = 'Enter a valid email address or leave it blank.';
  if (!validISODate(startDate) || startDate < today) errors.startDate = 'Choose today or a future start date.';
  if (!validISODate(endDate) || endDate < startDate) errors.endDate = 'Choose an end date on or after the start date.';
  if (travelers !== null && (!Number.isInteger(travelers) || travelers < 1 || travelers > 100)) errors.travellers = 'Traveller count must be from 1 to 100.';
  if (requirements.length > 500) errors.requirements = 'Additional requirements must be 500 characters or fewer.';
  if (input?.consent !== true) errors.consent = 'Consent is required before submitting.';

  const durationDays = validISODate(startDate) && validISODate(endDate) && endDate >= startDate
    ? Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1
    : null;
  return {
    errors,
    enquiry: Object.keys(errors).length ? null : {
      requestId: input.requestId, state, destinationId, destinationName: destination.name,
      startDate, endDate, durationDays, name, phone, email: email || null,
      travellers: travelers, requirements: requirements || null, consent: true
    }
  };
}

function ownerWhatsAppMessage(enquiry, reference, createdAt) {
  return [
    'New Kailashpati Tour & Travels travel enquiry', `Reference: ${reference}`,
    `Submitted: ${createdAt}`, `Customer: ${enquiry.name}`, `WhatsApp: ${enquiry.phone}`,
    `Email: ${enquiry.email || 'Not provided'}`, `State/UT: ${enquiry.state}`,
    `Destination: ${enquiry.destinationName}`, `Start date: ${enquiry.startDate}`,
    `End date: ${enquiry.endDate}`, `Duration: ${enquiry.durationDays} day(s)`,
    `Travellers: ${enquiry.travellers ?? 'Not provided'}`,
    `Requirements: ${enquiry.requirements || 'None provided'}`
  ].join('\n');
}

function fallbackUrl(ownerNumber, message) {
  const number = safeText(ownerNumber).replace(/[\s()+.-]/g, '');
  if (!/^\d{8,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

async function notifyOwner(enquiry, reference, createdAt, env) {
  const method = (env.NOTIFICATION_METHOD || 'none').toLowerCase();
  const wanted = method === 'both' ? ['email', 'whatsapp'] : ['email', 'whatsapp'].includes(method) ? [method] : [];
  const results = {};
  const body = ownerWhatsAppMessage(enquiry, reference, createdAt);

  for (const channel of wanted) {
    try {
      if (channel === 'email') {
        if (!env.RESEND_API_KEY || !env.OWNER_EMAIL || !env.EMAIL_FROM) throw new Error('Email notification is not configured.');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.EMAIL_FROM, to: [env.OWNER_EMAIL], subject: `Travel enquiry ${reference}`, text: body })
        });
        if (!response.ok) throw new Error('Email provider rejected the notification.');
      } else {
        const apiVersion = env.WHATSAPP_API_VERSION;
        if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.OWNER_WHATSAPP || !env.WHATSAPP_TEMPLATE_NAME || !env.WHATSAPP_TEMPLATE_LANGUAGE || !apiVersion) {
          throw new Error('WhatsApp Business notification is not configured.');
        }
        const phone = env.OWNER_WHATSAPP.replace(/[\s()+.-]/g, '');
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'template', template: {
            name: env.WHATSAPP_TEMPLATE_NAME,
            language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
            components: [{ type: 'body', parameters: [
              reference, createdAt, enquiry.name, enquiry.phone, enquiry.email || 'Not provided', enquiry.state,
              enquiry.destinationName, enquiry.startDate, enquiry.endDate, String(enquiry.durationDays),
              String(enquiry.travellers ?? 'Not provided'), enquiry.requirements || 'None provided'
            ].map(text => ({ type: 'text', text })) }]
          } })
        });
        if (!response.ok) throw new Error('WhatsApp provider rejected the notification.');
      }
      results[channel] = 'sent';
    } catch {
      results[channel] = 'failed';
    }
  }
  const sent = Object.values(results).filter(value => value === 'sent').length;
  const failed = Object.values(results).filter(value => value === 'failed').length;
  return {
    results,
    status: sent && !failed ? 'sent' : sent ? 'partial' : 'not_sent',
    whatsappFallbackUrl: fallbackUrl(env.OWNER_WHATSAPP, body)
  };
}

export function createEnquiryHandler({ store, destinations, env = {}, now = () => new Date(), uuid = randomUUID, sendNotification = notifyOwner }) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const origin = request.headers.get('origin');
    if (origin) {
      try { if (new URL(origin).host !== new URL(request.url).host) return json({ error: 'Request origin is not allowed.' }, 403); }
      catch { return json({ error: 'Invalid request origin.' }, 403); }
    }
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return json({ error: 'Send a JSON enquiry.' }, 415);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: 'Enquiry is too large.' }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return json({ error: 'Enquiry data is invalid.' }, 400); }
    const dateToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now());
    const { errors, enquiry } = validateEnquiry(input, destinations, dateToday);
    if (Object.keys(errors).length) return json({ error: 'Please correct the highlighted fields.', fields: errors }, 400);

    const requestHash = createHash('sha256').update(enquiry.requestId).digest('hex');
    const requestKey = `requests/${requestHash}`;
    let reference;
    const existingRequest = await store.getJSON(requestKey);
    if (existingRequest) {
      if (existingRequest.phoneHash !== createHash('sha256').update(enquiry.phone).digest('hex')) return json({ error: 'This request token was already used. Refresh the page to retry.' }, 409);
      reference = existingRequest.reference;
      const existing = await store.getJSON(`enquiries/${reference}`);
      if (existing) return json({ reference, notificationStatus: existing.notificationStatus || 'not_sent', whatsappFallbackUrl: existing.whatsappFallbackUrl || null, duplicate: true });
    } else {
      reference = `KTT-${dateToday.replaceAll('-', '')}-${uuid().slice(0, 8).toUpperCase()}`;
      const reservation = await store.setJSON(requestKey, {
        reference, phoneHash: createHash('sha256').update(enquiry.phone).digest('hex'), createdAt: now().toISOString()
      }, { onlyIfNew: true });
      if (!reservation.modified) return json({ error: 'Your enquiry is already being processed. Please retry in a moment.' }, 409);
    }

    const createdAt = now().toISOString();
    const durationDays = enquiry.durationDays;
    const record = { ...enquiry, reference, createdAt, durationDays, notificationStatus: 'pending' };
    const save = await store.setJSON(`enquiries/${reference}`, record, { onlyIfNew: true });
    if (!save.modified) {
      const existing = await store.getJSON(`enquiries/${reference}`);
      return json({ reference, notificationStatus: existing?.notificationStatus || 'pending', whatsappFallbackUrl: existing?.whatsappFallbackUrl || null, duplicate: true });
    }

    let notification = { results: {}, status: 'not_sent', whatsappFallbackUrl: null };
    try { notification = await sendNotification(enquiry, reference, createdAt, env); }
    catch { notification = { results: { notification: 'failed' }, status: 'not_sent', whatsappFallbackUrl: null }; }
    try {
      await store.setJSON(`notifications/${reference}`, { status: notification.status, results: notification.results, updatedAt: now().toISOString() });
      await store.setJSON(`enquiries/${reference}`, { ...record, notificationStatus: notification.status, whatsappFallbackUrl: notification.whatsappFallbackUrl });
    } catch {
      console.error('Travel enquiry notification status could not be saved:', reference);
    }
    return json({ reference, notificationStatus: notification.status, whatsappFallbackUrl: notification.whatsappFallbackUrl });
  };
}
