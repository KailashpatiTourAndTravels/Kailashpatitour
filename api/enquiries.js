import { Redis } from '@upstash/redis';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEnquiryHandler } from '../netlify/functions/enquiry-service.mjs';

// @upstash/redis reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Vercel KV store adapter ────────────────────────────────────────────────
// Mimics the @netlify/blobs store interface used by enquiry-service.mjs
const store = {
  /** Returns parsed JSON value or null */
  async getJSON(key) {
    return await kv.get(key); // kv.get already returns parsed JSON or null
  },

  /**
   * Sets a JSON value.
   * When opts.onlyIfNew is true, uses the NX flag (set only if key does not exist).
   * Returns { modified: true } if the key was set, { modified: false } if it already existed.
   */
  async setJSON(key, value, opts = {}) {
    if (opts.onlyIfNew) {
      // kv.set with nx returns 'OK' if set, null if key already existed
      const result = await kv.set(key, value, { nx: true });
      return { modified: result === 'OK' };
    }
    await kv.set(key, value);
    return { modified: true };
  },
};

// ── Load destinations from filesystem ─────────────────────────────────────
const destinationsPath = resolve(__dirname, '..', 'data', 'destinations.published.json');
let destinations;
try {
  const raw = await readFile(destinationsPath, 'utf-8');
  destinations = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load destinations.published.json:', err?.message);
  destinations = [];
}

// ── Build the Fetch-API-based handler from enquiry-service ─────────────────
const enquiryHandler = createEnquiryHandler({
  store,
  destinations,
  env: process.env,
});

// ── CORS helpers ───────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function applyCorsHeaders(res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

// ── Adapter: Vercel (Node IncomingMessage/ServerResponse) ↔ Fetch API ──────
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ── Vercel serverless function entry point ─────────────────────────────────
export default async function handler(req, res) {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.status(204).end();
    return;
  }

  applyCorsHeaders(res);

  try {
    // Read raw body before constructing the Fetch Request
    const body = await readBody(req);

    // Build a Fetch-API-compatible Request from the Vercel IncomingMessage
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    const fetchRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    });

    // Delegate to the Fetch-API handler from enquiry-service
    const fetchResponse = await enquiryHandler(fetchRequest);

    // Forward status, headers, and body back to the Vercel response
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const responseText = await fetchResponse.text();
    res.send(responseText);
  } catch (error) {
    console.error('Travel enquiry endpoint failed:', error?.name || 'UnknownError', error?.message);
    res.status(503).json({
      error: 'We could not save your enquiry right now. Please retry or call 9135839746.',
    });
  }
}
