import test from 'node:test';
import assert from 'node:assert/strict';
import { inferTouchedPaths, isRemoteCleanupCandidate } from '../src/mcp-server/tools/remote-clean.js';

test('remote clean infers touched temp paths from session evidence', () => {
  const inferred = inferTouchedPaths(
    ['/tmp/agent-run-123'],
    ['cd /var/tmp/build-abc && npm install', 'git clone repo /home/deploy/worktree']
  );

  assert.ok(inferred.some(item => item.path === '/tmp/agent-run-123'));
  assert.ok(inferred.some(item => item.path === '/var/tmp/build-abc'));
  assert.ok(inferred.some(item => item.path === '/home/deploy/worktree'));
});

test('remote clean only treats safe roots as cleanup candidates', () => {
  assert.equal(isRemoteCleanupCandidate('/tmp/agent-run-123'), true);
  assert.equal(isRemoteCleanupCandidate('/var/tmp/build-abc'), true);
  assert.equal(isRemoteCleanupCandidate('/home/deploy/worktree'), true);
  assert.equal(isRemoteCleanupCandidate('/etc/nginx/sites-enabled/app'), false);
  assert.equal(isRemoteCleanupCandidate('/var/lib/mongodb'), false);
  assert.equal(isRemoteCleanupCandidate('/root/.ssh/id_rsa'), false);
});
