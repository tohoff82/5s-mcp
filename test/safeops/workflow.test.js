import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { WorkflowStore } from '../../src/safeops/workflow/store.js';
import { WorkflowCoordinator } from '../../src/safeops/workflow/coordinator.js';
import { computePlanDigest, stableStringify } from '../../src/safeops/workflow/plan-digest.js';

async function makeStore() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'safeops-workflow-'));
  return { tmp, store: new WorkflowStore(tmp) };
}

test('workflow coordinator creates and advances a target-bound workflow', async () => {
  const { tmp, store } = await makeStore();
  const coordinator = new WorkflowCoordinator({ store, now: () => '2026-09-17T00:00:00.000Z' });
  const created = await coordinator.create({ actorContext: { actor_id: 'alice' }, targetContext: { target_id: 'demo', actor_id: 'alice' } });
  assert.equal(created.lifecycle_state, 'TARGET_BOUND');
  const next = await coordinator.transition(created.workflow_id, { state: 'OBSERVED', patch: { observation_ref: 'obs-1' } });
  assert.equal(next.lifecycle_state, 'OBSERVED');
  assert.equal((await store.listEvents(created.workflow_id)).length, 2);
  await rm(tmp, { recursive: true, force: true });
});

test('workflow store preserves immutable object snapshots and rejects path-like ids', async () => {
  const { tmp, store } = await makeStore();
  const workflowId = 'wf-safe';
  await store.createWorkflow({ workflow_id: workflowId, lifecycle_state: 'CREATED', created_at: 't0' });
  await store.writeObject(workflowId, 'obj-1', { value: 1 });
  await assert.rejects(() => store.writeObject(workflowId, 'obj-1', { value: 2 }), error => error.code === 'EEXIST');
  assert.throws(() => store.workflowDir('../escape'), /Invalid workflow_id/);
  await rm(tmp, { recursive: true, force: true });
});

test('plan digest is stable for key ordering and changes for material execution changes', () => {
  const plan = { id: 'plan-1', targets: ['temp'], operations: [{ id: 'op-1', kind: 'command', command: 'echo x', paths: ['/tmp/x'], destructive: false, args: ['x'] }] };
  const same = { operations: [{ destructive: false, paths: ['/tmp/x'], command: 'echo x', kind: 'command', id: 'op-1', args: ['x'] }], targets: ['temp'], id: 'plan-1' };
  assert.equal(computePlanDigest(plan, { target_id: 'demo' }), computePlanDigest(same, { target_id: 'demo' }));
  const changed = structuredClone(plan);
  changed.operations[0].paths = ['/tmp/y'];
  assert.notEqual(computePlanDigest(plan, { target_id: 'demo' }), computePlanDigest(changed, { target_id: 'demo' }));
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
});
