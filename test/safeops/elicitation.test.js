import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpElicitationApprovalProvider } from '../../src/safeops/approval/mcp-elicitation.js';

function request() {
  return {
    workflow: { workflow_id: 'wf-1' },
    actorContext: { actor_id: 'alice' },
    targetContext: { target_id: 'demo' },
    plan: { id: 'plan-1' },
    classification: {},
    operationIds: ['op-a', 'op-b']
  };
}

test('MCP elicitation approval binds an explicit accepted confirmation to the exact SAFE scope', async () => {
  let elicitation = null;
  const provider = createMcpElicitationApprovalProvider({ server: { async elicitInput(params) { elicitation = params; return { action: 'accept', content: { confirm: true } }; } } });
  const result = await provider.requestApproval(request());
  assert.equal(result.approved, true);
  assert.equal(elicitation.mode, 'form');
  assert.deepEqual(elicitation.requestedSchema.required, ['confirm']);
  assert.deepEqual(result.event.operation_ids, ['op-a', 'op-b']);
  assert.equal(result.event.actor_id, 'alice');
  assert.equal(result.event.plan_id, 'plan-1');
});

test('MCP elicitation decline or unconfirmed accept grants no approval', async () => {
  const declined = createMcpElicitationApprovalProvider({ server: { async elicitInput() { return { action: 'decline' }; } } });
  assert.equal((await declined.requestApproval(request())).approved, false);
  const unconfirmed = createMcpElicitationApprovalProvider({ server: { async elicitInput() { return { action: 'accept', content: { confirm: false } }; } } });
  assert.equal((await unconfirmed.requestApproval(request())).approved, false);
});

test('MCP elicitation refuses an empty effect scope', async () => {
  const provider = createMcpElicitationApprovalProvider({ server: { async elicitInput() { throw new Error('should not run'); } } });
  await assert.rejects(() => provider.requestApproval({ ...request(), operationIds: [] }), /Non-empty SAFE operation scope/);
});
