import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createFixture, verifyFixture } from './safeops-fixture.mjs';
import { startSafeOpsLab } from '../src/safeops/bootstrap.js';

const FIXTURE_ROOT = '/home/safeops-c0-fixture';
const CANDIDATES = [
  'safe/safe.tmp',
  'review/review.tmp',
  'denied/denied.tmp'
];
const REQUIRED_ACTORS = ['B2_NO_ACTOR_AUTHORITY', 'safeops-lab-user'];
const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function requireJsonEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${name} must contain valid JSON: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameStringSet(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.every((value, index) => value === right[index]);
}

function assertTargetContract(targetConfig) {
  const demo = targetConfig?.targets?.demo;
  assert(demo, 'demo target is required');
  assert(demo.root === FIXTURE_ROOT, `demo target root must be ${FIXTURE_ROOT}`);
  assert(sameStringSet(demo.actor_ids, REQUIRED_ACTORS), 'demo actor_ids do not match the authorized set');
  assert(demo.enabled === true, 'demo target must remain enabled');
  assert(demo.capability_profile === 'safeops-c0', 'demo capability_profile changed');
  assert(demo.policy_profile === '5s-default', 'demo policy_profile changed');
  assert(demo.engine_targets?.safe === 'safe', 'demo safe engine target changed');
  assert(demo.engine_targets?.review === 'review', 'demo review engine target changed');
  assert(demo.engine_targets?.denied === 'denied', 'demo denied engine target changed');
}

function assertPolicyContract(policy) {
  const allow = Array.isArray(policy?.allow) ? policy.allow : [];
  const deny = Array.isArray(policy?.deny) ? policy.deny : [];

  assert(
    allow.some(rule =>
      rule.id === 'allow-safeops-fixture-safe' &&
      rule.type === 'path_prefix' &&
      rule.value === `${FIXTURE_ROOT}/safe`
    ),
    'fixture SAFE allow rule is missing or changed'
  );

  assert(
    deny.some(rule =>
      rule.id === 'deny-safeops-fixture-denied' &&
      rule.type === 'path_prefix' &&
      rule.value === `${FIXTURE_ROOT}/denied`
    ),
    'fixture DENIED rule is missing or changed'
  );

  const reviewPath = `${FIXTURE_ROOT}/review`;
  assert(
    ![...allow, ...deny].some(rule => rule?.value === reviewPath),
    'review fixture path must not have a fixture-specific allow/deny rule'
  );
}

async function materializeFixture() {
  await createFixture(FIXTURE_ROOT);

  const normalizedMtime = new Date(Date.now() - EIGHT_DAYS_MS);
  for (const relative of CANDIDATES) {
    const file = path.join(FIXTURE_ROOT, relative);
    await fs.utimes(file, normalizedMtime, normalizedMtime);
  }

  const verified = await verifyFixture(FIXTURE_ROOT);
  assert(verified.complete === true, 'fixture verification did not report complete');
  assert(verified.root === FIXTURE_ROOT, 'fixture verification root mismatch');

  const now = Date.now();
  const files = [];
  for (const relative of CANDIDATES) {
    const file = path.join(FIXTURE_ROOT, relative);
    const stat = await fs.stat(file);
    const ageMs = now - stat.mtimeMs;
    assert(stat.isFile(), `fixture candidate is not a regular file: ${relative}`);
    assert(ageMs > SEVEN_DAYS_MS, `fixture candidate is not older than 7 days: ${relative}`);
    files.push({
      relative_path: relative,
      mtime: stat.mtime.toISOString(),
      age_days: ageMs / (24 * 60 * 60 * 1000)
    });
  }

  return { verified, files };
}

async function main() {
  const targetConfig = requireJsonEnv('SAFEOPS_TARGETS_JSON');
  const policy = requireJsonEnv('SAFEOPS_POLICY_JSON');

  assertTargetContract(targetConfig);
  assertPolicyContract(policy);

  const fixture = await materializeFixture();

  console.error('[I2-B-R1 MATERIALIZATION] PASS', JSON.stringify({
    root: FIXTURE_ROOT,
    marker_schema: fixture.verified.marker?.schema ?? null,
    complete: fixture.verified.complete,
    files: fixture.files
  }));

  const runtime = await startSafeOpsLab();
  const address = runtime.address;
  console.error(
    '[SafeOps] listening on ' +
    (typeof address === 'object' ? `${address.address}:${address.port}` : address)
  );
}

main().catch(error => {
  console.error('[I2-B-R1 MATERIALIZATION] FAIL', error);
  process.exit(1);
});
