import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_POLICY, SafetyPolicyManager } from '../../src/safety-policy.js';
import { TargetRegistry } from '../../src/safeops/targets/target-registry.js';
import { WorkflowStore } from '../../src/safeops/workflow/store.js';
import { WorkflowCoordinator } from '../../src/safeops/workflow/coordinator.js';
import { FiveSBridge } from '../../src/safeops/five-s/bridge.js';
import { createMcpElicitationApprovalProvider } from '../../src/safeops/approval/mcp-elicitation.js';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from '../../src/safeops/http.js';
import { TokenValidator } from '../../src/safeops/auth/token-validator.js';
import { buildProtectedResourceMetadata } from '../../src/safeops/auth/protected-resource-metadata.js';
import { createFixture, resetFixture } from '../../scripts/safeops-fixture.mjs';

const resource = 'https://safeops.example/mcp';

test('stateful Streamable HTTP carries bounded MCP elicitation through SAFE-only effect', async () => {
  const root = await mkdtemp(path.join(os.homedir(), 'safeops-c0-fixture-http-'));
  await rm(root, { recursive: true, force: true });
  await createFixture(root);
  const policyConfig = structuredClone(DEFAULT_POLICY);
  policyConfig.allow = [...policyConfig.allow, { id: 'allow-http-safe', type: 'path_prefix', value: path.join(root, 'safe'), reason: 'HTTP fixture SAFE path' }];
  policyConfig.deny = [...policyConfig.deny, { id: 'deny-http-denied', type: 'path_prefix', value: path.join(root, 'denied'), reason: 'HTTP fixture DENIED path' }];
  const policyPath = path.join(root, 'fixture-policy.json');
  await writeFile(policyPath, JSON.stringify(policyConfig, null, 2));
  const policy = new SafetyPolicyManager(policyPath);
  const targetRegistry = new TargetRegistry({ demo: { root, actor_ids: ['alice'], engine_targets: { safe: 'safe', review: 'review', denied: 'denied' } } });
  const store = new WorkflowStore(path.join(root, 'state'));
  const coordinator = new WorkflowCoordinator({ store });
  const bridgeFactory = targetContext => new FiveSBridge({ targetContext, plansDir: path.join(root, 'plans'), backupDir: path.join(root, 'backup'), policy });
  const dependencies = { targetRegistry, coordinator, store, bridgeFactory, approvalProviderFactory: server => createMcpElicitationApprovalProvider({ server }) };
  const tokenValidator = new TokenValidator({
    verifyToken: async () => ({ iss: 'https://issuer.example', exp: Math.floor(Date.now() / 1000) + 60, aud: resource, client_id: 'alexa-user', scope: 'mcp:tools safeops:read safeops:apply', sub: 'alice' }),
    issuer: 'https://issuer.example', resource, requiredScopes: []
  });
  const metadata = buildProtectedResourceMetadata({ resource, authorizationServers: ['https://issuer.example'], scopesSupported: ['mcp:tools', 'safeops:read', 'safeops:apply'] });
  const server = createSafeOpsHttpServer({ dependencies, tokenValidator, resourceMetadata: metadata, requiredUserScope: 'mcp:tools' });
  const address = await listenSafeOpsHttp(server, { port: 0 });
  const client = new Client({ name: 'safeops-elicitation-test', version: '1.0.0' }, { capabilities: { elicitation: { form: {} } } });
  let elicitationCount = 0;
  client.setRequestHandler(ElicitRequestSchema, async request => {
    elicitationCount += 1;
    assert.match(request.params.message, /Apply only the safe actions|apply only the currently SAFE actions/i);
    assert.deepEqual(request.params.requestedSchema.required, ['confirm']);
    return { action: 'accept', content: { confirm: true } };
  });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
    requestInit: { headers: { authorization: 'Bearer user-token' } }
  });
  try {
    await client.connect(transport);
    assert.ok(transport.sessionId);
    const inspected = await client.callTool({ name: 'safeops_inspect_workspace', arguments: { target_id: 'demo', targets: ['safe', 'review', 'denied'], preserve_days: 0 } });
    const inspection = inspected.structuredContent;
    assert.equal(inspection.safe_operation_ids.length, 1);
    assert.equal(inspection.review_operation_ids.length, 1);
    assert.equal(inspection.denied_operation_ids.length, 1);
    const applied = await client.callTool({ name: 'safeops_apply_safe_actions', arguments: { workflow_id: inspection.workflow_id, plan_id: inspection.plan_id, operation_ids: inspection.safe_operation_ids } });
    assert.equal(applied.structuredContent.verification_state, 'VERIFIED_SUCCESS');
    assert.equal(elicitationCount, 1);
    await assert.rejects(() => access(path.join(root, 'safe', 'safe.tmp')));
    await access(path.join(root, 'review', 'review.tmp'));
    await access(path.join(root, 'denied', 'denied.tmp'));
  } finally {
    await client.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    await resetFixture(root).catch(() => {});
  }
});
