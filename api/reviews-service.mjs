import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
});
const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
const statusKey = status => `reviews:${status}`;
const reviewKey = id => `review:${id}`;
const sessionCookie = 'review_admin_session';
const sessionMaxAge = 8 * 60 * 60;

export function summarizeReviews(reviews) {
  const approved = reviews.filter(review => review.status === 'approved');
  const counts = [0, 0, 0, 0, 0];
  let total = 0;
  for (const review of approved) {
    const rating = Number(review.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      counts[rating - 1] += 1;
      total += rating;
    }
  }
  const count = approved.length;
  return {
    totalReviews: count,
    averageRating: count ? Math.round((total / count) * 10) / 10 : null,
    distribution: Object.fromEntries([5, 4, 3, 2, 1].map(rating => {
      const number = counts[rating - 1];
      return [rating, { count: number, percentage: count ? Math.round(number / count * 100) : 0 }];
    }))
  };
}

function validateReview(input) {
  const errors = {};
  const name = clean(input?.name).slice(0, 81);
  const destination = clean(input?.destination).slice(0, 101);
  const reviewText = clean(input?.review).slice(0, 1001);
  const rating = Number(input?.rating);
  if (input?.website) errors.website = 'Invalid submission.';
  if (name.length < 2 || name.length > 80) errors.name = 'Enter a name between 2 and 80 characters.';
  if (destination.length < 2 || destination.length > 100) errors.destination = 'Enter a destination between 2 and 100 characters.';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Choose a rating from 1 to 5 stars.';
  if (reviewText.length < 20 || reviewText.length > 1000) errors.review = 'Write between 20 and 1,000 characters.';
  return { errors, review: Object.keys(errors).length ? null : { name, destination, rating, review: reviewText } };
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieSettings(request, maxAge = sessionMaxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${sessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function sessionValue(request, env, now) {
  const password = env.REVIEWS_ADMIN_PASSWORD || '';
  if (password.length < 16) return null;
  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${sessionCookie}=`));
  const token = cookie?.slice(sessionCookie.length + 1);
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const secret = env.REVIEWS_SESSION_SECRET || password;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Math.floor(now().getTime() / 1000) ? payload : null;
  } catch { return null; }
}

function makeSession(env, now) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now().getTime() / 1000) + sessionMaxAge, nonce: randomBytes(12).toString('hex') })).toString('base64url');
  const signature = createHmac('sha256', env.REVIEWS_SESSION_SECRET || env.REVIEWS_ADMIN_PASSWORD).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

async function readReviews(store, status, limit = 0) {
  const ids = await store.lrange(statusKey(status), 0, limit ? limit - 1 : -1);
  const records = await Promise.all(ids.map(id => store.get(reviewKey(id))));
  return records.filter(record => record && record.status === status);
}

async function rateLimit(store, key, limit, windowSeconds) {
  const count = await store.incr(key);
  if (count === 1) await store.expire(key, windowSeconds);
  return count <= limit;
}

export function createPublicReviewsHandler({ store, now = () => new Date(), uuid = randomUUID }) {
  return async request => {
    if (request.method === 'GET') {
      try {
        const reviews = await readReviews(store, 'approved');
        const stats = summarizeReviews(reviews);
        return json({ reviews: reviews.slice(0, 6), stats });
      } catch { return json({ error: 'Reviews are temporarily unavailable.' }, 503); }
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!originAllowed(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return json({ error: 'Send a JSON review.' }, 415);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: 'Review is too large.' }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return json({ error: 'Review data is invalid.' }, 400); }
    const { errors, review } = validateReview(input);
    if (Object.keys(errors).length) return json({ error: 'Please correct the highlighted fields.', fields: errors }, 400);
    try {
      const forwarded = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      const ipHash = createHash('sha256').update(forwarded).digest('hex');
      if (!await rateLimit(store, `review-rate:${ipHash}`, 3, 86400)) return json({ error: 'You have reached the review submission limit. Please try again tomorrow.' }, 429);
      const duplicateHash = createHash('sha256').update(`${review.name.toLowerCase()}\n${review.destination.toLowerCase()}\n${review.review.toLowerCase()}`).digest('hex');
      const duplicate = await store.set(`review-dedupe:${duplicateHash}`, '1', { nx: true, ex: 604800 });
      if (duplicate !== 'OK') return json({ error: 'This review has already been submitted.' }, 409);
      const id = uuid();
      const record = { id, ...review, status: 'pending', submittedAt: now().toISOString(), approvedAt: null };
      await store.set(reviewKey(id), record);
      await store.lpush(statusKey('pending'), id);
      return json({ message: 'Thank you for sharing your experience! Your review has been submitted and will be published after approval.' }, 201);
    } catch { return json({ error: 'Your review could not be saved. Please try again later.' }, 503); }
  };
}

export function createAdminReviewsHandler({ store, env = {}, now = () => new Date() }) {
  return async request => {
    if (!originAllowed(request)) return json({ error: 'Request origin is not allowed.' }, 403);
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return json({ error: 'Send JSON.' }, 415);
    const raw = await request.text();
    if (raw.length > 4000) return json({ error: 'Request is too large.' }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return json({ error: 'Request data is invalid.' }, 400); }
    const action = clean(input.action);
    if (action === 'login') {
      const password = env.REVIEWS_ADMIN_PASSWORD || '';
      if (password.length < 16) return json({ error: 'Admin access is not configured. Set a password of at least 16 characters in the hosting environment.' }, 503);
      const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      const ipHash = createHash('sha256').update(clientIp).digest('hex');
      try {
        if (!await rateLimit(store, `review-login:${ipHash}`, 5, 900)) return json({ error: 'Too many login attempts. Try again in 15 minutes.' }, 429);
      } catch { return json({ error: 'Admin access is temporarily unavailable.' }, 503); }
      if (!constantTimeEqual(input.password || '', password)) return json({ error: 'Incorrect password.' }, 401);
      return json({ message: 'Signed in.' }, 200, { 'Set-Cookie': `${sessionCookie}=${makeSession(env, now)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionMaxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` });
    }
    if (action === 'logout') return json({ message: 'Signed out.' }, 200, { 'Set-Cookie': cookieSettings(request, 0) });
    if (!sessionValue(request, env, now)) return json({ error: 'Admin authentication required.' }, 401);
    try {
      if (action === 'list') {
        const [pending, approved, rejected] = await Promise.all(['pending', 'approved', 'rejected'].map(status => readReviews(store, status)));
        return json({ counts: { pending: pending.length, approved: approved.length, rejected: rejected.length, total: pending.length + approved.length + rejected.length }, reviews: [...pending, ...approved, ...rejected].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)) });
      }
      const id = clean(input.id);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'A valid review ID is required.' }, 400);
      const record = await store.get(reviewKey(id));
      if (!record) return json({ error: 'Review not found.' }, 404);
      if (action === 'delete') {
        await store.lrem(statusKey(record.status), 0, id);
        await store.del(reviewKey(id));
        return json({ message: 'Review deleted.' });
      }
      if (!['approve', 'reject'].includes(action)) return json({ error: 'Unknown action.' }, 400);
      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      if (record.status !== nextStatus) {
        await store.lrem(statusKey(record.status), 0, id);
        record.status = nextStatus;
        record.approvedAt = nextStatus === 'approved' ? now().toISOString() : null;
        await store.set(reviewKey(id), record);
        await store.lpush(statusKey(nextStatus), id);
      }
      return json({ message: `Review ${nextStatus}.`, review: record });
    } catch { return json({ error: 'Review management is temporarily unavailable.' }, 503); }
  };
}
