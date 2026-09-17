import test from 'node:test';
import assert from 'node:assert/strict';
import { composeWorkflowExplanation } from '../../src/safeops/workflow/explanation.js';

test('explanation preserves planned, approved, executed, denied, and verification distinctions', () => {
  const explanation = composeWorkflowExplanation({
    workflow: { workflow_id: 'wf-1', target_context: { target_id: 'demo' }, intent_context: { requested_outcome: 'clean workspace' } },
    classificationSet: { per_action: [{ operation_id: 'a', classification: 'SAFE' }, { operation_id: 'b', classification: 'REVIEW' }, { operation_id: 'c', classification: 'DENIED' }] },
    approval: { approved_operation_ids: ['a'] },
    effectResult: { execution_scope: { operation_ids: ['a'] } },
    verificationResult: { verification_state: 'VERIFIED_SUCCESS', reasons: [] }
  });
  assert.deepEqual(explanation.safe_operation_ids, ['a']);
  assert.deepEqual(explanation.review_operation_ids, ['b']);
  assert.deepEqual(explanation.denied_operation_ids, ['c']);
  assert.deepEqual(explanation.approved_operation_ids, ['a']);
  assert.equal(explanation.verification_state, 'VERIFIED_SUCCESS');
});
