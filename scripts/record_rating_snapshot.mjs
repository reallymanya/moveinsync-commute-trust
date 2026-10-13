import fs from 'node:fs/promises';

const metadata = JSON.parse(await fs.readFile('data/playstore_metadata.json', 'utf8'));
const reviews = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));
const output = 'data/rating_snapshots.csv';
const fields = [
  'collected_at',
  'listing_score',
  'rating_count',
  'written_review_count',
  'installs',
  'current_version',
  'newest_sample_size',
  'newest_sample_average',
  'newest_sample_low_star_share',
  'newest_review_date',
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
  newest_sample_size: 0,
  newest_sample_average: '',
  newest_sample_low_star_share: '',
  newest_review_date: '',
};
const newest = reviews.filter((review) => review.collection.split(',').includes('newest'));
row.newest_sample_size = newest.length;
row.newest_sample_average = (
  newest.reduce((sum, review) => sum + Number(review.rating), 0) / newest.length
).toFixed(3);
row.newest_sample_low_star_share = (
  newest.filter((review) => Number(review.rating) <= 2).length / newest.length
).toFixed(4);
row.newest_review_date = newest.reduce(
  (latest, review) => (review.date > latest ? review.date : latest),
  newest[0]?.date ?? '',
);
const header = existing.trim() ? existing.trimEnd() : fields.join(',');
const next = `${header}\n${fields.map((field) => csvEscape(row[field])).join(',')}\n`;
await fs.writeFile(output, next);
console.log(JSON.stringify(row, null, 2));
