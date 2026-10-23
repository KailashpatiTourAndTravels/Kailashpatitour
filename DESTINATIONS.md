# Destination data

This project is a static HTML/CSS/JavaScript website with a Netlify Functions endpoint. `data/destinations.json` is the editable import dataset. The initial eight destination records have verified names and state associations from official government sources; coordinates, distances, seasons and photos remain unknown.

## Validate and publish

Run the checks with Node.js (no package install is required):

```powershell
node scripts/validate-destinations.mjs
node --test scripts/destination-schema.test.mjs
```

After adding records that have been researched and rights-cleared, generate the public dataset:

```powershell
node scripts/validate-destinations.mjs --publish
```

The command writes eligible records to `data/destinations.published.json`. The website reads only that published file. A record marked `verified` needs an HTTPS official source and verification date. Coordinates, season and images are optional; if supplied, coordinates must be paired and valid with a source URL, season information needs a source, and images need a local path under `images/`, credit, license and HTTPS source. Distances are optional; if present, they need a non-negative value and an HTTPS routing/source reference. Unknown values should remain `null`.

## Record conventions

- Keep `id` and `slug` unique.
- Use ISO dates (`YYYY-MM-DD`) for `last_verified`.
- Store web-ready, rights-cleared images in `images/`; keep the attribution, license and original source URL with the record.
- Do not mark a record `verified` until its public claims and sources have been reviewed.
- The publisher outputs records marked `verified` with an HTTPS official source and verification date. Any supplied coordinates, distance, season and image metadata are validated before publication. The browser selection searches names, aliases and categories within the selected state.

The eight initial entries are not a complete catalog. Additional official-source research is needed to reach the requested 100–200 Phase 1 records. The enquiry form collects no unverified destination as an option.
