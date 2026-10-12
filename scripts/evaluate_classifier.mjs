import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const labelPath = args[0] ?? 'analysis/manual_labels.json';
const outputPath = args[1] ?? 'analysis/classifier_evaluation.json';
const gold = JSON.parse(await fs.readFile(labelPath, 'utf8'));
const classified = JSON.parse(await fs.readFile('analysis/classified_reviews.json', 'utf8'));
const predictedById = new Map(classified.map((review) => [review.review_id, review]));

let correct = 0;
const mismatches = [];
const perTheme = {};

for (const expected of gold) {
  const predicted = predictedById.get(expected.review_id);
  if (!predicted) throw new Error(`Missing prediction for ${expected.review_id}`);
  const matched = expected.primary_theme === predicted.primary_theme;
  if (matched) correct += 1;

  perTheme[expected.primary_theme] ??= { total: 0, correct: 0 };
  perTheme[expected.primary_theme].total += 1;
  if (matched) perTheme[expected.primary_theme].correct += 1;

  if (!matched) {
    mismatches.push({
      review_id: expected.review_id,
      text: predicted.review_text,
      expected: expected.primary_theme,
      predicted: predicted.primary_theme,
      confidence: predicted.classification_confidence,
      evidence: predicted.classification_evidence,
    });
  }
}

for (const stats of Object.values(perTheme)) {
  stats.recall = Number((stats.correct / stats.total).toFixed(3));
}

const report = {
  evaluated: gold.length,
  correct,
  exact_match_accuracy: Number((correct / gold.length).toFixed(3)),
  per_theme_recall: perTheme,
  mismatches,
};

await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
