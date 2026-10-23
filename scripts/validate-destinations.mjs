import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateDestinations } from './destination-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'data', 'destinations.json');
const outputPath = path.join(root, 'data', 'destinations.published.json');
const publishing = process.argv.includes('--publish');
const records = JSON.parse(await readFile(inputPath, 'utf8'));
const { errors, warnings, eligible } = validateDestinations(records);

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  if (publishing) await writeFile(outputPath, `${JSON.stringify(eligible, null, 2)}\n`, 'utf8');
  console.log(`Validated ${records.length} destination record(s); ${eligible.length} eligible to publish.`);
  if (warnings.length) console.log(`Drafts not published:\n- ${warnings.join('\n- ')}`);
  if (publishing) console.log(`Published dataset written to ${path.relative(root, outputPath)}.`);
}
