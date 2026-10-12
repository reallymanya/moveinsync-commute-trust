# Review analysis methodology

## What is reliable

- The raw collection contains 910 unique public reviews from the India/English Google Play listing.
- A total of 160 reviews were manually assigned one primary theme using the documented taxonomy.
- The manually reviewed sample deliberately contains more low-star reviews than the full listing so that complaint types can be discovered efficiently.
- Theme rankings within the manually reviewed complaint set are directional evidence, not estimates of the percentage of all users experiencing each problem.

## Automated baseline

A deterministic keyword classifier was built to test whether recurring analysis could be automated without an external model. It performed well on examples used during development but achieved only 43.3% exact-theme accuracy on a final untouched 30-review audit.

The automated classifications are therefore exploratory only and must not be used as the primary evidence for recommendations. This failed validation is retained because it is an important methodological result: multi-issue reviews, paraphrases, negation, and ambiguous ownership require semantic classification plus human review.

## Recommended production approach

For a recurring internal workflow, classify new reviews with a language model using the fixed taxonomy, require structured output, and manually review low-confidence or multi-theme results. Validate every classifier revision against a frozen labelled set and report the frozen-set result rather than the development score.
