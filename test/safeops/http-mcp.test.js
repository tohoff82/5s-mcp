import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from '../../src/safeops/http.js';
import { TokenValidator } from '../../src/safeops/auth/token-validator.js';
import { buildProtectedResourceMetadata } from '../../src/safeops/auth/protected-resource-metadata.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const resource = 'https://safeops.example/mcp';

function dependencies() {
  return {
    targetRegistry: { resolve() { return { target_id: 'demo', actor_id: 'alice', target_profile: { root: '/tmp/safeops', targets: { temp: 'temp' } } }; } },
    coordinator: {}, store: {}, bridgeFactory() { return {}; }, approvalProvider: { async requestApproval() { return { approved: false }; } }
  };
}

function tokenValidator() {
  return new TokenValidator({ verifyToken: async token => ({ iss: 'https://issuer.example', exp: Math.floor(Date.now() / 1000) + 60, aud: resource, client_id: 'alexa-service', scope: 'safeops.connect safeops.user', ...(token === 'user-token' ? { sub: 'alice' } : {}) }), issuer: 'https://issuer.example', resource, requiredScopes: ['safeops.connect'] });
}

test('HTTP server exposes public PRM and fails protected MCP requests closed without bearer auth', async () => {
  const metadata = buildProtectedResourceMetadata({ resource, authorizationServers: ['https://issuer.example'], scopesSupported: ['safeops.connect', 'safeops.user'] });
  const server = createSafeOpsHttpServer({ dependencies: dependencies(), tokenValidator: tokenValidator(), resourceMetadata: metadata, requiredUserScope: 'safeops.user' });
  const address = await listenSafeOpsHttp(server, { port: 0 });
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const prm = await fetch(`${base}/.well-known/oauth-protected-resource`);
    assert.equal(prm.status, 200);
    assert.equal((await prm.json()).resource, resource);
    const denied = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('www-authenticate'), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Streamable HTTP carrier preserves an authenticated stateful MCP session', async () => {
  const metadata = buildProtectedResourceMetadata({ resource, authorizationServers: ['https://issuer.example'], scopesSupported: ['safeops.connect', 'safeops.user'] });
  const server = createSafeOpsHttpServer({ dependencies: dependencies(), tokenValidator: tokenValidator(), resourceMetadata: metadata, requiredUserScope: 'safeops.user' });
  const address = await listenSafeOpsHttp(server, { port: 0 });
  const client = new Client({ name: 'safeops-test', version: '1.0.0' }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
    requestInit: { headers: { authorization: 'Bearer service-token' } }
  });
  try {
    await client.connect(transport);
    assert.ok(transport.sessionId);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name), ['safeops_inspect_workspace', 'safeops_apply_safe_actions', 'safeops_explain_workflow']);
  } finally {
    await client.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
});
