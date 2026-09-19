import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../server.mjs';
import { DemoSessionStore } from '../lib/demo-session.mjs';
import { DemoMcpClient, EXPECTED_SAFEOPS_TOOLS } from '../lib/mcp-client.mjs';

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

function fakeOAuth() {
  return {
    begin() { return 'https://auth.example/authorize?state=test'; },
    async exchange(session) {
      session.tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer'
      };
      session.oauth_attempt = null;
    },
    async authorizedFetch() {
      return new Response('{}', { status: 200 });
    }
  };
}

function fakeMcpFactory(tracker = {}) {
  return session => {
    const instance = {
      async connect() {
        tracker.connects = (tracker.connects || 0) + 1;
      },
      async inspect() {
        tracker.inspects = (tracker.inspects || 0) + 1;
        return { workflow_id: 'wf-1', plan_id: 'plan-1', target_id: 'demo', safe_operation_ids: [] };
      },
      issueApproval() {
        return { nonce: 'approval-1', expiresAt: Date.now() + 1000, workflowId: 'wf-1', planId: 'plan-1' };
      },
      async apply() {
        tracker.applies = (tracker.applies || 0) + 1;
        return { verification_state: 'VERIFIED_SUCCESS' };
      },
      async explain() {
        return { summary: 'evidence' };
      },
      async close() {
        tracker.closes = (tracker.closes || 0) + 1;
      }
    };
    tracker.instances ||= [];
    tracker.instances.push({ instance, session });
    return instance;
  };
}

async function withServer({ sessionStore = new DemoSessionStore(), oauthClient = fakeOAuth(), mcpFactory = fakeMcpFactory() } = {}, fn) {
  const server = createDemoServer({ config, sessionStore, oauthClient, mcpFactory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn({ base: `http://127.0.0.1:${port}`, sessionStore });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function createCookie(base) {
  const response = await fetch(`${base}/api/session`);
  return response.headers.get('set-cookie').split(';')[0];
}

function sidFromCookie(cookie) {
  return decodeURIComponent(cookie.split('=')[1]);
}

async function connect(base, cookie) {
  return fetch(`${base}/oauth/callback?code=x&state=y`, {
    headers: { cookie },
    redirect: 'manual'
  });
}

test('logout destroys the demo session and repeated connect/logout cycles work in the same browser', async () => {
  const tracker = {};
  const store = new DemoSessionStore();

  await withServer({ sessionStore: store, mcpFactory: fakeMcpFactory(tracker) }, async ({ base }) => {
    let cookie = await createCookie(base);
    let sid = sidFromCookie(cookie);

    assert.equal((await connect(base, cookie)).status, 302);
    let view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.authenticated, true);
    assert.equal(view.mcp_connected, true);

    const logout = await fetch(`${base}/api/logout`, { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal(store.get(sid), null);

    cookie = await createCookie(base);
    sid = sidFromCookie(cookie);
    view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.authenticated, false);
    assert.equal(view.mcp_connected, false);

    assert.equal((await connect(base, cookie)).status, 302);
    view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.authenticated, true);
    assert.equal(view.mcp_connected, true);

    assert.equal((await fetch(`${base}/api/logout`, { method: 'POST', headers: { cookie } })).status, 200);
    assert.equal(store.get(sid), null);
    assert.equal(tracker.connects, 2);
    assert.equal(tracker.closes, 2);
  });
});

test('reconnect preserves OAuth tokens, replaces the MCP client, clears current workflow, and executes no tool', async () => {
  const tracker = {};
  const store = new DemoSessionStore();

  await withServer({ sessionStore: store, mcpFactory: fakeMcpFactory(tracker) }, async ({ base }) => {
    const cookie = await createCookie(base);
    const sid = sidFromCookie(cookie);
    await connect(base, cookie);

    const session = store.get(sid);
    const tokenBefore = session.tokens;
    session.current = { workflow_id: 'wf-old', plan_id: 'plan-old', target_id: 'demo' };

    const response = await fetch(`${base}/api/reconnect`, { method: 'POST', headers: { cookie } });
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(session.tokens, tokenBefore);
    assert.equal(session.tokens.access_token, 'access-token');
    assert.equal(session.current, null);
    assert.equal(payload.authenticated, true);
    assert.equal(payload.mcp_connected, true);
    assert.equal(payload.mcp_stale, false);
    assert.equal(tracker.connects, 2);
    assert.equal(tracker.closes, 1);
    assert.equal(tracker.inspects || 0, 0);
    assert.equal(tracker.applies || 0, 0);
  });
});

test('reconnect fails closed when the fresh MCP client exposes anything beyond the exact three-tool surface', async () => {
  let connects = 0;
  const store = new DemoSessionStore();
  const oauthClient = fakeOAuth();

  const mcpFactory = session => {
    connects += 1;
    const thisConnect = connects;
    const fakeClient = {
      setRequestHandler() {},
      async connect() {},
      async listTools() {
        const tools = EXPECTED_SAFEOPS_TOOLS.map(name => ({ name }));
        if (thisConnect === 2) tools.push({ name: 'unexpected_tool' });
        return { tools };
      },
      async close() {}
    };
    return new DemoMcpClient({
      resourceUri: config.resourceUri,
      oauthClient,
      session,
      clientFactory: () => fakeClient,
      transportFactory: () => ({})
    });
  };

  await withServer({ sessionStore: store, oauthClient, mcpFactory }, async ({ base }) => {
    const cookie = await createCookie(base);
    await connect(base, cookie);

    const response = await fetch(`${base}/api/reconnect`, { method: 'POST', headers: { cookie } });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.message, /Unexpected SafeOps tool surface/);

    const view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.authenticated, true);
    assert.equal(view.mcp_connected, false);
  });
});

test('stale inspect marks transport stale and never retries the tool call', async () => {
  let inspectCalls = 0;
  const store = new DemoSessionStore();
  const mcpFactory = session => ({
    async connect() {},
    async inspect() {
      inspectCalls += 1;
      throw new Error('Streamable HTTP error: Error POSTing to endpoint: {"error":"invalid_session"}');
    },
    async close() {},
    issueApproval() { throw new Error('unexpected approval'); },
    async apply() { throw new Error('unexpected apply'); },
    async explain() { throw new Error('unexpected explain'); }
  });

  await withServer({ sessionStore: store, mcpFactory }, async ({ base }) => {
    const cookie = await createCookie(base);
    await connect(base, cookie);

    const response = await fetch(`${base}/api/inspect`, { method: 'POST', headers: { cookie } });
    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.equal(payload.error, 'mcp_session_stale');
    assert.equal(payload.message, 'Backend session expired. Reconnect to continue.');
    assert.equal(inspectCalls, 1);

    const view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.authenticated, true);
    assert.equal(view.mcp_connected, false);
    assert.equal(view.mcp_stale, true);
    assert.equal(view.current, null);
  });
});

test('stale apply never retries the effectful tool call', async () => {
  let applyCalls = 0;
  const store = new DemoSessionStore();
  const mcpFactory = session => ({
    async connect() {},
    async inspect() { throw new Error('unexpected inspect'); },
    issueApproval() {
      return { nonce: 'approval-1', expiresAt: Date.now() + 1000, workflowId: 'wf-1', planId: 'plan-1' };
    },
    async apply() {
      applyCalls += 1;
      throw new Error('Streamable HTTP error: Error POSTing to endpoint: {"error":"invalid_session"}');
    },
    async close() {},
    async explain() { throw new Error('unexpected explain'); }
  });

  await withServer({ sessionStore: store, mcpFactory }, async ({ base }) => {
    const cookie = await createCookie(base);
    const sid = sidFromCookie(cookie);
    await connect(base, cookie);
    store.get(sid).current = { workflow_id: 'wf-1', plan_id: 'plan-1', target_id: 'demo' };

    const approval = await (await fetch(`${base}/api/approval`, { method: 'POST', headers: { cookie } })).json();
    const response = await fetch(`${base}/api/apply`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ approval_nonce: approval.approval_nonce })
    });

    assert.equal(response.status, 409);
    assert.equal(applyCalls, 1);

    const view = await (await fetch(`${base}/api/session`, { headers: { cookie } })).json();
    assert.equal(view.mcp_stale, true);
    assert.equal(view.current, null);
  });
});
