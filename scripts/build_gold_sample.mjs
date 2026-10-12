import fs from 'node:fs/promises';

const reviews = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));
const labels = JSON.parse(await fs.readFile('analysis/manual_labels.json', 'utf8'));
const reviewsById = new Map(reviews.map((review) => [review.review_id, review]));

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const rows = labels.map((label) => {
  const review = reviewsById.get(label.review_id);
  if (!review) throw new Error(`Review not found: ${label.review_id}`);
  return { ...review, ...label };
});

const fields = Object.keys(rows[0]);
const csv = [
  fields.join(','),
  ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
].join('\n');

await fs.writeFile('analysis/gold_sample.csv', `${csv}\n`);
console.log(`Wrote ${rows.length} manually labelled reviews to analysis/gold_sample.csv`);
