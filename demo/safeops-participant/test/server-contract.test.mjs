import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../server.mjs';

const config = {
  host: '127.0.0.1',
  port: 0,
  resourceUri: 'https://safeops.example/mcp',
  authorizationEndpoint: 'https://auth.example/authorize',
  tokenEndpoint: 'https://auth.example/token',
  clientId: 'demo-client',
  clientSecret: 'demo-secret',
  redirectUri: 'http://127.0.0.1/oauth/callback',
  targetId: 'demo',
  cookieSecure: false
};

test('HTTP surface binds the target server-side and exposes no generic tool-call route', async t => {
  let inspectedTarget = null;
  const oauthClient = {
    begin() { return 'https://auth.example/authorize?state=test'; },
    async exchange(session) { session.tokens = { access_token: 'token' }; }
  };
  const mcpFactory = session => ({
    async connect() {},
    async inspect({ targetId }) {
      inspectedTarget = targetId;
      session.current = { workflow_id: 'wf-1', plan_id: 'plan-1', target_id: targetId };
      return { workflow_id: 'wf-1', plan_id: 'plan-1', target_id: targetId, safe_operation_ids: [] };
    },
    issueApproval() { return { nonce: 'n', expiresAt: 1, workflowId: 'wf-1', planId: 'plan-1' }; },
    async apply() { return { verification_state: 'VERIFIED_SUCCESS' }; },
    async explain() { return { summary: 'evidence' }; },
    async close() {}
  });

  const server = createDemoServer({ config, oauthClient, mcpFactory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const initial = await fetch(`${base}/api/session`);
  const cookie = initial.headers.get('set-cookie').split(';')[0];

  const blocked = await fetch(`${base}/api/inspect`, { method: 'POST', headers: { cookie } });
  assert.equal(blocked.status, 400);

  const callback = await fetch(`${base}/oauth/callback?code=x&state=y`, {
    headers: { cookie },
    redirect: 'manual'
  });
  assert.equal(callback.status, 302);

  const inspected = await fetch(`${base}/api/inspect`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ target_id: 'attacker-controlled' })
  });
  assert.equal(inspected.status, 200);
  assert.equal(inspectedTarget, 'demo');

  const raw = await fetch(`${base}/api/tools/call`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'seiso_clean_system' })
  });
  assert.equal(raw.status, 404);
});
