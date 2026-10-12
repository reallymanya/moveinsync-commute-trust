# MoveInSync Commute Trust

An evidence-backed product and engineering response to MoveInSync's Forward Deployed Engineer candidate assignment: understand why the employee app receives low Play Store ratings and recommend what the team should build first.

The central conclusion is simple:

> Fix access reliability first, establish one trustworthy trip state second, and make failures recoverable third. Do not begin with a broad visual redesign.

![Employee commute network showing employees, cabs, shuttles and live routes](submission/bento-dashboard/assets/employee-commute-network-hero-v2.png)

## Start here

| Deliverable | What it contains | When to use it |
| --- | --- | --- |
| [Interactive dashboard](submission/final/MoveInSync_FDE_Interactive_Dashboard.html) | Filters, charts, priorities, dark/light themes and an interactive Trip Assurance prototype | Primary submission and product walkthrough |
| [PDF decision memo](submission/final/MoveInSync_FDE_Assignment.pdf) | Seven-page static summary of the evidence, recommendations, product concept and delivery plan | Quick recruiter review or PDF-only submission |
| [Recommendation](submission/RECOMMENDATION.md) | Plain-language product and engineering recommendation | Detailed reading without opening the dashboard |
| [Build walkthrough](submission/WALKTHROUGH.md) | Beginner-friendly explanation of the collection, validation, analysis and prototyping process | Interview preparation and technical review |

The interactive dashboard is a single self-contained HTML file. Download it and open it in any modern browser; it does not need a server or internet connection at runtime.

## A five-minute recruiter walkthrough

1. Open the interactive dashboard.
2. Read the opening decision: commute trust is the product problem behind the rating symptoms.
3. Review the four headline metrics and complaint categories.
4. Use the rating, date and app-version filters; every chart updates together.
5. Select a version in the table or a point in the weekly trend to inspect the underlying signal.
6. Open the four priority cards to see the owner, first action and target metric.
7. Watch or control the Trip Assurance prototype across Normal, Stale GPS and System Mismatch states.
8. Finish with the 30-day rollout plan and methods section.

## What the public evidence says

The analysis uses public Google Play reviews for the MoveInSync employee app in India.

| Signal | Result | Interpretation |
| --- | ---: | --- |
| Unique reviews collected | 910 | Deduplicated combination of newest and helpfulness-ranked samples |
| Newest-review sample | 600 | Used for rating distribution and weekly movement |
| Average sampled rating | 3.77 / 5 | Sample signal, not the official Play Store aggregate |
| One-to-two-star share | 29.3% | 176 of the 600 newest reviews |
| Manually reviewed reviews | 160 | Labelled using a documented primary-theme taxonomy |
| Recent specific complaints | 63 | Complaints inside the most recent 90-day window |
| Access and reliability | 39.7% | Largest recent manually reviewed complaint group |
| Trip truth | 28.6% | Booking, route, tracking, notification and boarding-state trust |
| Combined top two groups | 68.3% | The strongest basis for prioritization |

The manually reviewed set is intentionally complaint-heavy. These category shares are directional evidence for deciding what to investigate and build; they are not population-prevalence estimates for every MoveInSync user.

## Recommended build order

### P0: Make access boringly reliable

Instrument startup, session, login and OTP failures. Add secure recovery, explicit retry states, staged rollout and a rollback switch.

Proposed targets, subject to calibration against internal baselines:

- At least 99.5% crash-free sessions.
- At least 99% successful core-screen loads within five seconds.
- At least 98% login and OTP completion.

### P0: Create one source of trip truth

Unify booking, allocation, pickup, vehicle, GPS freshness, ETA and boarding into a canonical trip-state contract.

- Make booking and cancellation writes idempotent.
- Reconcile conflicting server-side states.
- Timestamp every live value and expose freshness.
- Preserve only the last confirmed fact when data becomes stale.
- Never present a guessed ETA as live.

### P1: Turn failures into traceable recovery

Create structured cases with automatic trip, app and device diagnostics. Give employees a visible case ID and status, and route operational and technical failures correctly.

### P2: Remove task friction

After trust is stable, make feedback skippable, distinguish waitlisted from confirmed states, issue clear receipts and add a no-show evidence and dispute flow.

## Product concept: Trip Assurance

The dashboard includes a working front-end prototype for one canonical employee-facing trip card:

- **Normal:** booking, cab, pickup time, location and OTP agree.
- **Stale GPS:** preserve the confirmed booking, label location age and avoid a false live ETA.
- **System mismatch:** preserve the last confirmed fact, admit the conflict and open a diagnostic-rich recovery case.

This is deliberately more than a UI mock-up. It specifies the state and recovery behavior that Product and Engineering can implement.

## 30-day delivery plan

| Timing | Outcome |
| --- | --- |
| Days 1-3 | Instrument launch, authentication, booking, allocation, tracking freshness, OTP and support handoff |
| Days 4-10 | Fix the largest access failures and establish release health gates |
| Days 8-18 | Pilot the canonical Trip Assurance state model behind a feature flag |
| Days 15-24 | Add structured recovery, diagnostics and visible case status |
| Days 25-30 | Compare outcomes and expand only when trust improves without safety or operational regressions |

## Repository navigation

```text
.
├── README.md                         # This recruiter-facing guide
├── data/                             # Deduplicated public review data and source metadata
├── analysis/                         # Labels, taxonomy, summaries and validation evidence
├── scripts/                          # Collection, analysis and artifact build scripts
├── submission/
│   ├── RECOMMENDATION.md             # Written recommendation
│   ├── WALKTHROUGH.md                # Step-by-step explanation
│   ├── bento-dashboard/
│   │   ├── template.html             # Dashboard source template
│   │   └── assets/                   # Current logo and commute hero image
│   └── final/
│       ├── MoveInSync_FDE_Interactive_Dashboard.html
│       └── MoveInSync_FDE_Assignment.pdf
├── package.json
└── package-lock.json
```

## Reproduce the work

Requirements: Node.js 18 or newer and Python 3 with ReportLab for PDF generation.

```bash
npm install
npm run fetch:reviews
npm run build:manual-analysis
npm run analyze:reviews
npm run build:dashboard
```

To regenerate the PDF:

```bash
python3 -m pip install reportlab
npm run build:pdf
```

Important: fetching again reads the current public Play Store state, so future results may differ. The committed data and analysis preserve the exact evidence used for this submission.

## How the analysis was validated

The workflow intentionally separates evidence collection from interpretation:

1. Collect newest and helpfulness-ranked reviews.
2. Deduplicate by public review ID and remove unnecessary reviewer identity fields.
3. Check missingness, date range, version coverage and duplicate IDs.
4. Manually label a complaint-focused sample using `analysis/taxonomy.md`.
5. Calculate rating, time, version and complaint-group summaries.
6. Test a keyword classifier against held-out human labels.
7. Reject automated theme totals after the frozen evaluation reached only 43.3% exact-match accuracy.
8. Base the recommendation on manually reviewed evidence and clearly state uncertainty.

The failed classifier experiment is retained because it demonstrates validation discipline and provides a baseline for a future semantic classifier.

## Tools used

- Node.js and JavaScript for collection, cleaning, deduplication and analysis.
- `google-play-scraper` for public Play Store data.
- Manual review using a documented complaint taxonomy.
- Vanilla JavaScript and embedded Chart.js for the portable dashboard.
- CSS Grid, responsive design, keyboard-accessible interactions and reduced-motion support.
- ReportLab for the static PDF decision memo.
- AI-assisted coding and visual iteration, with quantitative claims checked against saved outputs.

## Data quality and limitations

- The combined dataset is not a random sample of all reviews.
- Weekly ratings use only the newest-sort sample.
- The manually reviewed set is intentionally complaint-heavy.
- App version is missing for 84 reviews, or 9.2% of the combined dataset.
- Version comparisons are descriptive and do not establish causality.
- Google Play ratings may vary by locale, device and display context.
- Public reviews identify symptoms; internal telemetry is required to verify root causes.

## What I would request next inside MoveInSync

- Crash and startup traces by app version, OS, device and tenant.
- Login and OTP funnel events with explicit failure reasons.
- Booking-state reconciliation and idempotency logs.
- GPS freshness and ETA error distributions.
- Completed-trip denominators for normalized complaint rates.
- Support categories, acknowledgement time, resolution time and repeat contacts.
- No-show disputes, SOS availability and battery/data-use guardrails.

These inputs would turn the public-review diagnosis into calibrated production SLOs and a controlled enterprise pilot.

## Privacy note

The saved dataset intentionally excludes public reviewer names and profile images. Review IDs are retained only for deduplication and reproducibility.
