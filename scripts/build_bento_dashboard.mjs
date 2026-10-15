import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildAutomationSnapshot } from './build_automation_snapshot.mjs';

const root = resolve(import.meta.dirname, "..");
const reviews = JSON.parse(readFileSync(resolve(root, "data/playstore_reviews.json"), "utf8"));
const metadata = JSON.parse(readFileSync(resolve(root, "data/playstore_metadata.json"), "utf8"));
const manuallyReviewed = JSON.parse(readFileSync(resolve(root, "analysis/manually_reviewed_sample.json"), "utf8"));
const automationSnapshot = buildAutomationSnapshot(root, reviews);
writeFileSync(resolve(root, 'analysis/automation_snapshot.json'), JSON.stringify(automationSnapshot, null, 2) + '\n');

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

const snapshotLines = readFileSync(resolve(root, "data/rating_snapshots.csv"), "utf8").trim().split("\n");
const snapshotFields = parseCsvLine(snapshotLines[0]);
const ratingSnapshots = snapshotLines.slice(1).map((line) => Object.fromEntries(
  snapshotFields.map((field, index) => [field, parseCsvLine(line)[index]]),
));
const currentSnapshot = ratingSnapshots.at(-1);
const previousSnapshot = ratingSnapshots.at(-2);

function nextMondayRefresh(value) {
  const collectedAt = new Date(value);
  const istOffsetMs = 330 * 60 * 1000;
  const istDate = new Date(collectedAt.getTime() + istOffsetMs);
  const daysUntilMonday = (8 - istDate.getUTCDay()) % 7;
  let nextRefresh = new Date(Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate() + daysUntilMonday,
    2,
    17,
  ));
  if (nextRefresh <= collectedAt) nextRefresh = new Date(nextRefresh.getTime() + 7 * 86400000);
  return nextRefresh.toISOString();
}

const minimalReviews = reviews.map((review) => ({
  id: review.review_id,
  d: review.date,
  r: Number(review.rating),
  v: review.app_version || "",
  c: review.collection || "",
}));

const minimalManual = manuallyReviewed.map((review) => ({
    id: review.review_id,
    d: review.date,
    r: Number(review.rating),
    v: review.app_version || "",
    c: review.collection || "",
    t: review.primary_theme,
  }));

const newestReviews = reviews.filter((review) => review.collection.split(",").includes("newest"));
const refreshMeta = {
  collectedAt: metadata.collected_at,
  evidenceThrough: newestReviews.reduce(
    (latest, review) => (review.date > latest ? review.date : latest),
    newestReviews[0]?.date || metadata.collected_at,
  ),
  manualThrough: manuallyReviewed.reduce(
    (latest, review) => (review.date > latest ? review.date : latest),
    manuallyReviewed[0]?.date || metadata.collected_at,
  ),
  uniqueReviews: reviews.length,
  newestReviews: newestReviews.length,
  manuallyReviewed: manuallyReviewed.length,
  listingScore: metadata.app.score,
  listingRatings: metadata.app.ratings,
  writtenReviews: metadata.app.reviews,
  listingScoreChange: previousSnapshot
    ? Number(currentSnapshot.listing_score) - Number(previousSnapshot.listing_score)
    : null,
  listingRatingsChange: previousSnapshot
    ? Number(currentSnapshot.rating_count) - Number(previousSnapshot.rating_count)
    : null,
  writtenReviewsChange: previousSnapshot
    ? Number(currentSnapshot.written_review_count) - Number(previousSnapshot.written_review_count)
    : null,
  currentSampleAverage: Number(currentSnapshot?.newest_sample_average),
  currentLowStarShare: Number(currentSnapshot?.newest_sample_low_star_share),
  previousCollectedAt: previousSnapshot?.collected_at || "",
  sampleAverageChange: previousSnapshot
    ? Number(currentSnapshot.newest_sample_average) - Number(previousSnapshot.newest_sample_average)
    : null,
  lowStarShareChange: previousSnapshot
    ? Number(currentSnapshot.newest_sample_low_star_share) - Number(previousSnapshot.newest_sample_low_star_share)
    : null,
  cadence: "Weekly · Mondays 07:47 IST",
  nextScheduledAt: nextMondayRefresh(metadata.collected_at),
};

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const template = readFileSync(resolve(root, "submission/bento-dashboard/template.html"), "utf8");
const chartRuntime = readFileSync(resolve(root, "node_modules/chart.js/dist/chart.umd.js"), "utf8");
const heroAsset = `data:image/png;base64,${readFileSync(resolve(root, "submission/bento-dashboard/assets/employee-commute-network-hero-v2.png")).toString("base64")}`;
const logoSvg = readFileSync(resolve(root, "submission/bento-dashboard/assets/moveinsync-logo.svg"), "utf8");
const logoLightAsset = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
const logoDarkAsset = `data:image/svg+xml;base64,${Buffer.from(logoSvg.replaceAll("#242021", "#F2F5EF")).toString("base64")}`;
const html = template
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js"></script>', `<script>(function(module,exports,define){${chartRuntime}}).call(window);</script>`)
  .replace("__HERO_ASSET__", heroAsset)
  .replace("__LOGO_DARK_ASSET__", logoDarkAsset)
  .replace("__LOGO_LIGHT_ASSET__", logoLightAsset)
  .replace("__REVIEWS__", safeJson(minimalReviews))
  .replace("__MANUAL__", safeJson(minimalManual))
  .replace("__REFRESH_META__", safeJson(refreshMeta))
  .replace("__AUTOMATION_DATA__", safeJson(automationSnapshot))
  .replace("/* __AUTOMATION_CSS__ */", readFileSync(resolve(root, 'submission/bento-dashboard/automation.css'), 'utf8'))
  .replace("/* __AUTOMATION_JS__ */", readFileSync(resolve(root, 'submission/bento-dashboard/automation.js'), 'utf8'));

const outputs = [
  resolve(root, "submission/bento-dashboard/dist/index.html"),
  resolve(root, "submission/final/MoveInSync_FDE_Interactive_Dashboard.html"),
  resolve(root, "dist/index.html"),
];

for (const output of outputs) {
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, html);
}

console.log(JSON.stringify({ outputs, reviews: minimalReviews.length, manualReviews: minimalManual.length, bytes: Buffer.byteLength(html) }, null, 2));
