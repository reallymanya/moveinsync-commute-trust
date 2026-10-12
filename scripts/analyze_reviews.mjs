import fs from 'node:fs/promises';

const reviews = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));
const metadata = JSON.parse(await fs.readFile('data/playstore_metadata.json', 'utf8'));
const labelFiles = [
  'analysis/manual_labels.json',
  'analysis/holdout_labels.json',
  'analysis/final_validation_labels.json',
  'analysis/frozen_validation_labels.json',
];
const labels = (await Promise.all(labelFiles.map(async (file) => JSON.parse(await fs.readFile(file, 'utf8'))))).flat();
const labelsById = new Map(labels.map((label) => [label.review_id, label]));
const manuallyReviewed = reviews
  .filter((review) => labelsById.has(review.review_id))
  .map((review) => ({ ...review, ...labelsById.get(review.review_id) }));

const round = (value, digits = 3) => Number(value.toFixed(digits));
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const countBy = (rows, keyFn) => {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};
const summarizeRatings = (rows) => ({
  reviews: rows.length,
  average_rating: rows.length ? round(average(rows.map((row) => row.rating)), 2) : null,
  one_star_share: rows.length ? round(rows.filter((row) => row.rating === 1).length / rows.length) : null,
  low_star_share: rows.length ? round(rows.filter((row) => row.rating <= 2).length / rows.length) : null,
});
const isoDate = (date) => date.toISOString().slice(0, 10);
const mondayOfWeek = (value) => {
  const date = new Date(value);
  const day = date.getUTCDay();
  const distance = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + distance);
  date.setUTCHours(0, 0, 0, 0);
  return isoDate(date);
};
const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const toCsv = (rows) => {
  if (!rows.length) return '';
  const fields = Object.keys(rows[0]);
  return [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
};

const newest = reviews.filter((review) => review.collection.split(',').includes('newest'));
const newestDate = new Date(Math.max(...newest.map((review) => new Date(review.date).getTime())));
const recentStart = new Date(newestDate);
recentStart.setUTCDate(recentStart.getUTCDate() - 90);

const byWeek = new Map();
for (const review of newest) {
  const key = mondayOfWeek(review.date);
  if (!byWeek.has(key)) byWeek.set(key, []);
  byWeek.get(key).push(review);
}
const weeklyRows = [...byWeek.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([week_start, rows]) => ({ week_start, ...summarizeRatings(rows) }));

const byVersion = new Map();
for (const review of newest.filter((review) => review.app_version)) {
  if (!byVersion.has(review.app_version)) byVersion.set(review.app_version, []);
  byVersion.get(review.app_version).push(review);
}
const versionRows = [...byVersion.entries()]
  .map(([app_version, rows]) => ({
    app_version,
    first_review_date: isoDate(new Date(Math.min(...rows.map((row) => new Date(row.date).getTime())))),
    latest_review_date: isoDate(new Date(Math.max(...rows.map((row) => new Date(row.date).getTime())))),
    ...summarizeRatings(rows),
  }))
  .sort((left, right) => right.latest_review_date.localeCompare(left.latest_review_date));

const themeGroups = {
  access_reliability: ['stability_performance', 'login_authentication'],
  trip_truth: ['tracking_eta', 'routing_trip_quality', 'notifications', 'boarding_otp_checkin'],
  task_completion_ux: ['ui_navigation', 'booking_cancellation', 'metro_ticketing'],
  recovery_support: ['support_operations', 'feedback_rating'],
};
const themeToGroup = new Map(Object.entries(themeGroups).flatMap(([group, themes]) => themes.map((theme) => [theme, group])));
const manualComplaints = manuallyReviewed.filter((review) => !['positive', 'unclear'].includes(review.primary_theme));
const recentManualComplaints = manualComplaints.filter((review) => new Date(review.date) >= recentStart);
const groupSummary = (rows) => {
  const counts = countBy(rows, (row) => themeToGroup.get(row.primary_theme) ?? 'other');
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([group, count]) => [group, { count, share: round(count / rows.length) }]),
  );
};

const duplicateIds = reviews.length - new Set(reviews.map((review) => review.review_id)).size;
const summary = {
  generated_at: new Date().toISOString(),
  source_scope: {
    app_id: metadata.app_id,
    country: metadata.country,
    language: metadata.language,
    listing_score_returned_by_scraper: metadata.app.score,
    listing_rating_count: metadata.app.ratings,
    listing_review_count: metadata.app.reviews,
    installs: metadata.app.installs,
    current_version: metadata.app.version,
  },
  data_quality: {
    unique_reviews: reviews.length,
    duplicate_review_ids_after_deduplication: duplicateIds,
    missing_review_text: reviews.filter((review) => !review.review_text.trim()).length,
    missing_rating: reviews.filter((review) => !Number.isFinite(review.rating)).length,
    missing_app_version: reviews.filter((review) => !review.app_version).length,
    missing_app_version_share: round(reviews.filter((review) => !review.app_version).length / reviews.length),
    developer_reply_count: reviews.filter((review) => review.developer_reply).length,
    developer_reply_share: round(reviews.filter((review) => review.developer_reply).length / reviews.length),
    oldest_review_date: reviews.at(-1).date,
    newest_review_date: reviews[0].date,
  },
  newest_sample: {
    size: newest.length,
    start: newest.at(-1).date,
    end: newest[0].date,
    ...summarizeRatings(newest),
    rating_counts: countBy(newest, (review) => review.rating),
  },
  manual_analysis: {
    reviewed: manuallyReviewed.length,
    specific_complaints: manualComplaints.length,
    theme_counts: countBy(manualComplaints, (review) => review.primary_theme),
    grouped_problem_counts: groupSummary(manualComplaints),
    recent_90_day_window: {
      start: recentStart.toISOString(),
      end: newestDate.toISOString(),
      specific_complaints: recentManualComplaints.length,
      theme_counts: countBy(recentManualComplaints, (review) => review.primary_theme),
      grouped_problem_counts: groupSummary(recentManualComplaints),
    },
  },
  classifier_validation: {
    decision: 'Do not use keyword-classifier totals as decision evidence.',
    frozen_exact_match_accuracy: 0.433,
    frozen_evaluated_reviews: 30,
  },
  caveats: [
    'Google Play ratings can vary by locale, device class, and display context; the scraper score is retained as metadata rather than treated as identical to the public web display.',
    'The combined 910-review dataset joins newest and helpfulness-ranked samples and is not a random sample of all reviews.',
    'The manually reviewed set is intentionally complaint-heavy; its theme shares are directional, not population prevalence estimates.',
    'App version is missing for some reviews and version-level results are descriptive rather than causal.',
  ],
};

await Promise.all([
  fs.writeFile('analysis/quantitative_summary.json', `${JSON.stringify(summary, null, 2)}\n`),
  fs.writeFile('analysis/recent_rating_by_week.csv', `${toCsv(weeklyRows)}\n`),
  fs.writeFile('analysis/recent_rating_by_version.csv', `${toCsv(versionRows)}\n`),
]);

console.log(JSON.stringify(summary, null, 2));
