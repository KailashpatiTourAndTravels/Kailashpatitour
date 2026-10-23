const allowedStatuses = new Set(['needs_verification', 'verified']);

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const httpsUrl = value => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};
const localImagePath = value => typeof value === 'string' && /^\/?images\/[\w./-]+\.(avif|webp|png|jpe?g)$/i.test(value) && !value.includes('..');

export function validateDestinations(records) {
  const errors = [];
  const warnings = [];
  const eligible = [];
  if (!Array.isArray(records)) return { errors: ['Destination data must be a JSON array.'], warnings, eligible };

  const ids = new Set();
  const slugs = new Set();
  for (const [index, place] of records.entries()) {
    const label = place?.id || `record ${index + 1}`;
    const fail = message => errors.push(`${label}: ${message}`);
    for (const key of ['id', 'slug', 'name', 'state', 'description', 'starting_city']) {
      if (!nonEmpty(place?.[key])) fail(`"${key}" must be a non-empty string.`);
    }
    if (ids.has(place?.id)) fail(`duplicate id "${place.id}".`);
    if (slugs.has(place?.slug)) fail(`duplicate slug "${place.slug}".`);
    if (place?.id) ids.add(place.id);
    if (place?.slug) slugs.add(place.slug);
    for (const key of ['aliases', 'categories', 'tags', 'attractions', 'nearby_places']) {
      if (!Array.isArray(place?.[key])) fail(`"${key}" must be an array.`);
    }
    if (!allowedStatuses.has(place?.verification_status)) fail('verification_status must be needs_verification or verified.');

    const hasLat = place?.latitude !== null && place?.latitude !== undefined;
    const hasLon = place?.longitude !== null && place?.longitude !== undefined;
    if (hasLat !== hasLon) fail('latitude and longitude must both be supplied or both be null.');
    if (hasLat && (!Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90)) fail('latitude is outside the valid range.');
    if (hasLon && (!Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180)) fail('longitude is outside the valid range.');
    if (place?.distance_from_origin_km !== null && place?.distance_from_origin_km !== undefined && (!Number.isFinite(place.distance_from_origin_km) || place.distance_from_origin_km < 0)) {
      fail('distance_from_origin_km must be a non-negative number or null.');
    }
    if (place?.distance_from_origin_km !== null && place?.distance_from_origin_km !== undefined && !httpsUrl(place.distance_source_url)) fail('a distance requires an HTTPS distance_source_url.');
    if (place?.suggested_duration_days !== null && place?.suggested_duration_days !== undefined && (!Number.isInteger(place.suggested_duration_days) || place.suggested_duration_days < 1)) {
      fail('suggested_duration_days must be a positive integer or null.');
    }
    if (place?.last_verified !== null && place?.last_verified !== undefined && !validDate(place.last_verified)) fail('last_verified must use a real YYYY-MM-DD date or null.');
    if (place?.best_season && !httpsUrl(place.season_source_url)) fail('best_season requires an HTTPS season_source_url.');
    if (place?.verification_status !== 'verified') warnings.push(`${label}: remains a draft (${place?.verification_status || 'unknown status'}).`);

    const requirements = [
      [httpsUrl(place?.official_source_url), 'HTTPS official source'],
      [validDate(place?.last_verified), 'last verified date']
    ];
    if (hasLat || hasLon) requirements.push([hasLat && hasLon && httpsUrl(place?.coordinate_source_url), 'paired coordinates with HTTPS coordinate source']);
    if (place?.image_url) requirements.push([
      localImagePath(place.image_url) && nonEmpty(place.image_credit) && nonEmpty(place.image_license) && httpsUrl(place.image_source_url),
      'licensed local image path, credit, license and HTTPS image source'
    ]);
    const missing = requirements.filter(([valid]) => !valid).map(([, field]) => field);
    if (place?.verification_status === 'verified' && missing.length) fail(`cannot publish as verified; missing/invalid ${missing.join(', ')}.`);
    if (place?.verification_status === 'verified' && !missing.length) eligible.push(place);
  }
  return { errors, warnings, eligible };
}
