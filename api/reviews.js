import { Redis } from '@upstash/redis';
import { createPublicReviewsHandler } from './reviews-service.mjs';

function getHandler() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  return createPublicReviewsHandler({ store: redis });
}

export default async function handler(req, res) {
  const run = getHandler();
  if (!run) return res.status(503).json({ error: 'Review storage is not configured.' });
  try {
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {});
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https');
    const request = new Request(`${protocol}://${host}${req.url || '/api/reviews'}`, {
      method: req.method,
      headers: { 'content-type': req.headers['content-type'] || 'application/json', origin: req.headers.origin || '', 'x-real-ip': req.headers['x-real-ip'] || '', 'x-forwarded-for': req.headers['x-forwarded-for'] || '' },
      body
    });
    const response = await run(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await response.text());
  } catch (error) {
    console.error('Public reviews endpoint failed:', error?.name || 'UnknownError');
    res.status(503).json({ error: 'Reviews are temporarily unavailable.' });
  }
}
