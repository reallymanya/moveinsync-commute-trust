import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const reviews = JSON.parse(readFileSync(resolve(root, "data/playstore_reviews.json"), "utf8"));
const labelFiles = ["manual_labels.json", "holdout_labels.json", "final_validation_labels.json", "frozen_validation_labels.json"];
const labels = labelFiles.flatMap((file) => JSON.parse(readFileSync(resolve(root, "analysis", file), "utf8")));
const labelById = new Map(labels.map((item) => [item.review_id, item.primary_theme]));

const minimalReviews = reviews.map((review) => ({
  id: review.review_id,
  d: review.date,
  r: Number(review.rating),
  v: review.app_version || "",
  c: review.collection || "",
}));

const minimalManual = reviews
  .filter((review) => labelById.has(review.review_id))
  .map((review) => ({
    id: review.review_id,
    d: review.date,
    r: Number(review.rating),
    v: review.app_version || "",
    c: review.collection || "",
    t: labelById.get(review.review_id),
  }));

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
  .replace("__MANUAL__", safeJson(minimalManual));

const outputDir = resolve(root, "submission/bento-dashboard/dist");
mkdirSync(outputDir, { recursive: true });
const output = resolve(outputDir, "index.html");
writeFileSync(output, html);
console.log(JSON.stringify({ output, reviews: minimalReviews.length, manualReviews: minimalManual.length, bytes: Buffer.byteLength(html) }, null, 2));
