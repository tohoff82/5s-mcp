import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  DemoReplayController, DemoReplayError, DEMO_ACTOR, DEMO_FIXTURE_ROOT,
  restoreDemoFixture
} from '../../src/safeops/demo/replay-controller.js';
import { createSafeOpsHttpServer, listenSafeOpsHttp } from '../../src/safeops/http.js';

const authInfo = {
  clientId: 'judge-oauth-user',
  scopes: ['mcp:tools', 'safeops:apply', 'safeops:read'],
  extra: { subject: DEMO_ACTOR }
};
const registry = {
  resolve(actor, target) {
    assert.equal(actor.actor_id, DEMO_ACTOR);
    assert.equal(target, 'demo');
    return { target_id: target, scope: { workspace_root: DEMO_FIXTURE_ROOT } };
  }
};
const id = () => crypto.randomUUID();
const cmd = (token) => ({
  actorContext: { actor_id: DEMO_ACTOR },
  authInfo: { ...authInfo, extra: { ...authInfo.extra, demoLeaseToken: token } }
});
function controller(now = () => Date.now()) {
  const replay = new DemoReplayController({ now, ttlMs: 30_000 });
  let restores = 0;
  replay.restoreFixture = async () => { restores++; };
  return { replay, getRestores: () => restores };
}

test('exclusive lease: two judge sessions, replay, release, and stale lease rejection', async () => {
  const { replay, getRestores } = controller();
  const alice = id(), bob = id();
  const first = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: alice });
  assert.equal(first.fixture_ready, true);
  assert.equal(getRestores(), 1);
  await assert.rejects(replay.prepare({ authInfo, targetRegistry: registry, sessionId: bob }), { code: 'demo_in_use' });
  await assert.rejects(replay.withToolCall(cmd('bad-lease'), async () => true), { code: 'demo_lease_required' });
  assert.equal(await replay.withToolCall(cmd(first.lease_token), async () => 'verified tool'), 'verified tool');

  const replayed = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: alice });
  assert.equal(getRestores(), 2);
  assert.notEqual(replayed.lease_token, first.lease_token);
  await assert.rejects(replay.withToolCall(cmd(first.lease_token), async () => true), { code: 'demo_lease_required' });
  assert.deepEqual(replay.release({ authInfo, targetRegistry: registry, token: replayed.lease_token, sessionId: alice }), { released: true });

  const second = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: bob });
  assert.equal(second.fixture_ready, true);
  assert.equal(getRestores(), 3);
});

test('cannot reset fixture while an authorized MCP operation is still running', async () => {
  const { replay, getRestores } = controller();
  const sessionId = id();
  const first = await replay.prepare({ authInfo, targetRegistry: registry, sessionId });
  let finish;
  const ongoing = replay.withToolCall(cmd(first.lease_token), () => new Promise(resolve => { finish = resolve; }));
  await assert.rejects(replay.prepare({ authInfo, targetRegistry: registry, sessionId }), { code: 'demo_busy' });
  assert.equal(getRestores(), 1);
  finish('completed');
  assert.equal(await ongoing, 'completed');
  await replay.prepare({ authInfo, targetRegistry: registry, sessionId });
  assert.equal(getRestores(), 2);
});

test('expired lease is reclaimable but an in-flight request remains protected', async () => {
  let now = 1_000_000;
  const { replay } = controller(() => now);
  const a = id(), b = id();
  const old = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: a });
  now += 30_001;
  await assert.rejects(replay.withToolCall(cmd(old.lease_token), async () => true), { code: 'demo_lease_required' });
  const fresh = await replay.prepare({ authInfo, targetRegistry: registry, sessionId: b });
  assert.notEqual(fresh.lease_token, old.lease_token);
});

test('service-only, missing scopes, wrong actor and foreign session cannot prepare/release', async () => {
  const { replay, getRestores } = controller();
  const sessionId = id();
  await assert.rejects(replay.prepare({ authInfo: { ...authInfo, extra: {} }, targetRegistry: registry, sessionId }), { code: 'demo_not_authorized' });
  await assert.rejects(replay.prepare({ authInfo: { ...authInfo, scopes: ['mcp:tools'] }, targetRegistry: registry, sessionId }), { code: 'demo_not_authorized' });
  await assert.rejects(replay.prepare({ authInfo, targetRegistry: registry, sessionId: '../../home' }), { code: 'invalid_demo_session' });
  assert.equal(getRestores(), 0);
  const first = await replay.prepare({ authInfo, targetRegistry: registry, sessionId });
  assert.throws(() => replay.release({ authInfo, targetRegistry: registry, token: first.lease_token, sessionId: id() }), { code: 'demo_lease_mismatch' });
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'safeops-c0-fixture-'));
  await fs.mkdir(path.join(root, 'safe'));
  await fs.mkdir(path.join(root, 'review'));
  await fs.mkdir(path.join(root, 'denied'));
  await fs.writeFile(path.join(root, '.safeops-c0-fixture.json'), JSON.stringify({ schema: 'safeops-c0-fixture.v1', root }));
  for (const part of ['safe', 'review', 'denied']) {
    await fs.writeFile(path.join(root, part, part + '.tmp'), part + ' candidate\n');
  }
  return root;
}

test('replay restores only missing SAFE sample, checks content and aging, keeps other samples unchanged', async t => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.unlink(path.join(root, 'safe/safe.tmp'));
  await restoreDemoFixture(root);
  for (const part of ['safe', 'review', 'denied']) {
    assert.equal(await fs.readFile(path.join(root, part, part + '.tmp'), 'utf8'), part + ' candidate\n');
  }
  const ageDays = (Date.now() - (await fs.stat(path.join(root, 'safe/safe.tmp'))).mtimeMs) / (24 * 60 * 60 * 1000);
  assert.ok(ageDays > 7 && ageDays < 9, 'fixture candidates must be older than seven days');
});

test('unexpected files, changed marker, modified contents and symlinks fail closed without restoring SAFE', async t => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const safeFile = path.join(root, 'safe/safe.tmp');
  await fs.unlink(safeFile);
  await fs.writeFile(path.join(root, 'review/extra.txt'), 'unauthorized');
  await assert.rejects(restoreDemoFixture(root), { code: 'fixture_contents_invalid' });
  await assert.rejects(fs.stat(safeFile), { code: 'ENOENT' });
  await fs.unlink(path.join(root, 'review/extra.txt'));
  const marker = path.join(root, '.safeops-c0-fixture.json');
  await fs.writeFile(marker, JSON.stringify({ schema: 'safeops-c0-fixture.v1', root: '/somewhere/else' }));
  await assert.rejects(restoreDemoFixture(root), { code: 'fixture_marker_invalid' });
  await fs.writeFile(marker, JSON.stringify({ schema: 'safeops-c0-fixture.v1', root }));
  await fs.writeFile(path.join(root, 'denied/denied.tmp'), 'altered');
  await assert.rejects(restoreDemoFixture(root), { code: 'fixture_content_invalid' });
  await fs.writeFile(path.join(root, 'denied/denied.tmp'), 'denied candidate\n');
  await fs.symlink(path.join(root, 'review/review.tmp'), safeFile);
  await assert.rejects(restoreDemoFixture(root));
});

test('preparation endpoint enforces bearer auth, expected scopes and single lease; no reset path without feature', async t => {
  const { replay } = controller();
  const dependencies = {
    targetRegistry: registry,
    coordinator: {}, store: {}, bridgeFactory() { return {}; },
    approvalProvider: { async requestApproval() { return { approved: false }; } },
    demoReplay: replay
  };
  const validator = {
    async verifyAuthorizationHeader(header) {
      if (!header || header === 'Bearer missing') {
        const err = new Error('Missing bearer'); err.statusCode = 401; throw err;
      }
      return header === 'Bearer service'
        ? { ...authInfo, scopes: ['mcp:service'], extra: {} }
        : authInfo;
    }
  };
  const server = createSafeOpsHttpServer({
    dependencies, tokenValidator: validator,
    resourceMetadata: { resource: 'http://localhost/mcp' },
    requiredUserScope: 'mcp:tools', demoReplay: replay
  });
  const address = await listenSafeOpsHttp(server, { port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + address.port + '/__safeops_demo/prepare';
  const post = (sessionId, token = 'judge') => fetch(url, {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId })
  });
  assert.equal((await post(id(), 'missing')).status, 401);
  assert.equal((await post(id(), 'service')).status, 403);
  const a = id(), b = id();
  const first = await post(a);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).fixture_ready, true);
  const conflict = await post(b);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error, 'demo_in_use');
});
