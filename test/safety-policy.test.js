import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SafetyPolicyManager } from '../src/safety-policy.js';

test('safety policy blocks denied paths', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-policy-'));
  const manager = new SafetyPolicyManager(path.join(tmp, 'policy.json'));

  const verdict = await manager.evaluateOperation({
    command: 'rm -rf /etc/ssh',
    paths: ['/etc/ssh/sshd_config'],
    destructive: true
  });

  assert.equal(verdict.allowed, false);
  assert.equal(verdict.risk, 'critical');
  assert.ok(verdict.matches.denied.some(rule => rule.id === 'deny-ssh-config'));

  await rm(tmp, { recursive: true, force: true });
});

test('safety policy can add and remove allow rules', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-policy-'));
  const manager = new SafetyPolicyManager(path.join(tmp, 'policy.json'));

  await manager.addRule('allow', {
    id: 'allow-test-cache',
    type: 'path_prefix',
    value: '/opt/test-cache',
    reason: 'test cache'
  });

  let listed = await manager.listRules('allow');
  assert.ok(listed.allow.some(rule => rule.id === 'allow-test-cache'));

  await manager.removeRule('allow', 'allow-test-cache');
  listed = await manager.listRules('allow');
  assert.equal(listed.allow.some(rule => rule.id === 'allow-test-cache'), false);

  await rm(tmp, { recursive: true, force: true });
});
