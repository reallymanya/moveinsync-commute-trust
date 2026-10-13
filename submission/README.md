# MoveInSync FDE candidate assignment

## What to submit

Submit the portable HTML dashboard in `final/MoveInSync_FDE_Interactive_Dashboard.html`. It is the primary artifact: a responsive bento-grid decision memo with global filters, live charts, dark/light themes, a five-line copyable summary, a 30-day engineering plan, and an interactive Trip Assurance prototype.

If the application form accepts only PDF, use `final/MoveInSync_FDE_Assignment.pdf`. The interactive dashboard is the stronger primary link.

## The recommendation in one sentence

Fix access reliability first, then create one trustworthy trip-state surface, then make failures recoverable; postpone broad visual redesign until these trust failures are under control.

## Evidence behind the order

- 600 newest-sort reviews collected from Google Play averaged 3.77; 29.3% were one or two stars.
- In 63 recent manually coded specific complaints, access/reliability was 39.7% and trip truth was 28.6%.
- Together those two groups were 68.3% of the recent coded complaint set.
- Version 12.19.0 showed a 3.58 sampled mean and 35.3% low-star share across 102 reviews. This is a regression signal, not causal proof.
- A keyword classifier scored only 43.3% exact-match accuracy on a frozen validation set, so its totals were rejected rather than presented as evidence.

## Folder map

- `bento-dashboard/` — source template and current visual assets used to build the one-file dashboard.
- `final/` — files ready to hand in.
- `RECOMMENDATION.md` — plain-text version of the recommendation.
- `WALKTHROUGH.md` — simple explanation of every step and command.
- `../data/` — deduplicated public review export and collection metadata.
- `../analysis/` — taxonomy, manual labels, summaries, validation and caveats.
- `../scripts/` — review collection and analysis scripts.

## Reproduce the analysis

From the repository root:

```bash
npm install
npm run fetch:reviews
npm run build:manual-analysis
npm run analyze:reviews
npm run build:dashboard
```

The fetch command reads current public Play Store reviews, so a later run will naturally produce different results. The committed files preserve the exact evidence used in this submission.

The repository also includes a weekly GitHub Actions monitor. It refreshes quantitative rating, weekly and version evidence, validates the result and rebuilds the deployed dashboard. Complaint themes remain a visibly dated human-reviewed snapshot until a new manual review is completed.

## Tools used

- Node.js and JavaScript for collection, cleaning, deduplication and summaries.
- `google-play-scraper` for public Play Store data.
- Manual coding with a documented taxonomy for complaint analysis.
- A deliberately tested keyword classifier, rejected after poor validation.
- Vanilla JavaScript, embedded Chart.js, and CSS for a deployable one-file dashboard with no runtime build step.
- Product Design and image generation for the transport-specific editorial system and commute-route hero artwork, grounded in MoveInSync's live brand cues.
- AI assistance for implementation and review; all quantitative claims were checked against saved outputs.
