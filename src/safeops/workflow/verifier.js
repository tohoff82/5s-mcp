export function verifyExecution({ approvedOperationIds, classificationSet, effectResult }) {
  if (!Array.isArray(approvedOperationIds)) throw new Error('approvedOperationIds must be an array');
  if (!classificationSet?.per_action) throw new Error('ClassificationSet is required');
  if (!effectResult) throw new Error('EffectResult is required');

  const approved = [...new Set(approvedOperationIds)];
  const safe = new Set(classificationSet.safe_operation_ids || []);
  const nonSafeApproved = approved.filter(id => !safe.has(id));
  const executionScope = effectResult.execution_scope?.operation_ids;
  if (!Array.isArray(executionScope)) {
    return result('UNKNOWN', ['Effect result has no explicit execution scope'], approved, []);
  }
  const scopeMismatch = !sameIds(approved, executionScope);
  const reasons = [];
  if (nonSafeApproved.length > 0) reasons.push(`Non-SAFE operations entered approval scope: ${nonSafeApproved.join(', ')}`);
  if (scopeMismatch) reasons.push('Actual execution scope does not match approved scope');
  if (reasons.length > 0) return result('VERIFIED_FAILURE', reasons, approved, executionScope);

  const failures = (effectResult.results || []).filter(item => !item.skipped && (item.executed === false || item.removed === false));
  if (failures.length > 0) {
    return result('VERIFIED_PARTIAL', [`${failures.length} effect result item(s) failed`], approved, executionScope, failures);
  }

  const selectedEvidence = new Set();
  for (const item of effectResult.results || []) {
    if (item.skipped) continue;
    if (item.operation) selectedEvidence.add(item.operation);
    if (approved.includes(item.id)) selectedEvidence.add(item.id);
  }
  const missing = approved.filter(id => !selectedEvidence.has(id));
  if (missing.length > 0) {
    return result('INCONCLUSIVE', [`No effect evidence for approved operation(s): ${missing.join(', ')}`], approved, executionScope);
  }

  return result('VERIFIED_SUCCESS', [], approved, executionScope);
}

function result(state, reasons, approved, actual, failures = []) {
  return {
    verification_state: state,
    reasons,
    approved_operation_ids: approved,
    observed_execution_scope: actual,
    failures
  };
}

function sameIds(left, right) {
  if (left.length !== right.length) return false;
  const set = new Set(right);
  return left.every(id => set.has(id));
}
