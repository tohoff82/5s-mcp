import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizePlan,
  summarizeApply,
  summarizeExplanation,
  technicalReceipt
} from '../public/presentation.js';

const longId = 'profile_safe-' + 'a'.repeat(180);

const explanation = {
  workflow_id: 'wf-test',
  target_id: 'demo',
  requested_outcome: 'inspect and safely maintain workspace',
  safe_operation_ids: [longId],
  review_operation_ids: ['profile_review-1'],
  denied_operation_ids: ['profile_denied-1'],
  approved_operation_ids: [longId],
  actual_execution_scope: [longId],
  verification_state: 'VERIFIED_SUCCESS',
  verification_reasons: [],
  uncertainty: []
};

test('plan and apply summaries preserve bounded classification and verification signals', () => {
  assert.equal(
    summarizePlan(explanation),
    'SAFE: 1 · REVIEW: 1 · DENIED: 1 · No effect has been applied.'
  );
  assert.equal(
    summarizeApply(explanation),
    'Verification: VERIFIED_SUCCESS. Approved actions: 1.'
  );
});

test('structured Explain response renders as bounded human-readable text', () => {
  assert.equal(
    summarizeExplanation(explanation),
    'Applied 1 approved SAFE action. 1 REVIEW action was left unchanged because it was outside the approved SAFE execution scope. 1 DENIED action was left unchanged because policy denied it. Verification: VERIFIED_SUCCESS.'
  );
});

test('visible Explain text never falls back to raw structured JSON or long operation ids', () => {
  const visible = summarizeExplanation(explanation);
  assert.equal(visible.includes('{'), false);
  assert.equal(visible.includes('"workflow_id"'), false);
  assert.equal(visible.includes(longId), false);
});

test('Technical receipt preserves the exact structured backend response', () => {
  assert.equal(technicalReceipt(explanation), JSON.stringify(explanation, null, 2));
  assert.match(technicalReceipt(explanation), new RegExp(longId));
});
