# Fix commute trust before polishing the MoveInSync app

## Executive decision

The fastest credible route to better Play Store ratings is to fix trust failures at the two most important moments in the commute journey:

1. Can the employee open and authenticate into the app?
2. Can the employee trust the booking, cab, pickup time, live location and boarding state shown?

In the recent manually coded complaint set, access/reliability represents 39.7% and trip truth 28.6%. Together they account for 68.3% of the 63 specific complaints reviewed from the latest 90-day window. Start there, not with a broad UI redesign.

## What to build, in order

### P0 — Make access boringly reliable

Build crash/startup telemetry, a login/OTP funnel with explicit failure codes, secure session recovery, clear retry/fallback states, staged rollout and a release kill switch.

Proposed release SLOs, to be calibrated against internal baselines:

- Crash-free sessions: at least 99.5%.
- Core screen load success within five seconds: at least 99%.
- Login/OTP completion: at least 98%.

### P0 — Create one source of trip truth

Create one canonical trip-state contract and employee-facing Trip Assurance card covering booking, allocation, pickup time, tracking freshness and boarding OTP.

Engineering requirements:

- Idempotent booking and cancellation writes.
- Server-side reconciliation for conflicting booking or vehicle states.
- Last-confirmed trip cached locally, subject to security review.
- Location and ETA shown with a freshness timestamp.
- Explicit stale and mismatch states; never present a guessed ETA as live.
- One-tap recovery that carries trip and app diagnostics.

Measure booking-state reconciliation, status mismatches per 1,000 active trips, P95 location freshness, ETA error and support contacts.

### P1 — Turn failures into traceable recovery

Add structured issue categories, automatic trip/app/device context, a visible case ID and status, and routing that separates operational failures from product defects. Establish a Play Store reply and close-the-loop workflow.

Measure support contacts per 1,000 trips, acknowledgement time, resolution time, repeat contacts and developer response rate.

### P2 — Remove task friction

Make feedback skippable, show explicit waitlist versus confirmed states, issue clear booking/cancellation receipts, present safety education contextually, and provide a no-show evidence/dispute path.

## 30-day delivery plan

- Days 1–3: instrument launch, authentication, booking retrieval, allocation, tracking freshness, OTP and support handoff. Cut results by app version, OS, device, network and tenant.
- Days 4–10: fix the largest crash and authentication clusters; introduce staged rollout and automatic release pause on regression.
- Days 8–18: ship Trip Assurance behind a feature flag to one enterprise cohort with a comparable holdout.
- Days 15–24: ship structured recovery with diagnostics and visible case status.
- Days 25–30: decide whether to expand using critical-journey success, trust failures, support contacts, low-star review rate and safety/battery/no-show guardrails.

## Methods and limits

I collected 600 newest and 400 helpful public English-language Google Play reviews for India, deduplicated them into 910 unique reviews, removed public reviewer names/profile images from saved data, and manually coded 160 reviews using a documented primary-theme taxonomy. The newest 600-review sample averaged 3.77 and had a 29.3% one-to-two-star share.

The manually reviewed sample is intentionally complaint-heavy, so theme shares indicate direction, not population prevalence. Version comparisons are descriptive, not causal. Google Play aggregate ratings may vary by locale or device. A keyword classifier reached only 43.3% exact-match accuracy on a frozen 30-review validation set, so automated theme totals were excluded from the recommendation.

The next required evidence is internal crash, journey, tenant and support telemetry. It should be used to verify root causes and calibrate the proposed SLOs before a broad rollout.

