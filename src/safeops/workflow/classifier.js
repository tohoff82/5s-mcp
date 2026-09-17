import crypto from 'crypto';

export function classifyPlan(plan) {
  if (!plan?.id || !Array.isArray(plan.operations)) throw new Error('Valid plan is required');
  const classifications = plan.operations.map(operation => classifyOperation(operation));
  return {
    classification_id: `classification-${crypto.randomUUID()}`,
    plan_id: plan.id,
    per_action: classifications,
    safe_operation_ids: classifications.filter(item => item.classification === 'SAFE' && item.executable).map(item => item.operation_id),
    review_operation_ids: classifications.filter(item => item.classification === 'REVIEW').map(item => item.operation_id),
    denied_operation_ids: classifications.filter(item => item.classification === 'DENIED').map(item => item.operation_id)
  };
}

export function selectSafeOperationIds(classificationSet, requestedOperationIds = undefined) {
  if (!classificationSet?.per_action) throw new Error('ClassificationSet is required');
  const safe = new Set(classificationSet.safe_operation_ids || []);
  if (requestedOperationIds === undefined) return [...safe];
  if (!Array.isArray(requestedOperationIds)) throw new Error('requestedOperationIds must be an array');
  const unique = [...new Set(requestedOperationIds)];
  if (unique.length !== requestedOperationIds.length) throw new Error('requestedOperationIds must not contain duplicates');
  const known = new Map(classificationSet.per_action.map(item => [item.operation_id, item]));
  for (const id of unique) {
    const item = known.get(id);
    if (!item) throw new Error(`Unknown classified operation: ${id}`);
    if (!safe.has(id)) throw new Error(`Operation is not SAFE and cannot enter ordinary approval: ${id}`);
  }
  return unique;
}

function classifyOperation(operation) {
  const verdict = operation.verdict;
  const executable = operation.kind !== 'noop';
  if (!verdict) {
    return record(operation, 'REVIEW', executable, ['Policy verdict unavailable']);
  }
  const deniedMatches = verdict.matches?.denied || [];
  if (verdict.risk_level === 'P4_FORBIDDEN' || deniedMatches.length > 0) {
    return record(operation, 'DENIED', executable, verdict.reasons || ['Denied by 5S policy']);
  }
  if (verdict.risk_level === 'P3_HIGH' || verdict.risk === 'high' || verdict.allowed === false) {
    return record(operation, 'REVIEW', executable, verdict.reasons || ['Requires review']);
  }
  return record(operation, 'SAFE', executable, verdict.reasons || []);
}

function record(operation, classification, executable, reasons) {
  return {
    operation_id: operation.id,
    classification,
    executable,
    risk_level: operation.verdict?.risk_level ?? 'UNKNOWN',
    reasons: [...reasons]
  };
}
