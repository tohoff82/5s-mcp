import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SafetyPolicyManager } from '../src/safety-policy.js';
import { createRemoteCleanTool, inferTouchedPaths, isRemoteCleanupCandidate } from '../src/mcp-server/tools/remote-clean.js';

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
  assert.equal(isRemoteCleanupCandidate('/tmp'), false);
  assert.equal(isRemoteCleanupCandidate('/var/tmp'), false);
  assert.equal(isRemoteCleanupCandidate('/home'), false);
  assert.equal(isRemoteCleanupCandidate('/home/deploy'), false);
  assert.equal(isRemoteCleanupCandidate('/tmp/agent-run-123'), true);
  assert.equal(isRemoteCleanupCandidate('/var/tmp/build-abc'), true);
  assert.equal(isRemoteCleanupCandidate('/home/deploy/worktree'), true);
  assert.equal(isRemoteCleanupCandidate('/etc/nginx/sites-enabled/app'), false);
  assert.equal(isRemoteCleanupCandidate('/var/lib/mongodb'), false);
  assert.equal(isRemoteCleanupCandidate('/root/.ssh/id_rsa'), false);
});

test('remote clean builds manifest operations with executable remote command', async () => {
  const policyPath = path.join(await mkdtemp(path.join(os.tmpdir(), '5s-policy-')), 'policy.json');
  const executor = {
    commands: [],
    async run(_ssh, command) {
      this.commands.push(command);
      if (command.startsWith('if [ -e')) {
        return { stdout: '/tmp/agent-run-123|directory|0|1710000000\n', stderr: '' };
      }
      if (command.includes('find "$target"')) {
        return {
          stdout: '/tmp/agent-run-123/a.tmp|12|1710000001|root|root|101\n/tmp/agent-run-123/b.log|34|1710000002|root|root|102\n',
          stderr: ''
        };
      }
      return { stdout: '', stderr: '' };
    }
  };
  const tool = createRemoteCleanTool({ policy: new SafetyPolicyManager(policyPath), executor });

  const plan = await tool.execute({
    action: 'plan',
    host: 'example.test',
    paths_visited: ['/tmp/agent-run-123'],
    max_items: 10
  });

  assert.equal(plan.summary.actionable, 1);
  assert.equal(plan.operations[0].manifest.length, 2);
  assert.equal(plan.operations[0].remote_command, "rm -f -- '/tmp/agent-run-123/a.tmp' '/tmp/agent-run-123/b.log'");

  await rm(path.dirname(policyPath), { recursive: true, force: true });
});

test('remote clean approved cleanup applies manifest command', async () => {
  const policyPath = path.join(await mkdtemp(path.join(os.tmpdir(), '5s-policy-')), 'policy.json');
  const executor = {
    removed: false,
    async run(_ssh, command) {
      if (command.startsWith('if [ -e')) {
        return { stdout: '/tmp/agent-run-123|directory|0|1710000000\n', stderr: '' };
      }
      if (command.includes('find "$target"')) {
        return { stdout: '/tmp/agent-run-123/a.tmp|12|1710000001|root|root|101\n', stderr: '' };
      }
      if (command.startsWith('rm -f --')) {
        this.removed = true;
        return { stdout: 'removed\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    }
  };
  const tool = createRemoteCleanTool({ policy: new SafetyPolicyManager(policyPath), executor });

  const result = await tool.execute({
    action: 'cleanup',
    host: 'example.test',
    paths_visited: ['/tmp/agent-run-123'],
    dry_run: false,
    approved: true
  });

  assert.equal(executor.removed, true);
  assert.equal(result.results[0].executed, true);

  await rm(path.dirname(policyPath), { recursive: true, force: true });
});
