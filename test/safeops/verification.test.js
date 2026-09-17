import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyExecution } from '../../src/safeops/workflow/verifier.js';
import { FiveSBridge } from '../../src/safeops/five-s/bridge.js';

const classificationSet = { per_action: [{ operation_id: 'safe', classification: 'SAFE' }, { operation_id: 'review', classification: 'REVIEW' }, { operation_id: 'denied', classification: 'DENIED' }], safe_operation_ids: ['safe'], review_operation_ids: ['review'], denied_operation_ids: ['denied'] };

test('verifier requires actual execution scope to equal approved SAFE scope', () => {
  const ok = verifyExecution({ approvedOperationIds: ['safe'], classificationSet, effectResult: { execution_scope: { operation_ids: ['safe'] }, results: [{ id: 'safe', executed: true }] } });
  assert.equal(ok.verification_state, 'VERIFIED_SUCCESS');
  const wider = verifyExecution({ approvedOperationIds: ['safe'], classificationSet, effectResult: { execution_scope: { operation_ids: ['safe', 'review'] }, results: [] } });
  assert.equal(wider.verification_state, 'VERIFIED_FAILURE');
});

test('verifier refuses a non-SAFE approved scope even if effect evidence claims success', () => {
  const result = verifyExecution({ approvedOperationIds: ['review'], classificationSet, effectResult: { execution_scope: { operation_ids: ['review'] }, results: [{ id: 'review', executed: true }] } });
  assert.equal(result.verification_state, 'VERIFIED_FAILURE');
});

test('verifier distinguishes partial effect from verified success', () => {
  const result = verifyExecution({ approvedOperationIds: ['safe'], classificationSet, effectResult: { execution_scope: { operation_ids: ['safe'] }, results: [{ id: 'safe', executed: false, error: 'simulated' }] } });
  assert.equal(result.verification_state, 'VERIFIED_PARTIAL');
});

test('5S bridge requires a bound target profile and exact operation ids for effect calls', async () => {
  assert.throws(() => new FiveSBridge({ targetContext: {} }), /target_profile/);
  const calls = [];
  const engine = { stagePlan: async (id, options) => { calls.push(['stage', id, options]); return {}; }, applyPlan: async (id, options) => { calls.push(['apply', id, options]); return {}; } };
  const bridge = new FiveSBridge({ targetContext: { target_profile: { root: '/tmp/safeops', targets: { temp: 'temp' } } }, policy: {}, engine });
  await assert.rejects(() => bridge.stage('plan-1'), /Exact operationIds/);
  await bridge.stage('plan-1', ['op-1']);
  await bridge.apply('plan-1', ['op-1']);
  assert.deepEqual(calls, [['stage', 'plan-1', { operationIds: ['op-1'] }], ['apply', 'plan-1', { approved: true, operationIds: ['op-1'] }]]);
});
