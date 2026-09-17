import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import os from 'os';
import { TargetRegistry } from '../../src/safeops/targets/target-registry.js';

function registry() {
  return new TargetRegistry({
    demo: {
      root: path.join(os.tmpdir(), 'safeops-demo'),
      actor_ids: ['alice'],
      engine_targets: { temp: 'temp', logs: { path: 'logs', patterns: ['*.log'] } }
    }
  });
}

test('target registry binds an authenticated actor to one registered target', () => {
  const target = registry().resolve({ actor_id: 'alice' }, 'demo');
  assert.equal(target.target_id, 'demo');
  assert.equal(target.actor_id, 'alice');
  assert.equal(target.actor_target_binding, 'REGISTERED');
  assert.equal(target.target_profile.targets.temp, 'temp');
});

test('target registry rejects wrong actors and unknown targets', () => {
  assert.throws(() => registry().resolve({ actor_id: 'mallory' }, 'demo'), /not bound/);
  assert.throws(() => registry().resolve({ actor_id: 'alice' }, 'missing'), /not registered/);
});

test('target registry rejects disabled targets', () => {
  const disabled = new TargetRegistry({ demo: { root: path.join(os.tmpdir(), 'safeops-disabled'), actor_ids: ['alice'], enabled: false, engine_targets: { temp: 'temp' } } });
  assert.throws(() => disabled.resolve({ actor_id: 'alice' }, 'demo'), /disabled/);
});
