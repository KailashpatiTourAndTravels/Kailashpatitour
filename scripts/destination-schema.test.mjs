import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDestinations } from './destination-schema.mjs';
import { readFile } from 'node:fs/promises';

const seed = JSON.parse(await readFile(new URL('../data/destinations.json', import.meta.url), 'utf8'));

test('officially sourced examples can publish while unknown optional fields stay null', () => {
  const result = validateDestinations(seed);
  assert.deepEqual(result.errors, []);
  assert.equal(result.eligible.length, seed.length);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.eligible[0].latitude, null);
  assert.equal(result.eligible[0].image_url, null);
});

test('duplicate ids and slugs are rejected', () => {
  const records = [seed[0], { ...seed[1], id: seed[0].id, slug: seed[0].slug }];
  const result = validateDestinations(records);
  assert.ok(result.errors.some(error => error.includes('duplicate id')));
  assert.ok(result.errors.some(error => error.includes('duplicate slug')));
});

test('invalid coordinates are rejected for verified records', () => {
  const record = { ...seed[0], verification_status: 'verified', latitude: 120, longitude: 85 };
  const result = validateDestinations([record]);
  assert.ok(result.errors.some(error => error.includes('latitude is outside')));
  assert.equal(result.eligible.length, 0);
});

test('an image cannot be published without a local path and rights metadata', () => {
  const result = validateDestinations([{ ...seed[0], image_url: 'https://example.com/photo.jpg' }]);
  assert.ok(result.errors.some(error => error.includes('licensed local image path')));
  assert.equal(result.eligible.length, 0);
});

test('one missing coordinate is rejected', () => {
  const result = validateDestinations([{ ...seed[0], latitude: 24.48 }]);
  assert.ok(result.errors.some(error => error.includes('both be supplied or both be null')));
});
