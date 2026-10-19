import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DemoReplayController, DEMO_ACTOR, DEMO_FIXTURE_ROOT } from '../../src/safeops/demo/replay-controller.js';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from '../../src/safeops/http.js';

test('real Streamable HTTP tools/call receives the server-held replay lease through verified OAuth context', async t => {
  const authInfo = { clientId: 'judge-client', scopes: ['mcp:tools', 'safeops:apply'], extra: { subject: DEMO_ACTOR } };
  const replay = new DemoReplayController();
  replay.restoreFixture = async () => {};
  let guardCalls = 0, seenLeaseToken = null;
  const original = replay.withToolCall.bind(replay);
  replay.withToolCall = async (ctx, action) => {
    guardCalls += 1;
    seenLeaseToken = ctx?.authInfo?.extra?.demoLeaseToken;
    return original(ctx, async () => ({ verified: true }));
  };
  const registry = {
    resolve() { return { target_id: 'demo', scope: { workspace_root: DEMO_FIXTURE_ROOT } }; }
  };
  const server = createSafeOpsHttpServer({
    dependencies: {
      targetRegistry: registry,
      coordinator: {}, store: { async loadCurrent() { throw new Error('workflow_not_found'); } },
      bridgeFactory() { return {}; },
      approvalProvider: { async requestApproval() { return { approved: false }; } },
      demoReplay: replay
    },
    tokenValidator: { async verifyAuthorizationHeader(value) {
      if (value !== 'Bearer test-token') throw Object.assign(new Error('Missing auth'), { statusCode: 401 });
      return authInfo;
    }},
    resourceMetadata: { resource: 'http://example.invalid/mcp' },
    requiredUserScope: 'mcp:tools', demoReplay: replay
  });
  const address = await listenSafeOpsHttp(server, { port: 0 });
  const resourceUri = new URL('http://127.0.0.1:' + address.port + '/mcp');
  const prepared = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: crypto.randomUUID() });
  const client = new Client({ name: 'safeops-demo-lease-wire', version: '0.1.0' }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(resourceUri, {
    requestInit: { headers: { authorization: 'Bearer test-token', 'x-safeops-demo-lease': prepared.lease_token } }
  });
  t.after(async () => { await client.close().catch(() => {}); await new Promise(resolve => server.close(resolve)); });
  await client.connect(transport);
  assert.deepEqual((await client.listTools()).tools.map(x => x.name),
    ['safeops_inspect_workspace', 'safeops_apply_safe_actions', 'safeops_explain_workflow']);
  const result = await client.callTool({ name: 'safeops_explain_workflow', arguments: { workflow_id: 'wf-missing' } });
  assert.deepEqual(result.structuredContent, { verified: true });
  assert.equal(guardCalls, 1);
  assert.equal(seenLeaseToken, prepared.lease_token);
});
