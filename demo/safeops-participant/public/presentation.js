export function summarizePlan(data = {}) {
  return [
    `SAFE: ${count(data.safe_operation_ids)}`,
    `REVIEW: ${count(data.review_operation_ids)}`,
    `DENIED: ${count(data.denied_operation_ids)}`,
    'No effect has been applied.'
  ].join(' · ');
}

export function summarizeApply(data = {}) {
  return `Verification: ${stringOr(data.verification_state, 'UNKNOWN')}. Approved actions: ${count(data.approved_operation_ids)}.`;
}

export function summarizeExplanation(data = {}) {
  const safe = stringArray(data.safe_operation_ids);
  const approved = stringArray(data.approved_operation_ids);
  const executed = stringArray(data.actual_execution_scope);
  const reviewCount = count(data.review_operation_ids);
  const deniedCount = count(data.denied_operation_ids);

  const approvedSafe = new Set(approved.filter(id => safe.includes(id)));
  const appliedApprovedSafe = executed.filter(id => approvedSafe.has(id)).length;

  return [
    `Applied ${appliedApprovedSafe} approved SAFE ${noun(appliedApprovedSafe, 'action')}.`,
    `${reviewCount} REVIEW ${noun(reviewCount, 'action')} ${verb(reviewCount, 'was', 'were')} left unchanged because ${pronoun(reviewCount)} outside the approved SAFE execution scope.`,
    `${deniedCount} DENIED ${noun(deniedCount, 'action')} ${verb(deniedCount, 'was', 'were')} left unchanged because policy denied ${objectPronoun(deniedCount)}.`,
    `Verification: ${stringOr(data.verification_state, 'UNKNOWN')}.`
  ].join(' ');
}

export function technicalReceipt(data) {
  return JSON.stringify(data, null, 2);
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function stringOr(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function noun(value, singular) {
  return value === 1 ? singular : `${singular}s`;
}

function verb(value, singular, plural) {
  return value === 1 ? singular : plural;
}

function pronoun(value) {
  return value === 1 ? 'it was' : 'they were';
}

function objectPronoun(value) {
  return value === 1 ? 'it' : 'them';
}
