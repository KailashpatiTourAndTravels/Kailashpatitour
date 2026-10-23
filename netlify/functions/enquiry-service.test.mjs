import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEnquiryHandler, validateEnquiry } from './enquiry-service.mjs';

const destinations = JSON.parse(await readFile(new URL('../../data/destinations.published.json', import.meta.url), 'utf8'));
const today = '2026-10-24';
const requestPayload = overrides => ({
  requestId: 'c1111111-1111-4111-8111-111111111111',
  state: 'Jharkhand', destinationId: 'jharkhand-deoghar-baidyanath',
  startDate: '2026-10-25', endDate: '2026-10-27',
  name: 'Asha Kumar', phone: '+919876543210', email: 'asha@example.com',
  travellers: 4, requirements: 'Please call after 5 pm.', consent: true, website: '',
  ...overrides
});

class MemoryStore {
  values = new Map();
  async getJSON(key) { return this.values.get(key) ?? null; }
  async setJSON(key, value, options = {}) {
    if (options.onlyIfNew && this.values.has(key)) return { modified: false };
    this.values.set(key, structuredClone(value));
    return { modified: true };
  }
}

function makeRequest(payload) {
  return new Request('https://kailashpatitourtravel.com/api/enquiries', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://kailashpatitourtravel.com' }, body: JSON.stringify(payload)
  });
}

test('selected destination must match the selected state and be verified', () => {
  const wrongState = validateEnquiry(requestPayload({state: 'Uttarakhand'}), destinations, today);
  assert.ok(wrongState.errors.destinationId);
  const valid = validateEnquiry(requestPayload(), destinations, today);
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.enquiry.durationDays, 3);
});

test('dates, international WhatsApp number and consent are validated server side', () => {
  assert.ok(validateEnquiry(requestPayload({startDate: '', endDate: ''}), destinations, today).errors.startDate);
  assert.ok(validateEnquiry(requestPayload({endDate: '2026-10-24'}), destinations, today).errors.endDate);
  assert.ok(validateEnquiry(requestPayload({phone: '9876543210'}), destinations, today).errors.phone);
  assert.ok(validateEnquiry(requestPayload({consent: false}), destinations, today).errors.consent);
});

test('a valid enquiry is saved once with a reference and full owner notification details', async () => {
  const store = new MemoryStore();
  let calls = 0;
  let notified;
  const handler = createEnquiryHandler({
    store, destinations, env: {}, now: () => new Date('2026-10-24T06:30:00.000Z'),
    uuid: () => 'abcdef12-3456-4789-8123-abcdefabcdef',
    sendNotification: async (...args) => { calls += 1; notified = args[0]; return {results: {email: 'sent'}, status: 'sent', whatsappFallbackUrl: null}; }
  });
  const response = await handler(makeRequest(requestPayload()));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.reference, 'KTT-20261024-ABCDEF12');
  assert.equal(result.notificationStatus, 'sent');
  assert.equal(calls, 1);
  assert.equal(notified.phone, '+919876543210');
  assert.equal(notified.state, 'Jharkhand');
  assert.equal(notified.destinationName, 'Baidyanath Dham');
  assert.equal(notified.durationDays, 3);
  assert.equal(notified.travellers, 4);
  const stored = await store.getJSON(`enquiries/${result.reference}`);
  assert.equal(stored.requirements, 'Please call after 5 pm.');
});

test('repeated request token returns the existing reference without a second notification', async () => {
  const store = new MemoryStore();
  let notifications = 0;
  const handler = createEnquiryHandler({
    store, destinations, now: () => new Date('2026-10-24T06:30:00.000Z'),
    uuid: () => 'abcdef12-3456-4789-8123-abcdefabcdef',
    sendNotification: async () => { notifications += 1; return {results: {email: 'sent'}, status: 'sent', whatsappFallbackUrl: null}; }
  });
  const first = await (await handler(makeRequest(requestPayload()))).json();
  const second = await (await handler(makeRequest(requestPayload()))).json();
  assert.equal(second.reference, first.reference);
  assert.equal(second.duplicate, true);
  assert.equal(notifications, 1);
});

test('notification failure still confirms only the saved enquiry and provides an explicit WhatsApp fallback', async () => {
  const store = new MemoryStore();
  const handler = createEnquiryHandler({
    store, destinations, env: {}, now: () => new Date('2026-10-24T06:30:00.000Z'),
    uuid: () => 'abcdef12-3456-4789-8123-abcdefabcdef',
    sendNotification: async () => ({results: {email: 'failed'}, status: 'not_sent', whatsappFallbackUrl: 'https://wa.me/919135839746?text=test'})
  });
  const response = await handler(makeRequest(requestPayload()));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.notificationStatus, 'not_sent');
  assert.equal(result.whatsappFallbackUrl, 'https://wa.me/919135839746?text=test');
  assert.equal((await store.getJSON(`enquiries/${result.reference}`)).notificationStatus, 'not_sent');
});

test('foreign origins and non-POST requests are rejected', async () => {
  const handler = createEnquiryHandler({store: new MemoryStore(), destinations});
  const foreign = new Request('https://kailashpatitourtravel.com/api/enquiries', {
    method: 'POST', headers: {'content-type':'application/json', origin:'https://example.org'}, body: '{}'
  });
  assert.equal((await handler(foreign)).status, 403);
  assert.equal((await handler(new Request('https://kailashpatitourtravel.com/api/enquiries'))).status, 405);
});
