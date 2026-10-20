import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../server.mjs';
import { DemoSessionStore } from '../lib/demo-session.mjs';

const config = {
  host: '127.0.0.1', port: 0,
  resourceUri: 'https://safeops.invalid/mcp',
  authorizationEndpoint: 'https://auth.invalid/authorize',
  tokenEndpoint: 'https://auth.invalid/token',
  clientId: 'demo-test-client', clientSecret: 'mock-only',
  redirectUri: 'http://127.0.0.1/oauth/callback',
  targetId: 'demo', cookieSecure: false
};

function fakeOAuth() {
  return {
    begin() { return 'https://auth.invalid/authorize'; },
    async exchange(session) { session.tokens = { access_token: 'mock-test-token' }; }
  };
}
async function setup(t, mcpFactory) {
  const store = new DemoSessionStore();
  const server = createDemoServer({
    config, sessionStore: store, oauthClient: fakeOAuth(), mcpFactory
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const initial = await fetch(base + '/api/session');
  const cookie = initial.headers.get('set-cookie').split(';')[0];
  const sessionId = decodeURIComponent(cookie.split('=')[1]);
  const oauth = await fetch(base + '/oauth/callback?code=mock&state=mock', {
    redirect: 'manual', headers: { cookie }
  });
  assert.equal(oauth.status, 302);
  return { base, cookie, store, sessionId };
}
const post = (base, endpoint, cookie) => fetch(base + endpoint, {
  method: 'POST', headers: { cookie }
});
const deferred = () => {
  let resolve;
  const promise = new Promise(res => { resolve = res; });
  return { promise, resolve };
};

test('logout waits for pending Prepare before releasing latest rotated lease', async t => {
  const begun = deferred();
  const continuePrepare = deferred();
  let releasedToken = null;
  let releaseCalls = 0;
  let closed = 0;
  const ctx = await setup(t, session => ({
    async connect() {},
    async close() { closed++; },
    async prepare() {
      begun.resolve();
      await continuePrepare.promise;
      session.replayLease = 'lease-new';
      return { fixture_ready: true };
    },
    async release() {
      releaseCalls++;
      releasedToken = session.replayLease;
      if (releasedToken !== 'lease-new') {
        throw Object.assign(new Error('stale lease token'), { code: 'demo_lease_mismatch', status: 403 });
      }
      session.replayLease = null;
      return { released: true };
    }
  }));
  ctx.store.get(ctx.sessionId).replayLease = 'lease-old';
  const preparing = post(ctx.base, '/api/prepare', ctx.cookie);
  await begun.promise;

  const loggingOut = post(ctx.base, '/api/logout', ctx.cookie);
  // Logout must not complete while preparation is pending.
  const premature = await Promise.race([
    loggingOut.then(() => 'finished'),
    new Promise(resolve => setTimeout(() => resolve('pending'), 60))
  ]);
  assert.equal(premature, 'pending');
  assert.equal(releaseCalls, 0);

  continuePrepare.resolve();
  assert.equal((await preparing).status, 200);
  const logout = await loggingOut;
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).logged_out, true);
  assert.equal(releasedToken, 'lease-new');
  assert.equal(releaseCalls, 1);
  assert.equal(closed, 1);
  assert.equal(ctx.store.get(ctx.sessionId), null);
});

test('failed backend release cannot masquerade as successful logout or discard session', async t => {
  let fail = true, releaseCalls = 0, closeCalls = 0;
  const ctx = await setup(t, session => ({
    async connect() {},
    async close() { closeCalls++; },
    async release() {
      releaseCalls++;
      if (fail) throw Object.assign(new Error('not the active lease'), {
        code: 'demo_lease_mismatch', status: 403
      });
      session.replayLease = null;
      return { released: true };
    }
  }));
  const session = ctx.store.get(ctx.sessionId);
  session.replayLease = 'old-lease';

  const rejected = await post(ctx.base, '/api/logout', ctx.cookie);
  assert.equal(rejected.status, 409);
  assert.equal((await rejected.json()).error, 'demo_release_incomplete');
  assert.equal(rejected.headers.get('set-cookie'), null);
  assert.equal(ctx.store.get(ctx.sessionId), session);
  assert.equal(session.replayLease, 'old-lease');
  assert.equal(closeCalls, 0);
  assert.equal(releaseCalls, 1);

  fail = false;
  const succeeded = await post(ctx.base, '/api/logout', ctx.cookie);
  assert.equal(succeeded.status, 200);
  assert.equal((await succeeded.json()).logged_out, true);
  assert.match(succeeded.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(ctx.store.get(ctx.sessionId), null);
  assert.equal(releaseCalls, 2);
  assert.equal(closeCalls, 1);
});

test('duplicate Prepare cannot generate competing leases within the same browser session', async t => {
  const begun = deferred(), continuePrepare = deferred();
  let calls = 0;
  const ctx = await setup(t, session => ({
    async connect() {},
    async close() {},
    async prepare() {
      calls++;
      begun.resolve();
      await continuePrepare.promise;
      session.replayLease = 'lease';
      return { fixture_ready: true };
    },
    async release() { session.replayLease = null; return { released: true }; }
  }));
  const first = post(ctx.base, '/api/prepare', ctx.cookie);
  await begun.promise;
  const concurrent = await post(ctx.base, '/api/prepare', ctx.cookie);
  assert.equal(concurrent.status, 409);
  assert.equal((await concurrent.json()).error, 'demo_prepare_in_progress');
  assert.equal(calls, 1);
  continuePrepare.resolve();
  assert.equal((await first).status, 200);
  assert.equal((await post(ctx.base, '/api/logout', ctx.cookie)).status, 200);
});
