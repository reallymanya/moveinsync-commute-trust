import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAutomationSnapshot, reviewHash } from '../scripts/build_automation_snapshot.mjs';

test('missing live files are explicitly empty, not mock predictions',()=>{
  const root=mkdtempSync(join(tmpdir(),'mis-empty-'));
  const result=buildAutomationSnapshot(root,[{review_id:'1',review_text:'good',rating:5}]);
  assert.equal(result.attempted,0);assert.equal(result.unprocessed,1);assert.equal(result.benchmark,null);
});
test('only matching real predictions contribute; pending is not a category',()=>{
  const root=mkdtempSync(join(tmpdir(),'mis-snapshot-'));mkdirSync(join(root,'analysis/llm/live'),{recursive:true});
  const reviews=[{review_id:'1',review_text:'good',rating:5},{review_id:'2',review_text:'bug',rating:1}];
  const predictions=reviews.map(r=>({review_id:r.review_id,content_hash:reviewHash(r),provenance:{provider:'groq',model:'test'},status:r.review_id==='1'?'model_suggested':'pending',classification:r.review_id==='1'?{primary_theme:'positive',evidence:['good']}:null}));
  writeFileSync(join(root,'analysis/llm/live/predictions.json'),JSON.stringify(predictions));
  let result=buildAutomationSnapshot(root,reviews);assert.equal(result.awaitingReview,1);assert.equal(result.pending,1);assert.equal(result.approved,0);
  reviews[0].review_text='edited';result=buildAutomationSnapshot(root,reviews);assert.equal(result.excluded,1);assert.equal(result.attempted,1);
});
test('portable snapshot survives clean checkout but invalidates edited text',()=>{
  const root=mkdtempSync(join(tmpdir(),'mis-portable-'));mkdirSync(join(root,'analysis'));
  const row={review_id:'1',review_text:'good',rating:5};
  writeFileSync(join(root,'analysis/automation_snapshot.json'),JSON.stringify({records:[{id:'1',contentHash:reviewHash(row),status:'review'}],benchmark:null}));
  assert.equal(buildAutomationSnapshot(root,[row]).attempted,1);
  assert.equal(buildAutomationSnapshot(root,[{...row,rating:1}]).attempted,0);
});
