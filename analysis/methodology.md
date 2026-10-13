# Review analysis methodology

## What is reliable

- The current public review count, freshness and data-quality checks are recorded in `quantitative_summary.json` after every refresh.
- A total of 160 reviews were manually assigned one primary theme using the documented taxonomy.
- The manually reviewed sample deliberately contains more low-star reviews than the full listing so that complaint types can be discovered efficiently.
- Theme rankings within the manually reviewed complaint set are directional evidence, not estimates of the percentage of all users experiencing each problem.

## Automated baseline

A deterministic keyword classifier was built to test whether recurring analysis could be automated without an external model. It performed well on examples used during development but achieved only 43.3% exact-theme accuracy on a final untouched 30-review audit.

The automated classifications are therefore exploratory only and must not be used as the primary evidence for recommendations. This failed validation is retained because it is an important methodological result: multi-issue reviews, paraphrases, negation, and ambiguous ownership require semantic classification plus human review.

## Recommended production approach

For a recurring internal workflow, classify new reviews with a language model using the fixed taxonomy, require structured output, and manually review low-confidence or multi-theme results. Validate every classifier revision against a frozen labelled set and report the frozen-set result rather than the development score.

## Recurring public monitor implemented here

The GitHub Actions workflow refreshes the public rating layer every Monday at 07:47 IST. It appends the store score and counts to `data/rating_snapshots.csv`, refetches the newest and helpfulness-ranked samples, recalculates rating, weekly and version summaries, validates the output, rebuilds the dashboard and commits the new evidence. Vercel then rebuilds the live site from the repository.

The 160 human-coded records are frozen in `analysis/manually_reviewed_sample.json`. Dashboard date filters are anchored independently for the current rating sample and the dated manual snapshot. This prevents a routine data refresh from either dropping labelled reviews or presenting old theme coding as newly reviewed evidence.
