import fs from 'node:fs/promises';

const reviewRows = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));
const reviewsById = new Map(reviewRows.map((review) => [review.review_id, review]));
const labelFiles = [
  ['development', 'analysis/manual_labels.json'],
  ['audit_1', 'analysis/holdout_labels.json'],
  ['audit_2', 'analysis/final_validation_labels.json'],
  ['frozen_audit', 'analysis/frozen_validation_labels.json'],
];

const combined = [];
for (const [labelSet, file] of labelFiles) {
  const labels = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const label of labels) {
    const review = reviewsById.get(label.review_id);
    if (!review) throw new Error(`Review not found: ${label.review_id}`);
    combined.push({ ...review, ...label, label_set: labelSet });
  }
}

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const fields = [...new Set(combined.flatMap((row) => Object.keys(row)))];
const csv = [
  fields.join(','),
  ...combined.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
].join('\n');

const complaintRows = combined.filter(
  (row) => !['positive', 'unclear'].includes(row.primary_theme),
);
const newestDate = new Date(
  Math.max(...combined.map((row) => new Date(row.date).getTime())),
);
const recentStart = new Date(newestDate);
recentStart.setUTCDate(recentStart.getUTCDate() - 90);
const recentComplaints = complaintRows.filter(
  (row) => new Date(row.date) >= recentStart,
);
const countBy = (rows, key) => {
  const counts = {};
  for (const row of rows) counts[row[key]] = (counts[row[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};

const summary = {
  manually_reviewed: combined.length,
  positive: combined.filter((row) => row.primary_theme === 'positive').length,
  unclear: combined.filter((row) => row.primary_theme === 'unclear').length,
  specific_complaints: complaintRows.length,
  complaint_theme_counts: countBy(complaintRows, 'primary_theme'),
  complaint_theme_shares: Object.fromEntries(
    Object.entries(countBy(complaintRows, 'primary_theme')).map(([theme, count]) => [
      theme,
      Number((count / complaintRows.length).toFixed(3)),
    ]),
  ),
  recent_window: {
    start: recentStart.toISOString(),
    end: newestDate.toISOString(),
    specific_complaints: recentComplaints.length,
    complaint_theme_counts: countBy(recentComplaints, 'primary_theme'),
  },
  rating_counts: countBy(combined, 'rating'),
  label_set_counts: countBy(combined, 'label_set'),
  interpretation: 'This is an intentionally complaint-heavy, manually coded sample for theme discovery. Its theme shares are directional and must not be treated as population estimates for all Play Store reviews.',
};

await Promise.all([
  fs.writeFile('analysis/manually_reviewed_sample.csv', `${csv}\n`),
  fs.writeFile('analysis/manually_reviewed_sample.json', `${JSON.stringify(combined, null, 2)}\n`),
  fs.writeFile('analysis/manual_theme_summary.json', `${JSON.stringify(summary, null, 2)}\n`),
]);

console.log(JSON.stringify(summary, null, 2));
