(() => {
  const data = JSON.parse(document.getElementById('automationData').textContent);
  const el = id => document.getElementById(id);
  const humanize = value => value ? value.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase()) : 'Not classified';
  const date = value => value ? new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})+' IST' : 'No saved run';
  const node = (tag,text,cls) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const statuses = {review:'Awaiting human review',pending:'Pending retry',approved:'Human-approved'};
  const reasons = {http_429:'Groq rate limit reached. Saved for retry.',invalid_evidence:'Supporting quotation failed validation.',human_approval_required:'A reviewer must approve this suggestion.',network_error:'Connection failed. Saved for retry.',insufficient:'The review contains insufficient detail.',unclear_theme:'No specific complaint could be established.',multiple_themes:'Multiple issues need a primary-theme decision.'};
  [[data.attempted,'Reviews attempted'],[data.awaitingReview,'Awaiting human review'],[data.pending,'Pending retry'],[data.approved,'Approved results imported']].forEach(([value,label])=>{const card=node('article',undefined,'automation-kpi');card.append(node('strong',value),node('span',label));el('automationKpis').append(card);});
  el('automationFreshness').textContent='Latest saved attempt: '+date(data.lastAttempt);
  el('automationCoverage').textContent=`${data.unprocessed} of ${data.collectionSize} collected reviews not yet processed${data.excluded?` · ${data.excluded} stale or incompatible records excluded`:''}.`;
  const benchmark=data.benchmark;
  el('automationEvaluation').textContent=benchmark?`${benchmark.evaluated} of ${benchmark.total} reserved reviews evaluated. ${benchmark.correct} matched the saved primary-theme labels. This is a small smoke test, not a reliable accuracy estimate. Benchmark results are separate from the current-review queue. Latest benchmark attempt: ${date(benchmark.lastAttempt)}.`:'No saved benchmark evaluation is available. No accuracy claim is made.';
  [...new Set(data.records.map(r=>r.theme).filter(Boolean))].sort().forEach(theme=>{const option=node('option',humanize(theme));option.value=theme;el('automationTheme').append(option);});
  const visible = () => data.records.filter(r=>(el('automationStatus').value==='all'||r.status===el('automationStatus').value)&&(el('automationTheme').value==='all'||r.theme===el('automationTheme').value));
  function render(){
    const rows=visible();el('automationReviews').replaceChildren();el('automationCategories').replaceChildren();
    el('automationScope').textContent=`${rows.length} of ${data.records.length} attempted reviews shown · filters here apply only to this queue; run totals above stay fixed. The page-header rating filters apply to the evidence charts below.`;
    const counts={};rows.filter(r=>r.theme).forEach(r=>counts[r.theme]=(counts[r.theme]||0)+1);
    Object.entries(counts).forEach(([theme,count])=>el('automationCategories').append(node('span',`${humanize(theme)} · ${count}`)));
    if(!rows.length)el('automationReviews').append(node('p',data.records.length?'No reviews match these filters. Reset the view to see all attempts.':'No live classification results are included in this build. Run the classifier and rebuild to populate this section.','automation-empty'));
    for(const r of rows){
      const card=node('details',undefined,'automation-review'),summary=node('summary'),quote=node('div'),status=node('div',undefined,'review-status');
      quote.append(node('blockquote',r.text),node('span',`${r.rating}★ · Version ${r.version}`,'review-meta'));
      status.append(node('b',statuses[r.status]),node('span',humanize(r.theme)),node('small','View evidence & run details +'));
      summary.append(quote,status);const detail=node('div',undefined,'automation-detail');
      if(r.evidence.length){detail.append(node('p',r.status==='approved'?'Human-reviewed supporting text:':'Model-selected supporting text:'));const list=node('ul');r.evidence.forEach(e=>list.append(node('li',e)));detail.append(list);}
      if(r.rationale)detail.append(node('p',`Model rationale: ${r.rationale}`));
      if(r.severity)detail.append(node('p',`${r.status==='approved'?'Reviewed':'Suggested'} severity: ${humanize(r.severity)}`));
      detail.append(node('p',r.status==='approved'?'An approval was imported for this exact review content.':r.reasons.map(reason=>reasons[reason]||humanize(reason)).join(' ')));
      detail.append(node('p',`Model: ${r.model} · Attempt: ${date(r.processedAt)}`));
      card.append(summary,detail);el('automationReviews').append(card);
    }
  }
  ['automationStatus','automationTheme'].forEach(id=>el(id).addEventListener('change',render));
  el('automationReset').addEventListener('click',()=>{el('automationStatus').value='all';el('automationTheme').value='all';render();});
  el('automationDownload').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({scope:'Filtered review-classification snapshot; model suggestions are not verified complaint totals',source:data.source,records:visible()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='moveinsync-classification-view.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  render();
})();
