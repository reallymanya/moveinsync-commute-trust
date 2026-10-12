import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import gplay from 'google-play-scraper';

const defaults = {
  appId: 'com.moveinsync.ets',
  lang: 'en',
  country: 'in',
  newest: 600,
  helpful: 400,
  outputDir: 'data',
};

function readArguments(argv) {
  const options = { ...defaults };
  const mappings = {
    '--app-id': 'appId',
    '--lang': 'lang',
    '--country': 'country',
    '--newest': 'newest',
    '--helpful': 'helpful',
    '--output-dir': 'outputDir',
  };

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const key = mappings[flag];

    if (!key || value === undefined) {
      throw new Error(`Invalid argument near "${flag}". See data/README.md for usage.`);
    }

    options[key] = ['newest', 'helpful'].includes(key) ? Number(value) : value;
  }

  for (const key of ['newest', 'helpful']) {
    if (!Number.isInteger(options[key]) || options[key] < 0) {
      throw new Error(`${key} must be a non-negative integer.`);
    }
  }

  return options;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function fetchReviews({ appId, lang, country, newest, helpful }) {
  const requests = [
    { label: 'newest', sort: gplay.sort.NEWEST, num: newest },
    { label: 'helpful', sort: gplay.sort.HELPFULNESS, num: helpful },
  ].filter(({ num }) => num > 0);

  const collected = [];
  for (const request of requests) {
    const result = await gplay.reviews({
      appId,
      lang,
      country,
      sort: request.sort,
      num: request.num,
    });

    for (const review of result.data) {
      collected.push({ ...review, collection: request.label });
    }
  }

  return collected;
}

function normalizeReviews(collected) {
  const deduplicated = new Map();

  for (const review of collected) {
    const existing = deduplicated.get(review.id);
    if (existing) {
      existing.collection = [
        ...new Set(`${existing.collection},${review.collection}`.split(',')),
      ].join(',');
    } else {
      deduplicated.set(review.id, { ...review });
    }
  }

  return [...deduplicated.values()]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .map((review) => ({
      review_id: review.id,
      date: new Date(review.date).toISOString(),
      rating: review.score,
      review_text: review.text ?? '',
      app_version: review.version ?? '',
      helpful_count: review.thumbsUp ?? 0,
      developer_reply: review.replyText ?? '',
      developer_reply_date: review.replyDate
        ? new Date(review.replyDate).toISOString()
        : '',
      source_url: review.url ?? '',
      collection: review.collection,
    }));
}

async function saveDataset(outputDir, reviews, metadata) {
  if (reviews.length === 0) {
    throw new Error('Google Play returned no reviews; no output was written.');
  }

  const fields = Object.keys(reviews[0]);
  const csv = [
    fields.join(','),
    ...reviews.map((review) =>
      fields.map((field) => csvEscape(review[field])).join(','),
    ),
  ].join('\n');

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, 'playstore_reviews.csv'), `${csv}\n`),
    fs.writeFile(
      path.join(outputDir, 'playstore_reviews.json'),
      `${JSON.stringify(reviews, null, 2)}\n`,
    ),
    fs.writeFile(
      path.join(outputDir, 'playstore_metadata.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
    ),
  ]);
}

async function main() {
  const options = readArguments(process.argv.slice(2));
  const outputDir = path.resolve(options.outputDir);

  console.log(`Fetching ${options.appId} reviews from Google Play...`);
  const [app, collected] = await Promise.all([
    gplay.app({
      appId: options.appId,
      lang: options.lang,
      country: options.country,
    }),
    fetchReviews(options),
  ]);
  const reviews = normalizeReviews(collected);

  const metadata = {
    collected_at: new Date().toISOString(),
    source: 'Google Play',
    country: options.country,
    language: options.lang,
    app_id: options.appId,
    app: {
      title: app.title,
      score: app.score,
      ratings: app.ratings,
      reviews: app.reviews,
      installs: app.installs,
      min_installs: app.minInstalls,
      updated: app.updated,
      version: app.version,
      url: app.url,
    },
    requested: {
      newest: options.newest,
      helpful: options.helpful,
    },
    fetched_before_deduplication: collected.length,
    unique_reviews: reviews.length,
    note: 'Public reviewer names and profile images were intentionally excluded as unnecessary personal data.',
  };

  await saveDataset(outputDir, reviews, metadata);
  console.log(`Saved ${reviews.length} unique reviews to ${outputDir}`);
}

main().catch((error) => {
  console.error(`Review collection failed: ${error.message}`);
  process.exitCode = 1;
});
