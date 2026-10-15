import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const optional = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
};
export const reviewHash = row => createHash('sha256').update(JSON.stringify({rating:row.rating ?? null,review_text:row.review_text})).digest('hex');

export function buildAutomationSnapshot(root, reviews) {
  const saved = optional(resolve(root, 'analysis/automation_snapshot.json'), null);
  if (!existsSync(resolve(root, 'analysis/llm/live/predictions.json')) && saved) {
    const index = new Map(reviews.map(row=>[row.review_id, row]));
    const records = saved.records.filter(row=>index.has(row.id) && reviewHash(index.get(row.id)) === row.contentHash);
    return summarize(records, reviews.length, saved.records.length-records.length, saved.benchmark);
  }
  const predictions = optional(resolve(root, 'analysis/llm/live/predictions.json'), []);
  const approvals = optional(resolve(root, 'analysis/llm/reviewed/approved_reviews.json'), []);
  const index = new Map(reviews.map(row => [row.review_id, row]));
  const approved = new Map(approvals.map(row => [row.review_id, row]));
  let excluded = 0;
  const records = [];
  for (const row of predictions) {
    const source = index.get(row.review_id);
    if (row.provenance?.provider !== 'groq' || !source || reviewHash(source) !== row.content_hash) { excluded++; continue; }
    const result = row.classification;
    const valid = result && ['model_suggested', 'needs_review'].includes(row.status);
    const approval = approved.get(row.review_id);
    const human = approval?.content_hash === row.content_hash && approval.source === 'human_reviewed_llm_suggestion';
    records.push({id:row.review_id, contentHash:row.content_hash, text:source.review_text, rating:source.rating, version:source.app_version || 'Not reported',
      processedAt:row.processed_at, model:row.provenance.model, status:human?'approved':valid?'review':'pending',
      theme:human?approval.primary_theme:valid?result.primary_theme:null,
      severity:human?approval.severity:valid?result.severity:null,
      evidence:human?[approval.evidence]:valid?result.evidence:[],
      rationale:valid?result.rationale:'', reasons:row.queue_reasons || []});
  }
  const evaluation = optional(resolve(root, 'analysis/llm/benchmark/evaluation.json'), null);
  const benchmark = optional(resolve(root, 'analysis/llm/benchmark/predictions.json'), []);
  // A saved benchmark is distinct from the current collection and never contributes theme totals.
  const evaluationPath = resolve(root, 'analysis/llm/benchmark/evaluation.json');
  const predictionsPath = resolve(root, 'analysis/llm/benchmark/predictions.json');
  const currentEvaluation = existsSync(evaluationPath) && existsSync(predictionsPath) && statSync(evaluationPath).mtimeMs >= statSync(predictionsPath).mtimeMs;
  const e = currentEvaluation ? evaluation?.combined : null;
  const benchmarkLatest = benchmark.map(r=>r.processed_at).filter(Boolean).sort().at(-1) || null;
  return summarize(records, reviews.length, excluded, e?{evaluated:e.evaluated_count,total:e.heldout_count,correct:e.evaluated_count-e.errors.length,attempted:benchmark.length,lastAttempt:benchmarkLatest}:null);
}

function summarize(records, total, excluded, benchmark) {
  return {records, excluded, collectionSize:total, attempted:records.length,
    awaitingReview:records.filter(r=>r.status==='review').length, pending:records.filter(r=>r.status==='pending').length,
    approved:records.filter(r=>r.status==='approved').length, unprocessed:total-records.length,
    lastAttempt:records.map(r=>r.processedAt).filter(Boolean).sort().at(-1) || null,
    benchmark,
    source:'Saved local Groq predictions joined to the current collected reviews by ID and content hash. Benchmark uses reserved labels and frozen review text.'};
}
