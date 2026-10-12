# MoveInSync Google Play review data

Source app: `com.moveinsync.ets`  
Locale: India (`in`), English (`en`)  
Collected: 11 October 2026 IST

## Files

- `playstore_reviews.csv`: analysis-ready review table.
- `playstore_reviews.json`: the same reviews as structured JSON.
- `playstore_metadata.json`: listing metadata and collection details.

The collection requested 600 reviews sorted by newest and 400 sorted by helpfulness. After removing duplicates, it contains 910 unique reviews: 600 represented in the newest sample and 400 represented in the helpful sample, with 90 appearing in both.

Public reviewer names and profile images were intentionally excluded because they are unnecessary for the analysis. Review IDs and source URLs are retained for traceability.

## Important interpretation note

The combined star distribution is not the app's overall Play Store distribution. It combines a recent sample with a helpfulness-ranked sample, so it is suitable for theme discovery and recent-issue analysis but not for estimating the overall percentage of one-star reviews. Use the listing-level rating and rating count from `playstore_metadata.json` for overall status.

## Reproduce the collection

From the project root:

```bash
npm install
npm run fetch:reviews
```

The command defaults to the MoveInSync employee app, India, English, 600 newest reviews, and 400 helpfulness-ranked reviews.

Optional arguments can override those defaults:

```bash
npm run fetch:reviews -- \
  --app-id com.moveinsync.ets \
  --lang en \
  --country in \
  --newest 600 \
  --helpful 400 \
  --output-dir data
```

Running the command replaces the three generated `playstore_*` files with a fresh collection and timestamp.
