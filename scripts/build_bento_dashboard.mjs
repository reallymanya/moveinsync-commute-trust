import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const reviews = JSON.parse(readFileSync(resolve(root, "data/playstore_reviews.json"), "utf8"));
const metadata = JSON.parse(readFileSync(resolve(root, "data/playstore_metadata.json"), "utf8"));
const manuallyReviewed = JSON.parse(readFileSync(resolve(root, "analysis/manually_reviewed_sample.json"), "utf8"));

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
  cadence: "Weekly · Mondays 07:47 IST",
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
  .replace("__REFRESH_META__", safeJson(refreshMeta));

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
