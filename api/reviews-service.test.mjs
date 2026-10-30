import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminReviewsHandler, createPublicReviewsHandler, summarizeReviews } from './reviews-service.mjs';

class MemoryStore {
  values = new Map();
  lists = new Map();
  counters = new Map();
  async get(key) { return this.values.get(key) ?? null; }
  async set(key, value, options = {}) {
    if (options.nx && this.values.has(key)) return null;
    this.values.set(key, value);
    return 'OK';
  }
  async del(key) { this.values.delete(key); return 1; }
  async incr(key) { const next = (this.counters.get(key) || 0) + 1; this.counters.set(key, next); return next; }
  async expire() { return 1; }
  async lpush(key, value) { const list = this.lists.get(key) || []; list.unshift(value); this.lists.set(key, list); return list.length; }
  async lrange(key, start, end) { return (this.lists.get(key) || []).slice(start, end < 0 ? undefined : end + 1); }
  async lrem(key, count, value) {
    const list = this.lists.get(key) || [];
    let removed = 0;
    this.lists.set(key, list.filter(item => {
      if (item === value && (!count || removed < count)) { removed += 1; return false; }
      return true;
    }));
    return removed;
  }
}

const jsonRequest = (url, method, data, headers = {}) => new Request(url, {
  method,
  headers: { 'content-type': 'application/json', origin: new URL(url).origin, ...headers },
  body: method === 'GET' ? undefined : JSON.stringify(data)
});

test('rating summary uses approved reviews only and handles empty state', () => {
  const empty = summarizeReviews([{ rating: 5, status: 'pending' }]);
  assert.equal(empty.totalReviews, 0);
  assert.equal(empty.averageRating, null);
  const stats = summarizeReviews([
    ...[5, 5, 5, 4, 4, 3, 5, 4, 5, 2].map(rating => ({ rating, status: 'approved' })),
    { rating: 1, status: 'rejected' }, { rating: 1, status: 'pending' }
  ]);
  assert.equal(stats.totalReviews, 10);
  // The supplied example list sums to 42, so its mathematical average is 4.2.
  assert.equal(stats.averageRating, 4.2);
  assert.equal(stats.distribution[5].count, 5);
  assert.equal(stats.distribution[5].percentage, 50);
  assert.equal(stats.distribution[4].count, 3);
  assert.equal(stats.distribution[3].count, 1);
  assert.equal(stats.distribution[2].count, 1);
  assert.equal(stats.distribution[1].count, 0);
});

test('public review feed returns six latest approved messages and computes 5-star and 4-star mix from twelve test reviews', async () => {
  const store = new MemoryStore();
  for (let index = 1; index <= 12; index += 1) {
    const rating = index <= 8 ? 5 : 4;
    const id = `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`;
    const record = {
      id,
      name: `Test Traveler ${String(index).padStart(2, '0')}`,
      destination: index % 2 ? 'Baba Baidyanath Dham Temple' : 'Tarapith Temple',
      rating,
      review: `TEST ONLY: ${rating}-star review ${index}; this fixture is never written to production storage.`,
      status: 'approved',
      submittedAt: new Date(Date.UTC(2026, 9, index)).toISOString(),
      approvedAt: new Date(Date.UTC(2026, 9, index)).toISOString()
    };
    await store.set(`review:${id}`, record);
    await store.lpush('reviews:approved', id);
  }
  const hidden = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Hidden Test', destination: 'Deoghar', rating: 1, review: 'This pending test review must not reach the public feed.', status: 'pending', submittedAt: '2026-10-31T00:00:00.000Z' };
  await store.set(`review:${hidden.id}`, hidden);
  await store.lpush('reviews:pending', hidden.id);

  const handler = createPublicReviewsHandler({ store });
  const response = await handler(new Request('https://example.com/api/reviews'));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.stats.totalReviews, 12);
  assert.equal(data.stats.averageRating, 4.7);
  assert.equal(data.stats.distribution[5].count, 8);
  assert.equal(data.stats.distribution[5].percentage, 67);
  assert.equal(data.stats.distribution[4].count, 4);
  assert.equal(data.stats.distribution[4].percentage, 33);
  assert.equal(data.stats.distribution[1].count, 0);
  assert.equal(data.reviews.length, 6);
  assert.ok(data.reviews.every(review => review.status === 'approved' && review.review.startsWith('TEST ONLY:')));
  assert.ok(data.reviews.every(review => review.name !== hidden.name));
});

test('submissions validate, are rate limited and remain private until approved', async () => {
  const store = new MemoryStore();
  const publicHandler = createPublicReviewsHandler({ store, uuid: () => '123e4567-e89b-42d3-a456-426614174000' });
  const valid = { name: 'Traveler Name', destination: 'Baba Baidyanath Dham Temple', rating: '5', review: 'The driver was polite and arrived on time for our family trip.' };
  const invalid = await publicHandler(jsonRequest('https://example.com/api/reviews', 'POST', { ...valid, rating: '6' }));
  assert.equal(invalid.status, 400);
  const submitted = await publicHandler(jsonRequest('https://example.com/api/reviews', 'POST', valid, { 'x-real-ip': '192.0.2.1' }));
  assert.equal(submitted.status, 201);
  const pendingStats = await (await publicHandler(new Request('https://example.com/api/reviews'))).json();
  assert.equal(pendingStats.stats.totalReviews, 0);
  assert.equal(pendingStats.reviews.length, 0);
  const duplicate = await publicHandler(jsonRequest('https://example.com/api/reviews', 'POST', valid, { 'x-real-ip': '192.0.2.1' }));
  assert.equal(duplicate.status, 409);
});

test('admin authentication gates moderation and approved records update public ratings', async () => {
  const store = new MemoryStore();
  const now = () => new Date('2026-10-31T12:00:00.000Z');
  const uuid = () => '123e4567-e89b-42d3-a456-426614174000';
  const publicHandler = createPublicReviewsHandler({ store, now, uuid });
  const adminHandler = createAdminReviewsHandler({ store, env: { REVIEWS_ADMIN_PASSWORD: 'a-very-long-admin-password', REVIEWS_SESSION_SECRET: 'a-separate-32-character-session-secret' }, now });
  await publicHandler(jsonRequest('https://example.com/api/reviews', 'POST', { name: 'Traveler Name', destination: 'Tarapith Temple', rating: '5', review: 'A comfortable journey with a courteous and professional driver.' }));
  const blocked = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'list' }));
  assert.equal(blocked.status, 401);
  const login = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'login', password: 'a-very-long-admin-password' }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const listed = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'list' }, { cookie }));
  const listData = await listed.json();
  assert.equal(listData.counts.pending, 1);
  const approved = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'approve', id: uuid() }, { cookie }));
  assert.equal(approved.status, 200);
  const publicData = await (await publicHandler(new Request('https://example.com/api/reviews'))).json();
  assert.equal(publicData.stats.totalReviews, 1);
  assert.equal(publicData.stats.averageRating, 5);
  const rejected = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'reject', id: uuid() }, { cookie }));
  assert.equal(rejected.status, 200);
  const afterReject = await (await publicHandler(new Request('https://example.com/api/reviews'))).json();
  assert.equal(afterReject.stats.totalReviews, 0);
  const deleted = await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'delete', id: uuid() }, { cookie }));
  assert.equal(deleted.status, 200);
  const afterDelete = await (await adminHandler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'list' }, { cookie }))).json();
  assert.equal(afterDelete.counts.total, 0);
});

test('admin login rejects wrong passwords and cross-origin moderation', async () => {
  const store = new MemoryStore();
  const handler = createAdminReviewsHandler({ store, env: { REVIEWS_ADMIN_PASSWORD: 'another-secure-admin-password' } });
  const badLogin = await handler(jsonRequest('https://example.com/api/reviews-admin', 'POST', { action: 'login', password: 'wrong-password' }));
  assert.equal(badLogin.status, 401);
  const crossOrigin = new Request('https://example.com/api/reviews-admin', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' }, body: JSON.stringify({ action: 'list' })
  });
  assert.equal((await handler(crossOrigin)).status, 403);
});
