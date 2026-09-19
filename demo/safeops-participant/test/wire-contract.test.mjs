import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from '../../../src/safeops/http.js';
import { DemoMcpClient, EXPECTED_SAFEOPS_TOOLS } from '../lib/mcp-client.mjs';

test('real Streamable HTTP client performs initialize and tools/list against the exact SafeOps projection', async t => {
  const dependencies = {
    targetRegistry: {},
    coordinator: {},
    store: {},
    bridgeFactory: () => ({}),
    approvalProviderFactory: () => ({ async requestApproval() { return { approved: false }; } })
  };
  const tokenValidator = {
    async verifyAuthorizationHeader(header) {
      assert.equal(header, 'Bearer loopback-token');
      return {
        clientId: 'participant-demo',
        scopes: ['mcp:tools'],
        extra: { subject: 'demo-user' }
      };
    }
  };
  const resourceMetadata = {
    resource: 'https://placeholder.invalid/mcp',
    authorization_servers: ['https://auth.example'],
    scopes_supported: ['mcp:tools'],
    bearer_methods_supported: ['header']
  };
  const server = createSafeOpsHttpServer({
    dependencies,
    tokenValidator,
    resourceMetadata,
    requiredUserScope: 'mcp:tools'
  });
  const address = await listenSafeOpsHttp(server, { host: '127.0.0.1', port: 0 });
  const resourceUri = `http://127.0.0.1:${address.port}/mcp`;

  const session = { id: 'wire-session', current: null };
  const oauthClient = {
    async authorizedFetch(_session, input, init = {}) {
      const headers = new Headers(init.headers || {});
      headers.set('authorization', 'Bearer loopback-token');
      return fetch(input, { ...init, headers });
    }
  };
  const client = new DemoMcpClient({ resourceUri, oauthClient, session });
  t.after(async () => {
    await client.close();
    await new Promise(resolve => server.close(resolve));
  });

  const connected = await client.connect();
  assert.deepEqual(connected.tools, [...EXPECTED_SAFEOPS_TOOLS]);
});
