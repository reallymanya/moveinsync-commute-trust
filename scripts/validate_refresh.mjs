import fs from 'node:fs/promises';

const reviews = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));
const metadata = JSON.parse(await fs.readFile('data/playstore_metadata.json', 'utf8'));
const manual = JSON.parse(
  await fs.readFile('analysis/manually_reviewed_sample.json', 'utf8'),
);

const newest = reviews.filter((review) =>
  review.collection.split(',').includes('newest'),
);
const duplicateCount = reviews.length - new Set(reviews.map((review) => review.review_id)).size;
const failures = [];

if (newest.length < 100) failures.push(`Newest sample is unexpectedly small (${newest.length}).`);
if (duplicateCount) failures.push(`${duplicateCount} duplicate review IDs remain.`);
if (!metadata.collected_at) failures.push('Collection timestamp is missing.');
if (!metadata.app?.score || !metadata.app?.ratings) failures.push('Play Store listing metadata is incomplete.');
if (manual.length !== 160) failures.push(`Frozen manual snapshot changed size (${manual.length}, expected 160).`);

if (failures.length) {
  console.error(`Refresh validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    status: 'ok',
    collected_at: metadata.collected_at,
    unique_reviews: reviews.length,
    newest_reviews: newest.length,
    frozen_manual_reviews: manual.length,
    duplicate_review_ids: duplicateCount,
  }, null, 2));
}
