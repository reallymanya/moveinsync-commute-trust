# Automated review classification

This extension adds Python classification to the existing Node.js collection and rating-monitoring pipeline. It uses a hosted model through Groq; it does not train or fine-tune a model.

## What changes

The original collector already refreshes public review data and listing ratings. The Python extension reads those reviews, proposes a primary complaint theme with supporting text, and creates a queue for human checking. Model suggestions are separate from the 160-review manual snapshot used in the submitted recommendation.

The taxonomy remains the 13 themes in `analysis/taxonomy.md`, including `positive` and `unclear`. One primary theme keeps counts mutually exclusive and permits comparison with existing labels. A positive star rating does not prevent a review from containing a complaint. Severity follows the text: an app crash is not automatically an immediate safety emergency.

## Setup

Use Python 3.10 or newer. The new scripts use the standard library, so there is no pip installation for this extension.

1. Copy `.env.example` to `.env` and enter your Groq key there. This file is ignored by Git. Alternatively, set `GROQ_API_KEY` in the environment.
2. Run the offline tests and dry-run first.
3. Start with a small real batch before processing the full dataset.

Only the review text and the necessary classification context are sent to Groq. API credentials stay outside the browser and source code. Model outputs are untrusted input: JSON format, allowed values and quoted evidence must pass local validation.

```bash
npm run test:llm
npm run classify:llm -- --dry-run --limit 5
npm run classify:llm -- --limit 5
```

Live outputs go to `analysis/llm/live/`; mock outputs go to `analysis/llm/mock/`. `predictions.json` retains model and prompt provenance, content hashes and processing status. `review_queue.json` identifies cases needing attention. `summary.json` describes the run. A repeated run reuses matching results and retries pending failures; changed text, ratings or prompt/model settings invalidate reuse. `--limit` caps new work for that invocation.

## Evaluation and interpretation

Development examples come from `analysis/manual_labels.json`. The three audit label files are excluded from few-shot examples. Frozen review text supplies an auditable evaluation input even when a refreshed Play Store snapshot no longer contains an old review.

These audit sets have previously been inspected during the keyword-classifier experiment. They are useful regression benchmarks, but are not a pristine final test set for every future design decision. Before a production launch, label a new time-separated sample and measure performance on that as well.

Report per-theme precision, recall, F1, macro F1, coverage and errors. Inspect weak categories and the number of examples behind each score. A single accuracy threshold does not establish production readiness, and a model's self-reported confidence is not a calibrated probability. A quotation that matches the review proves the text exists, not that the chosen category is correct.

No measured Groq accuracy is claimed until a real API run and evaluation have completed. Offline mock runs exercise the plumbing and must never be presented as model quality evidence.

Run the reserved benchmark in its own directory:

```bash
python3 scripts/classify_reviews_llm.py --input analysis/manually_reviewed_sample.json --holdout-only --output-dir analysis/llm/benchmark --limit 10
# Repeat the command to advance another batch; omit --limit to attempt the rest.
python3 scripts/evaluate_llm_classifier.py --predictions analysis/llm/benchmark/predictions.json --output analysis/llm/benchmark/evaluation.json
```

The evaluation reports coverage against all 100 reserved labels. A ten-review smoke test is partial coverage, not a full benchmark. Model versions and prompt revisions must not be mixed into one score. Review the reported confusion matrix and mismatches before changing the prompt; reserve new untouched examples for any later final assessment.

On some macOS Python installations, HTTPS fails because Python lacks its certificate bundle. Configure a trusted CA bundle, for example `SSL_CERT_FILE=/etc/ssl/cert.pem` when that file exists. Never disable TLS verification. API errors remain pending work and can be retried using the same command.

## Human review and publication

Reviewers inspect the source text and evidence, then approve or correct the theme and severity. Decisions need a review content hash so an old approval cannot silently apply to an edited review. Reviewed outputs and machine suggestions should retain distinct provenance.

```bash
npm run review:llm
# Open analysis/llm/review_decisions.csv in your editor.
# Set decision to approve or reject. Supply reviewer and notes for both.
# For approvals also fill primary_theme, severity and an exact evidence quote.
npm run review:llm -- --apply
```

The export refuses to overwrite an existing worksheet. Use `--worksheet PATH` for a new batch. Empty decisions are not approvals. Applying a worksheet writes `approved_reviews.json`, `rejected_reviews.json` and `review_metrics.json` under `analysis/llm/reviewed/`. Those files represent that worksheet, not a cumulative population estimate. The group mappings match the current dashboard; the complaint-share denominator excludes `positive` and `unclear`. Mock outputs and approvals for edited review text are rejected.

## Recurring execution

The existing weekly GitHub Actions workflow now has optional classification steps. After this code is pushed and a `GROQ_API_KEY` repository secret is configured, it can process up to 100 new/edited reviews per run. A cache preserves its checkpoint; downloadable artifacts retain results for 30 days. Missing credentials skip classification with an explicit message. Classification failures do not block the existing ratings refresh or publish partial theme claims. Cache eviction can cause reprocessing; a production service should use durable database storage.

A `.env` file on your laptop does not configure a GitHub Actions secret. Scheduled runs are best effort and the batch cap can leave a backlog; the run summary makes remaining work visible. Check the workflow's classification step to establish whether a scheduled run actually executed or skipped.

The optional classification step has a seven-minute timeout within the existing 15-minute job. Groq token/request limits can make a batch slower than expected. Successful records are checkpointed after each review; pending failures can be retried. Completing 100 predictions per scheduled run is a cap, not a throughput promise.

The dashboard now includes a separate Review intelligence section (`#automation`) showing saved attempts, human-review and retry counts, backlog, expandable evidence, local queue filters, filtered JSON downloads and benchmark coverage. It uses the latest local files at build time. The original complaint charts continue to use their explicitly dated manual snapshot.

`npm run build:dashboard` creates `analysis/automation_snapshot.json`, a portable snapshot of public review text and classification status. It contains no API key, reviewer identity or local file paths. A clean checkout can rebuild the display from this snapshot even though raw run files are ignored by Git. Review IDs and content hashes exclude stale predictions when a collected review changes. The optional scheduled workflow rebuilds this section after classification and includes the portable snapshot with refreshed evidence.

The queue has its own status/category filters; global rating filters continue to control the existing evidence charts. Run totals and benchmark coverage are explicitly separate from queue filtering. This is a static results viewer: it does not start API jobs or save human decisions in the browser. Run Python and rebuild to update it.

## Why use a hosted model first?

It establishes an inexpensive-to-build semantic baseline that can be evaluated against the existing keyword approach. Python handles deduplication, retries, checkpoints, validation and exports. Groq supplies inference. LoRA is an optional later experiment, justified by measured quality, running cost and latency; there is no universal minimum number of labels that guarantees good fine-tuning.

## Interview explanation

“The initial project used Node.js to collect and analyse reviews, and Python to generate the PDF. I added a Python classification pipeline that calls Groq, validates structured predictions and their supporting quotations, and keeps a human review queue. I evaluate it against reserved labels and keep generated suggestions separate from verified evidence. This extends the recurring ratings monitor to complaint analysis.”

Only describe an API run, measured score or scheduled deployment as completed when you have actually run and verified it.

API reference: [Groq structured outputs](https://console.groq.com/docs/structured-outputs). Schema conformance is a format guarantee, not an accuracy guarantee.

## Local verification — 15 October 2026

- All 23 offline tests passed, including retry handling, edited-review invalidation, mock rejection, label isolation and human-approval validation.
- The existing refresh validation passed with 911 current reviews and the unchanged 160-review manual snapshot.
- Real Groq calls using `openai/gpt-oss-20b` produced two valid predictions in an initial five-review batch; three requests hit rate limits and remained pending.
- A separate five-review reserved-label smoke test produced four valid predictions, all matching their primary-theme labels. One output failed the exact-evidence check and remained pending. This covers only 4 of the 100 reserved labels; it is not a reliable overall accuracy estimate.
- Detailed live outputs are local under ignored `analysis/llm/` directories; the public display snapshot is saved separately. No model was trained. These checks tested local execution, not a remote scheduled classification run.
