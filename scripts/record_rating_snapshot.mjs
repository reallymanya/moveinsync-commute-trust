import fs from 'node:fs/promises';

const metadata = JSON.parse(await fs.readFile('data/playstore_metadata.json', 'utf8'));
const output = 'data/rating_snapshots.csv';
const fields = [
  'collected_at',
  'listing_score',
  'rating_count',
  'written_review_count',
  'installs',
  'current_version',
];

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

let existing = '';
try {
  existing = await fs.readFile(output, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const seen = new Set(
  existing
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(',')[0])
    .filter(Boolean),
);

if (seen.has(metadata.collected_at)) {
  console.log(`Rating snapshot already recorded for ${metadata.collected_at}`);
  process.exit(0);
}

const row = {
  collected_at: metadata.collected_at,
  listing_score: metadata.app.score,
  rating_count: metadata.app.ratings,
  written_review_count: metadata.app.reviews,
  installs: metadata.app.installs,
  current_version: metadata.app.version,
};
const header = existing.trim() ? existing.trimEnd() : fields.join(',');
const next = `${header}\n${fields.map((field) => csvEscape(row[field])).join(',')}\n`;
await fs.writeFile(output, next);
console.log(JSON.stringify(row, null, 2));
