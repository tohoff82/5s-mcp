import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSafeOpsRuntime } from '../../src/safeops/bootstrap.js';

function baseEnv(stateDir) {
  return {
    SAFEOPS_RESOURCE_URI: 'https://safeops.example/mcp',
    SAFEOPS_AUTHORIZATION_SERVER: 'https://issuer.example',
    SAFEOPS_ISSUER: 'https://issuer.example',
    SAFEOPS_JWKS_URI: 'https://issuer.example/jwks',
    SAFEOPS_STATE_DIR: stateDir,
    SAFEOPS_TARGETS_JSON: JSON.stringify({ targets: { demo: { root: path.join(stateDir, 'workspace'), actor_ids: ['alice'], engine_targets: { safe: 'safe' } } } })
  };
}

test('bootstrap builds a fail-closed SafeOps runtime from explicit lab configuration', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'safeops-bootstrap-'));
  const runtime = await buildSafeOpsRuntime({ env: baseEnv(stateDir), fetchImpl: async () => { throw new Error('JWKS fetch should be lazy'); } });
  assert.equal(runtime.config.resource, 'https://safeops.example/mcp');
  assert.equal(runtime.config.requiredUserScope, 'mcp:tools');
  assert.equal(runtime.config.stateDir, stateDir);
  assert.ok(runtime.httpServer);
});

test('bootstrap refuses missing security-critical configuration', async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), 'safeops-bootstrap-'));
  const env = baseEnv(stateDir);
  delete env.SAFEOPS_JWKS_URI;
  await assert.rejects(() => buildSafeOpsRuntime({ env }), /SAFEOPS_JWKS_URI is required/);
});
