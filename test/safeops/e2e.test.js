import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { DEFAULT_POLICY, SafetyPolicyManager } from '../../src/safety-policy.js';
import { TargetRegistry } from '../../src/safeops/targets/target-registry.js';
import { WorkflowStore } from '../../src/safeops/workflow/store.js';
import { WorkflowCoordinator } from '../../src/safeops/workflow/coordinator.js';
import { FiveSBridge } from '../../src/safeops/five-s/bridge.js';
import { SafeOpsMcpServer } from '../../src/safeops/server.js';
import { createFixture, resetFixture, verifyFixture } from '../../scripts/safeops-fixture.mjs';

async function invoke(server, name, args) {
  const response = await server.handleToolCall({ params: { name, arguments: args } });
  return response.structuredContent;
}

test('controlled fixture exercises inspect -> bounded approval -> SAFE-only effect -> verify -> explain', async () => {
  const root = await mkdtemp(path.join(os.homedir(), 'safeops-c0-fixture-'));
  await rm(root, { recursive: true, force: true });
  await createFixture(root);
  assert.equal((await verifyFixture(root)).complete, true);

  const policyPath = path.join(root, 'fixture-policy.json');
  const policyConfig = structuredClone(DEFAULT_POLICY);
  policyConfig.allow = [...policyConfig.allow, { id: 'allow-safeops-fixture-safe', type: 'path_prefix', value: path.join(root, 'safe'), reason: 'Controlled SafeOps SAFE fixture' }];
  policyConfig.deny = [...policyConfig.deny, { id: 'deny-safeops-fixture-denied', type: 'path_prefix', value: path.join(root, 'denied'), reason: 'Controlled SafeOps DENIED fixture' }];
  await writeFile(policyPath, JSON.stringify(policyConfig, null, 2));
  const policy = new SafetyPolicyManager(policyPath);

  const targetRegistry = new TargetRegistry({
    demo: { root, actor_ids: ['alice'], engine_targets: { safe: 'safe', review: 'review', denied: 'denied' } }
  });
  const store = new WorkflowStore(path.join(root, 'state'));
  const coordinator = new WorkflowCoordinator({ store });
  const plansDir = path.join(root, 'plans');
  const backupDir = path.join(root, 'backup');
  const bridgeFactory = targetContext => new FiveSBridge({ targetContext, plansDir, backupDir, policy });
  const approvalEvents = [];
  const approvalProvider = {
    async requestApproval(request) {
      approvalEvents.push(request);
      return { approved: true, event: { carrier: 'local-test-approval', confirmed: true } };
    }
  };
  const server = new SafeOpsMcpServer({
    dependencies: { targetRegistry, coordinator, store, bridgeFactory, approvalProvider },
    contextProvider: async () => ({ serviceContext: { service_identity: 'test' }, actorContext: { actor_id: 'alice' } })
  });

  try {
    const inspected = await invoke(server, 'safeops_inspect_workspace', { target_id: 'demo', targets: ['safe', 'review', 'denied'], preserve_days: 0, requested_outcome: 'clean controlled fixture' });
    assert.equal(inspected.safe_operation_ids.length, 1);
    assert.equal(inspected.review_operation_ids.length, 1);
    assert.equal(inspected.denied_operation_ids.length, 1);

    const applied = await invoke(server, 'safeops_apply_safe_actions', { workflow_id: inspected.workflow_id, plan_id: inspected.plan_id, operation_ids: inspected.safe_operation_ids });
    assert.deepEqual(applied.approved_operation_ids, inspected.safe_operation_ids);
    assert.equal(applied.verification_state, 'VERIFIED_SUCCESS');
    assert.equal(approvalEvents.length, 1);
    assert.deepEqual(approvalEvents[0].operationIds, inspected.safe_operation_ids);

    await assert.rejects(() => access(path.join(root, 'safe', 'safe.tmp')));
    await access(path.join(root, 'review', 'review.tmp'));
    await access(path.join(root, 'denied', 'denied.tmp'));

    const explained = await invoke(server, 'safeops_explain_workflow', { workflow_id: inspected.workflow_id });
    assert.deepEqual(explained.approved_operation_ids, inspected.safe_operation_ids);
    assert.deepEqual(explained.review_operation_ids, inspected.review_operation_ids);
    assert.deepEqual(explained.denied_operation_ids, inspected.denied_operation_ids);
    assert.equal(explained.verification_state, 'VERIFIED_SUCCESS');

    const events = (await readFile(path.join(root, 'state', 'workflows', inspected.workflow_id, 'events.ndjson'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.ok(events.some(event => event.type === 'approval_granted'));
    assert.ok(events.some(event => event.type === 'approval_consumed'));
    assert.ok(events.some(event => event.type === 'effect_verified'));
  } finally {
    await resetFixture(root);
  }
});

test('fixture reset refuses an unmarked arbitrary directory', async () => {
  const root = await mkdtemp(path.join(os.homedir(), 'safeops-c0-fixture-'));
  await assert.rejects(() => resetFixture(root), /ENOENT/);
  await rm(root, { recursive: true, force: true });
});
