import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPlan, selectSafeOperationIds } from '../../src/safeops/workflow/classifier.js';

function operation(id, riskLevel, { allowed = true, denied = [] } = {}) {
  return { id, kind: 'command', verdict: { allowed, risk: riskLevel === 'P3_HIGH' ? 'high' : riskLevel === 'P4_FORBIDDEN' ? 'critical' : 'medium', risk_level: riskLevel, matches: { denied, allowed: [] }, reasons: [] } };
}

test('classifier maps safe, review, and denied operations without collapsing boundaries', () => {
  const set = classifyPlan({ id: 'plan-1', operations: [operation('safe', 'P2_MEDIUM'), operation('review', 'P3_HIGH', { allowed: false }), operation('denied', 'P4_FORBIDDEN', { allowed: false, denied: [{ id: 'deny-x' }] })] });
  assert.deepEqual(set.safe_operation_ids, ['safe']);
  assert.deepEqual(set.review_operation_ids, ['review']);
  assert.deepEqual(set.denied_operation_ids, ['denied']);
});

test('ordinary approval selector refuses REVIEW and DENIED operations', () => {
  const set = classifyPlan({ id: 'plan-1', operations: [operation('safe', 'P1_LOW'), operation('review', 'P3_HIGH', { allowed: false }), operation('denied', 'P4_FORBIDDEN', { allowed: false, denied: [{ id: 'd' }] })] });
  assert.deepEqual(selectSafeOperationIds(set, ['safe']), ['safe']);
  assert.throws(() => selectSafeOperationIds(set, ['review']), /not SAFE/);
  assert.throws(() => selectSafeOperationIds(set, ['denied']), /not SAFE/);
});

test('missing policy evidence routes to REVIEW rather than SAFE', () => {
  const set = classifyPlan({ id: 'plan-1', operations: [{ id: 'unknown', kind: 'command' }] });
  assert.deepEqual(set.review_operation_ids, ['unknown']);
});
