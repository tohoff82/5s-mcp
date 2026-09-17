import test from 'node:test';
import assert from 'node:assert/strict';
import { SafeOpsMcpServer } from '../../src/safeops/server.js';

function dependencies() {
  return {
    targetRegistry: { resolve() { return { target_id: 'demo', target_profile: { root: '/tmp/safeops', targets: { temp: 'temp' } } }; } },
    coordinator: {},
    store: {},
    bridgeFactory() { return {}; },
    approvalProvider: { async requestApproval() { return { approved: false }; } }
  };
}

test('SafeOps server exposes exactly three workflow tools and no raw 5S surface', () => {
  const server = new SafeOpsMcpServer({ dependencies: dependencies() });
  const definitions = server.getToolDefinitions();
  assert.deepEqual(definitions.map(tool => tool.name), ['safeops_inspect_workspace', 'safeops_apply_safe_actions', 'safeops_explain_workflow']);
  assert.equal(definitions.length, 3);
  assert.equal(definitions.some(tool => tool.name.startsWith('5s_') || tool.name === 'seiso_clean_system'), false);
});

test('apply is the only SafeOps effect-capable tool', () => {
  const server = new SafeOpsMcpServer({ dependencies: dependencies() });
  const effectful = server.getToolDefinitions().filter(tool => tool.annotations.destructiveHint).map(tool => tool.name);
  assert.deepEqual(effectful, ['safeops_apply_safe_actions']);
});

test('tool schemas do not accept actor identity or approved=true as model-supplied authority', () => {
  const server = new SafeOpsMcpServer({ dependencies: dependencies() });
  for (const tool of server.getToolDefinitions()) {
    assert.equal(Object.hasOwn(tool.inputSchema.properties || {}, 'actor_id'), false);
    assert.equal(Object.hasOwn(tool.inputSchema.properties || {}, 'approved'), false);
  }
});

test('server obtains ActorContext from context provider rather than tool arguments', async () => {
  let receivedContext = null;
  const deps = dependencies();
  deps.targetRegistry = { resolve(actor) { receivedContext = actor; throw new Error('stop-after-context'); } };
  const server = new SafeOpsMcpServer({ dependencies: deps, contextProvider: async () => ({ actorContext: { actor_id: 'alice' } }) });
  await assert.rejects(() => server.handleToolCall({ params: { name: 'safeops_inspect_workspace', arguments: { target_id: 'demo' } } }), /SafeOps tool failed/);
  assert.deepEqual(receivedContext, { actor_id: 'alice' });
});


test('server materializes an approval provider from the connected MCP server factory', () => {
  let receivedServer = null;
  const deps = dependencies();
  delete deps.approvalProvider;
  deps.approvalProviderFactory = server => {
    receivedServer = server;
    return { async requestApproval() { return { approved: false }; } };
  };
  const safeops = new SafeOpsMcpServer({ dependencies: deps });
  assert.equal(receivedServer, safeops.server);
});
