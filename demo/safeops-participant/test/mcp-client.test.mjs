import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DemoMcpClient,
  EXPECTED_SAFEOPS_TOOLS,
  assertExactToolSurface
} from '../lib/mcp-client.mjs';

test('exactly three SafeOps tools are accepted', () => {
  assert.doesNotThrow(() => assertExactToolSurface(EXPECTED_SAFEOPS_TOOLS.map(name => ({ name }))));
  assert.throws(
    () => assertExactToolSurface([...EXPECTED_SAFEOPS_TOOLS, 'seiso_clean_system'].map(name => ({ name }))),
    /Unexpected SafeOps tool surface/
  );
});

test('inspect, bounded apply, elicitation and explanation use only backend workflow handles', async () => {
  const calls = [];
  let elicitationHandler;
  const fakeClient = {
    setRequestHandler(_schema, handler) { elicitationHandler = handler; },
    async connect() { calls.push(['connect']); },
    async listTools() { return { tools: EXPECTED_SAFEOPS_TOOLS.map(name => ({ name })) }; },
    async callTool({ name, arguments: args }) {
      calls.push([name, args]);
      if (name === 'safeops_inspect_workspace') {
        return { structuredContent: { workflow_id: 'wf-1', plan_id: 'plan-1', target_id: 'demo', safe_operation_ids: ['op-safe'] } };
      }
      if (name === 'safeops_apply_safe_actions') {
        const approval = await elicitationHandler({
          params: {
            mode: 'form',
            requestedSchema: { type: 'object', properties: { confirm: { type: 'boolean' } } }
          }
        });
        assert.deepEqual(approval, { action: 'accept', content: { confirm: true } });
        return { structuredContent: { workflow_id: 'wf-1', plan_id: 'plan-1', approved_operation_ids: ['op-safe'], verification_state: 'VERIFIED_SUCCESS' } };
      }
      return { structuredContent: { workflow_id: 'wf-1', summary: 'Evidence-backed explanation' } };
    },
    async close() {}
  };
  const session = { id: 'session-1', current: null };
  const client = new DemoMcpClient({
    resourceUri: 'https://safeops.example/mcp',
    oauthClient: { authorizedFetch: async () => new Response('{}') },
    session,
    clientFactory: () => fakeClient,
    transportFactory: () => ({})
  });

  await client.connect();
  await client.inspect({ targetId: 'demo' });
  const issued = client.issueApproval();
  const applied = await client.apply({ approvalNonce: issued.nonce });
  const explained = await client.explain();

  assert.equal(applied.verification_state, 'VERIFIED_SUCCESS');
  assert.equal(explained.summary, 'Evidence-backed explanation');
  assert.deepEqual(calls[1], ['safeops_inspect_workspace', { target_id: 'demo' }]);
  assert.deepEqual(calls[2], ['safeops_apply_safe_actions', { workflow_id: 'wf-1', plan_id: 'plan-1' }]);
  assert.deepEqual(calls[3], ['safeops_explain_workflow', { workflow_id: 'wf-1' }]);
  assert.equal('operation_ids' in calls[2][1], false);
});
