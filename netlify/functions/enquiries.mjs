import { getStore } from '@netlify/blobs';
import { createEnquiryHandler } from './enquiry-service.mjs';
import publishedDestinations from '../../data/destinations.published.json' with { type: 'json' };

export const config = {
  path: '/.netlify/functions/enquiries',
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: 'ip', action: 'rate_limit' }
};

const store = getStore({ name: 'travel-enquiries', region: process.env.BLOBS_REGION || 'ap-southeast-1' });
const handler = createEnquiryHandler({ store, destinations: publishedDestinations, env: process.env });

export default async request => {
  try { return await handler(request); }
  catch (error) {
    console.error('Travel enquiry endpoint failed:', error?.name || 'UnknownError');
    return new Response(JSON.stringify({ error: 'We could not save your enquiry right now. Please retry or call 9135839746.' }), {
      status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
