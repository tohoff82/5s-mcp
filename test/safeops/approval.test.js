import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { WorkflowStore } from '../../src/safeops/workflow/store.js';
import { ApprovalManager } from '../../src/safeops/workflow/approval.js';

async function setup() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'safeops-approval-'));
  const store = new WorkflowStore(tmp);
  await store.createWorkflow({ workflow_id: 'wf-1', lifecycle_state: 'CLASSIFIED', created_at: 't0' });
  return { tmp, store, approvals: new ApprovalManager({ store, now: () => '2026-09-17T00:00:00.000Z' }) };
}

test('approval context binds actor, target, plan digest, and exact operation scope', async () => {
  const { tmp, approvals } = await setup();
  const digest = 'a'.repeat(64);
  const approval = await approvals.grant({ workflowId: 'wf-1', actorId: 'alice', targetId: 'demo', planId: 'plan-1', planDigest: digest, approvedOperationIds: ['op-1'], approvalEvent: { carrier: 'test' } });
  assert.deepEqual(approval.approved_operation_ids, ['op-1']);
  await assert.rejects(() => approvals.consume({ workflowId: 'wf-1', approvalId: approval.approval_id, expected: { actorId: 'alice', targetId: 'demo', planId: 'plan-1', planDigest: 'b'.repeat(64), approvedOperationIds: ['op-1'] } }), /plan_digest mismatch/);
  const consumed = await approvals.consume({ workflowId: 'wf-1', approvalId: approval.approval_id, expected: { actorId: 'alice', targetId: 'demo', planId: 'plan-1', planDigest: digest, approvedOperationIds: ['op-1'] } });
  assert.equal(consumed.status, 'CONSUMED');
  await assert.rejects(() => approvals.consume({ workflowId: 'wf-1', approvalId: approval.approval_id, expected: { actorId: 'alice', targetId: 'demo', planId: 'plan-1', planDigest: digest, approvedOperationIds: ['op-1'] } }), /already consumed/);
  await rm(tmp, { recursive: true, force: true });
});

test('approval context rejects duplicate operation ids', async () => {
  const { tmp, approvals } = await setup();
  await assert.rejects(() => approvals.grant({ workflowId: 'wf-1', actorId: 'alice', targetId: 'demo', planId: 'plan-1', planDigest: 'a'.repeat(64), approvedOperationIds: ['op-1', 'op-1'] }), /duplicates/);
  await rm(tmp, { recursive: true, force: true });
});
