import fs from 'node:fs/promises';

const reviews = JSON.parse(await fs.readFile('data/playstore_reviews.json', 'utf8'));

const rules = {
  metro_ticketing: [
    [6, /\bmetro\b/i, 'metro'],
    [4, /\bmetro (ticket|booking|station)s?\b/i, 'metro ticketing'],
    [2, /\boffline ticket\b/i, 'offline ticket'],
  ],
  stability_performance: [
    [8, /\b(crash(?:es|ed|ing)?|force clos(?:e|es|ed)|closes itself)\b/i, 'crash or close'],
    [5, /\b(not opening|doesn'?t open|does not open|unable to open|won'?t open|app itself is not opening)\b/i, 'cannot open'],
    [7, /\b(app (?:is )?stuck|hang(?:s|ing)?|freeze|freezes|frozen)\b/i, 'hang or freeze'],
    [5, /\b(stopped working|stops working|not working at all)\b/i, 'stopped working'],
    [5, /\b(installation|installing|installed it from play ?store|reinstall it)\b/i, 'installation failure'],
    [5, /\b(no network|network error).{0,55}\b(network is stable|other apps|working fine)\b/i, 'false network error'],
    [5, /\bbugs? all the time|keeps? bugging|very buggy\b/i, 'persistent bugs'],
    [3, /\b(keeps? loading|loading screen|blank screen|white screen)\b/i, 'loading failure'],
    [2, /\b(very slow|too slow|lag(?:s|gy|ging)?)\b/i, 'performance'],
    [2, /\b(uninstall and reinstall|reinstall(?:ed|ing)?)\b/i, 'reinstall required'],
  ],
  login_authentication: [
    [6, /\b(login|log in|sign in).{0,45}\b(otp|verify|verification|mobile|email)\b/i, 'login verification'],
    [6, /\b(otp|verify|verification).{0,45}\b(login|log in|sign in|phone|mobile|email)\b/i, 'login verification'],
    [5, /\b(logs? (?:me )?out|logged out|logout every|keeps? logging out)\b/i, 'unexpected logout'],
    [4, /\b(unable|can'?t|cannot|not able) to (?:log ?in|sign ?in|verify|register)\b/i, 'access blocked'],
    [3, /\b(registration|registering|account verification)\b/i, 'registration'],
    [5, /^.{0,20}\b(not sending|didn'?t send|doesn'?t send|no) otp\b.{0,20}$/i, 'OTP not delivered'],
    [7, /\b(asks?|asking|requires?).{0,30}\botp.{0,30}\b(open|login|log in|application|app)\b/i, 'OTP required for access'],
    [5, /\b(asks?|asking).{0,30}\bcredentials\b/i, 'repeated credentials'],
    [7, /\b(every time|always).{0,25}\b(requires?|asks?).{0,25}\b(login|otp)\b/i, 'repeated login'],
    [6, /\b(not getting|not receiving|generating|generate|waiting? for).{0,20}\botp\b/i, 'OTP delivery'],
    [5, /\botp.{0,25}\b(delay|delayed|slow|took time|not getting|not receiving)\b/i, 'OTP delivery'],
  ],
  boarding_otp_checkin: [
    [6, /\b(seat ?belt|seat ?buckle)\b/i, 'seat-belt flow'],
    [5, /\b(otp).{0,40}\b(board|boarding|trip|cab|ride|driver|seat ?belt|seat ?buckle)\b/i, 'trip OTP'],
    [5, /\b(board|boarding|trip|cab|ride|driver).{0,40}\botp\b/i, 'trip OTP'],
    [5, /\b(no[ -]?show|check[ -]?in|checkin|attendance)\b/i, 'check-in or no-show'],
    [3, /\b(pick(?:ed)? status|passenger picked|sign[- ]?out otp|end otp)\b/i, 'boarding status'],
  ],
  feedback_rating: [
    [6, /\b(force|forcing|mandatory|must).{0,35}\b(rate|rating|feedback)\b/i, 'forced feedback'],
    [6, /\b(rate|rating|feedback).{0,35}\b(block|skip|again|every ride)\b/i, 'blocking feedback'],
    [5, /\b(no|not|unable|can'?t|cannot).{0,30}\bfeedback (?:option|status|button)\b/i, 'missing feedback path'],
    [4, /\bfeedback.{0,30}\b(no response|ignored|unresolved|status)\b/i, 'unresolved feedback'],
    [6, /\bfeedback.{0,80}\b(again|blocks?|status)\b/i, 'blocking or unresolved feedback'],
    [7, /\b(force|forced|forcing).{0,30}\breview\b/i, 'forced review'],
    [6, /\b(no option|cannot|can'?t).{0,25}\bskip the review\b/i, 'unskippable review'],
  ],
  tracking_eta: [
    [5, /\b(live )?(tracking|track the (?:cab|vehicle|car|driver|van|shuttle))\b/i, 'live tracking'],
    [5, /\b(eta|estimated (?:arrival|time)|pickup time|drop time)\b/i, 'ETA'],
    [4, /\b(wrong|incorrect|inaccurate|false|stale|freeze|stuck).{0,35}\b(location|map|tracking|eta|pickup time)\b/i, 'inaccurate tracking'],
    [4, /\b(location|map|tracking|eta).{0,35}\b(wrong|incorrect|inaccurate|false|stale|freeze|stuck)\b/i, 'inaccurate tracking'],
    [4, /\b(driver|cab|vehicle|car).{0,25}\blocation\b/i, 'vehicle location'],
    [3, /\b(map).{0,40}\b(zoom|location|track)\b/i, 'map interaction'],
    [5, /\btrack the location|location of the (?:cab|vehicle|car|driver|van|shuttle)\b/i, 'vehicle location'],
    [5, /\b(different|wrong|incorrect) location.{0,35}\b(glitch|driver|cab|vehicle)\b/i, 'incorrect displayed location'],
    [4, /\bworst mapping\b/i, 'mapping'],
    [5, /\b(different|wrong|incorrect) location\b/i, 'incorrect displayed location'],
    [5, /\bshowing time.{0,25}\bhrs?|hours?\b/i, 'implausible ETA'],
  ],
  routing_trip_quality: [
    [6, /\b(route|routing).{0,45}\b(opposite|wrong|long|poor|bad|horrible|inefficient|detour|club|clubbing)\b/i, 'poor route'],
    [6, /\b(opposite|wrong|long|detour|club|clubbing).{0,45}\b(route|routing|passenger|cab)\b/i, 'poor route'],
    [7, /\b(route|routing algorithm|pickup order|passenger grouping|clubbed|clubs passengers)\b/i, 'routing'],
    [3, /\b(travel|trip).{0,35}\b(extra|hour|longer|delay)\b/i, 'trip duration'],
    [5, /\b(routing location|clubbing|not from the same route)\b/i, 'routing'],
    [6, /\b(routing|pickup timings?).{0,60}\b(spending|reach office|hours?|late)\b/i, 'routing delay'],
  ],
  notifications: [
    [6, /\b(notification|notifications|push notification|reminder|alert)\b/i, 'notification'],
    [3, /\b(sms).{0,30}\b(late|delay|missing|not|wrong)\b/i, 'SMS issue'],
  ],
  booking_cancellation: [
    [5, /\b(book|booking|booked).{0,45}\b(fail|failed|unable|cannot|can'?t|not|no slot|waitlist|confirm|confirmation)\b/i, 'booking failure or status'],
    [5, /\b(unable|cannot|can'?t|not able|fails?).{0,30}\b(book|booking|schedule)\b/i, 'booking blocked'],
    [7, /\b(does not|doesn'?t|won'?t) let (?:me|us|you) (?:book|schedule)\b/i, 'booking blocked'],
    [5, /\b(cancel|cancellation|cancelled|canceled).{0,35}\b(fail|failed|unable|cannot|doesn'?t|does not|not work|still)\b/i, 'cancellation failure'],
    [4, /\b(waitlist|wait list|booking status|current bookings?|booking confirmation|no slots?)\b/i, 'booking state'],
    [3, /\b(book|booking|schedule|scheduling|cancel|cancellation)\b/i, 'booking'],
    [7, /\b(bookings?|dates?).{0,50}\b(different dates?|wrong dates?)\b/i, 'incorrect booking dates'],
    [6, /\b(roster|booking|booked).{0,45}\b(not able|unable|cannot|can'?t).{0,25}\b(edit|change)\b/i, 'booking cannot be changed'],
  ],
  support_operations: [
    [6, /\b(driver|help ?desk|customer support|transport (?:team|desk|management|facility|company)).{0,50}\b(rude|unhelpful|not help|no response|not receiving|hostile|poor|bad|worst)\b/i, 'support or driver conduct'],
    [5, /\b(no cab|cab not assigned|vehicle not assigned|driver not assigned|still no updates|never picks? up|late cab|driver left)\b/i, 'operational failure'],
    [4, /\b(help ?desk|customer support|transport team|transport desk|driver rude|driver behaviour|driver behavior)\b/i, 'support or driver'],
    [3, /\b(pickup|pick up).{0,30}\b(late|missed|left|no update|hour)\b/i, 'pickup failure'],
    [5, /\b(always|daily|schedule|sched|management).{0,35}\b(late|hour late)\b/i, 'persistent lateness'],
    [4, /\bdriver call.{0,35}\b(audio|unclear|not clear|call quality)\b/i, 'driver communication'],
  ],
  ui_navigation: [
    [5, /\b(confusing|complicated|not user friendly|isn'?t user friendly|unintuitive|poor ux|bad ux)\b/i, 'confusing UX'],
    [4, /\b(multiple clicks?|too many clicks?|extra click|one more click|multiple taps?)\b/i, 'excess interaction'],
    [4, /\b(new (?:ui|update|version|design)|latest update).{0,45}\b(worse|bad|dislike|confus|not user friendly|horrible)\b/i, 'regressive update'],
    [3, /\b(interface|layout|navigation|monthly view|single view|old version|bring the old|design)\b/i, 'interface'],
    [4, /\b(use cases?|one flow|product flow)\b/i, 'use-case mismatch'],
    [4, /\b(chat\+?location|chat and location|in-app messaging|call support|clear instructions|navigation on the map)\b/i, 'missing coordination UX'],
    [5, /\b(no (?:option|way)).{0,45}\b(go back|edit profile|communicate|call|chat|messag)\b/i, 'missing interface action'],
    [5, /\b(call|chat|messaging) option.{0,45}\b(driver|employee|assigned cab)\b/i, 'missing driver communication'],
  ],
};

const positivePatterns = [
  /^(good|very good|nice|very nice|great|very great|excellent|awesome|superb|useful|amazing|best|impressive)([!. 👍⭐]*)$/i,
  /\b(great|excellent|superb|useful|amazing|impressive).{0,30}\b(app|functionality|optimization|service|night shift)\b/i,
  /\beverything is quite good\b/i,
  /^(overall )?(good|great|excellent)([!. 👍⭐🏼]*)$/i,
  /\buser friendly(?: app)?\b/i,
  /\b(enjoyable|happy with the reliability|good safe to travel|does it'?s job|great work)\b/i,
  /^good app[!. 👍⭐🏼]*$/i,
  /\b(features?|application).{0,30}\b(great|fine|good)\b/i,
  /\bother than that.{0,80}\b(fine|good|great)\b/i,
];

const negativeSignal = /\b(worst|bad|poor|pathetic|annoying|frustrating|horrible|unable|cannot|can'?t|doesn'?t|does not|not working|fail|crash|wrong|incorrect|unreliable|confusing|issue|problem|stuck|rude|delay|missing)\b/i;

function classify(review) {
  const originalText = review.review_text.replace(/\s+/g, ' ').trim();
  const text = originalText
    .replace(/\b(not|isn'?t|doesn'?t|never) (crashing|crash|hanging|hang|freezing|freeze)\b/gi, ' stable ')
    .replace(/\b(no|without) (?:major )?(issues?|problems?|errors?)\b/gi, ' stable ');
  const scores = [];

  for (const [theme, themeRules] of Object.entries(rules)) {
    let score = 0;
    const evidence = [];
    for (const [weight, pattern, label] of themeRules) {
      if (pattern.test(text)) {
        score += weight;
        evidence.push(label);
      }
    }
    if (score > 0) scores.push({ theme, score, evidence: [...new Set(evidence)] });
  }

  scores.sort((left, right) => right.score - left.score);
  const positive = positivePatterns.some((pattern) => pattern.test(originalText));

  if (positive && !negativeSignal.test(text)) {
    return { primary_theme: 'positive', confidence: 0.98, evidence: ['positive text and rating'] };
  }

  if (scores.length === 0) {
    return { primary_theme: 'unclear', confidence: 0.35, evidence: ['no specific theme matched'] };
  }

  const best = scores[0];
  const runnerUp = scores[1]?.score ?? 0;
  const margin = best.score - runnerUp;
  const confidence = Math.min(0.95, 0.5 + best.score * 0.04 + margin * 0.025);

  return {
    primary_theme: best.theme,
    confidence: Number(confidence.toFixed(2)),
    evidence: best.evidence,
  };
}

function inferJourneyStage(theme, text) {
  if (theme === 'login_authentication' || /\b(open|launch) the app\b/i.test(text)) return 'app_access';
  if (theme === 'booking_cancellation' || theme === 'metro_ticketing') return 'booking';
  if (theme === 'boarding_otp_checkin') return 'boarding';
  if (theme === 'routing_trip_quality') return 'in_trip';
  if (theme === 'feedback_rating') return 'post_trip';
  if (['tracking_eta', 'support_operations'].includes(theme)) return 'pre_pickup';
  if (theme === 'positive' || theme === 'unclear') return 'not_applicable';
  return 'cross_journey';
}

function inferSeverity(review, theme) {
  if (theme === 'positive' || theme === 'unclear') return 'low';
  if (['stability_performance', 'login_authentication', 'booking_cancellation', 'metro_ticketing'].includes(theme)) return review.rating <= 3 ? 'high' : 'medium';
  if (/\b(safety|unsafe|danger|threat|stranded|miss(?:ed|ing) (?:the )?cab)\b/i.test(review.review_text)) return 'high';
  return review.rating <= 2 ? 'high' : 'medium';
}

function inferOwner(theme) {
  return {
    booking_cancellation: 'shared_product_operations',
    tracking_eta: 'shared_product_operations',
    login_authentication: 'backend_platform',
    boarding_otp_checkin: 'shared_product_operations',
    notifications: 'backend_platform',
    stability_performance: 'mobile_app',
    ui_navigation: 'product_design',
    routing_trip_quality: 'routing_data',
    support_operations: 'customer_operations',
    feedback_rating: 'product_design',
    metro_ticketing: 'shared_product_operations',
    positive: 'unknown',
    unclear: 'unknown',
  }[theme];
}

const classified = reviews.map((review) => {
  const result = classify(review);
  return {
    ...review,
    primary_theme: result.primary_theme,
    journey_stage: inferJourneyStage(result.primary_theme, review.review_text),
    severity: inferSeverity(review, result.primary_theme),
    likely_owner: inferOwner(result.primary_theme),
    classification_confidence: result.confidence,
    classification_evidence: result.evidence.join('; '),
  };
});

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const fields = Object.keys(classified[0]);
const csv = [
  fields.join(','),
  ...classified.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
].join('\n');

const themeCounts = {};
for (const row of classified) themeCounts[row.primary_theme] = (themeCounts[row.primary_theme] ?? 0) + 1;

await Promise.all([
  fs.writeFile('analysis/classified_reviews.csv', `${csv}\n`),
  fs.writeFile('analysis/classified_reviews.json', `${JSON.stringify(classified, null, 2)}\n`),
  fs.writeFile('analysis/classification_summary.json', `${JSON.stringify({ total: classified.length, theme_counts: themeCounts }, null, 2)}\n`),
]);

console.log(`Classified ${classified.length} reviews.`);
console.log(JSON.stringify(themeCounts, null, 2));
