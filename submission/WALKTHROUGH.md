# How this assignment was built — simple walkthrough

## 1. The question was converted into a decision

The company did not ask for “some review insights.” It asked why ratings are low and what the team should do first. That means the output needs three things: evidence, a priority order, and build-ready next steps.

## 2. Public reviews were collected

`scripts/fetch_playstore_reviews.mjs` calls the public Google Play listing through the `google-play-scraper` library. It requests two views:

- 600 reviews sorted by newest, useful for recent rating trends.
- 400 reviews sorted by helpfulness, useful for discovering older recurring problems.

The script removes duplicates using each review's ID. It does not save reviewer names or profile images.

Run it with:

```bash
npm run fetch:reviews
```

Outputs go into `data/` as CSV, JSON and metadata.

## 3. The data was checked before analysis

The final export contains 910 unique reviews, no duplicate IDs, no missing review text and no missing star ratings. App version is missing for 84 reviews, so version analysis is incomplete by design.

The newest and helpful lists are not a random sample of every Play Store review. They serve different purposes and are not mixed when calculating the recent rating trend.

## 4. Complaints were labelled manually

A taxonomy in `analysis/taxonomy.md` defines one primary theme per review. Four separate label files contain 160 manually reviewed examples. The script `build_manual_analysis.mjs` joins them and calculates theme counts.

Run it with:

```bash
npm run build:manual-analysis
```

This produced the main finding: in recent coded complaints, access/reliability is 39.7% and trip truth is 28.6%.

## 5. Automation was tested, then rejected where it was weak

`classify_reviews.mjs` is a simple keyword classifier. It was evaluated against human labels, including a final frozen set that was not used during tuning. Exact primary-theme accuracy was only 43.3%.

That is not reliable enough for a recommendation, so automated theme totals are not used in the report. Keeping the failed experiment is useful: it shows validation discipline and gives a future team a baseline to beat with a semantic model.

## 6. Rating and version summaries were calculated

`analyze_reviews.mjs` calculates data quality, the 600-newest-review rating distribution, weekly rating values and version-level descriptive metrics.

Run it with:

```bash
npm run analyze:reviews
```

Version results are signals, not causal claims. A bad version rating could reflect timing, review mix, tenant mix or device mix. Internal telemetry is needed before deciding to roll back.

## 7. Problems were turned into engineering work

The priority order uses three ideas:

- Evidence: how often a problem appeared in recent coded complaints.
- Journey criticality: whether it blocks or endangers the commute.
- Addressability: whether a product/engineering team can act on it.

This is why crashes/login and trip-state truth are P0, recovery is P1, and general friction is P2.

## 8. A prototype was built to make the recommendation concrete

The interactive Trip Assurance card demonstrates three states:

- Normal: booking, cab, ETA and OTP agree.
- Stale GPS: the booking remains confirmed, but the app clearly labels old location data.
- System mismatch: the app preserves the confirmed fact, admits the conflict and creates a traceable case.

The point is not visual polish. The point is the state contract and recovery behaviour engineers can implement.

## 9. How to present this in the interview

Open the HTML report and say:

> I treated ratings as a symptom of commute trust. I collected and quality-checked public reviews, used manual coding after a classifier failed validation, found that access plus trip truth dominated recent complaints, and converted that into a phased engineering plan. I also built a small interactive prototype to make the proposed system behaviour concrete. The next step would be joining this external evidence with internal crash, trip and support telemetry.

Then demonstrate the Normal trip, Stale GPS and System mismatch buttons.

