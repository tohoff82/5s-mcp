import crypto from 'node:crypto';
import { constants } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const DEMO_REPLAY_PATH = '/__safeops_demo';
export const DEMO_FIXTURE_ROOT = '/home/safeops-c0-fixture';
export const DEMO_ACTOR = 'safeops-lab-user';
export const DEMO_TARGET = 'demo';
const TTL_MS = 10 * 60 * 1000;
const AGE_MS = 8 * 24 * 60 * 60 * 1000;
const MARKER = '.safeops-c0-fixture.json';
const FILES = Object.freeze([
  { dir: 'safe', file: 'safe.tmp', content: 'safe candidate\n', optional: true },
  { dir: 'review', file: 'review.tmp', content: 'review candidate\n', optional: false },
  { dir: 'denied', file: 'denied.tmp', content: 'denied candidate\n', optional: false }
]);

export class DemoReplayError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Constructed only by C0's fixed, contract-checked startup wrapper.
// Never an MCP tool. No general filesystem reset / authority elevation.
export class DemoReplayController {
  constructor({ root = DEMO_FIXTURE_ROOT, actor = DEMO_ACTOR, target = DEMO_TARGET, now = () => Date.now(), ttlMs = TTL_MS } = {}) {
    if (root !== DEMO_FIXTURE_ROOT || actor !== DEMO_ACTOR || target !== DEMO_TARGET)
      throw new Error('Demo replay requires the exact C0 fixture/actor/target');
    if (!Number.isInteger(ttlMs) || ttlMs < 30000 || ttlMs > TTL_MS)
      throw new Error('Invalid demo lease TTL');
    this.root = root; this.actor = actor; this.target = target;
    this.now = now; this.ttlMs = ttlMs;
    this.active = null; this.preparing = false;
  }

  requireIdentity(authInfo, targetRegistry) {
    const actor = authInfo?.extra?.subject;
    if (actor !== this.actor || !authInfo?.scopes?.includes('mcp:tools') || !authInfo?.scopes?.includes('safeops:apply'))
      throw new DemoReplayError('demo_not_authorized', 'Authenticated user with demo apply scope required', 403);
    const bound = targetRegistry.resolve({ actor_id: actor }, this.target);
    if (bound.target_id !== this.target || bound.scope?.workspace_root !== this.root)
      throw new DemoReplayError('demo_target_mismatch', 'Target binding is not the fixed demo fixture', 403);
    return actor;
  }

  async prepare({ authInfo, targetRegistry, sessionId }) {
    const actor = this.requireIdentity(authInfo, targetRegistry);
    if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(sessionId))
      throw new DemoReplayError('invalid_demo_session', 'Server-held demo session ID required', 400);
    if (this.preparing || this.active?.inFlight)
      throw new DemoReplayError('demo_busy', 'Another demo operation is still in progress');
    if (this.active && !this.isExpired(this.active) && this.active.sessionId !== sessionId)
      throw new DemoReplayError('demo_in_use', 'Another walkthrough is in progress. Retry shortly.');
    this.preparing = true;
    try {
      await this.restoreFixture();
      const lease = { token: crypto.randomBytes(32).toString('base64url'), actor, sessionId, lastUsedAt: this.now(), inFlight: 0 };
      this.active = lease;
      return { lease_token: lease.token, fixture_ready: true, lease_expires_in_seconds: Math.floor(this.ttlMs / 1000) };
    } finally { this.preparing = false; }
  }

  async withToolCall(runtimeContext, action) {
    const lease = this.active;
    const token = runtimeContext?.authInfo?.extra?.demoLeaseToken;
    const actor = runtimeContext?.actorContext?.actor_id;
    if (!lease || typeof token !== 'string' || actor !== lease.actor || !safeEqual(token, lease.token) || this.isExpired(lease))
      throw new DemoReplayError('demo_lease_required', 'Select Start guided demo before using SafeOps tools');
    if (this.preparing) throw new DemoReplayError('demo_busy', 'Preparing the demo workspace');
    lease.inFlight++;
    lease.lastUsedAt = this.now();
    try { return await action(); }
    finally { lease.inFlight--; lease.lastUsedAt = this.now(); }
  }

  release({ authInfo, targetRegistry, token, sessionId }) {
    const actor = this.requireIdentity(authInfo, targetRegistry);
    const lease = this.active;
    if (!lease || lease.actor !== actor || lease.sessionId !== sessionId || !token || !safeEqual(token, lease.token))
      throw new DemoReplayError('demo_lease_mismatch', 'Demo lease does not belong to this session', 403);
    if (lease.inFlight || this.preparing) throw new DemoReplayError('demo_busy', 'An operation is still running');
    this.active = null;
    return { released: true };
  }

  isExpired(lease) { return this.now() - lease.lastUsedAt >= this.ttlMs; }

  async restoreFixture() { return restoreDemoFixture(this.root, this.now); }
}

// Testable fixture preparation; HTTP never accepts arbitrary root paths.
export async function restoreDemoFixture(root, now = () => Date.now()) {
  if (root !== DEMO_FIXTURE_ROOT && !path.basename(root).startsWith('safeops-c0-fixture-')) {
    throw new DemoReplayError('fixture_root_invalid', 'Unrecognized fixture root');
  }

    // Complete preflight before the first write; reject symlinks and unrelated files.
    await requireDirectory(root);
    await requireEntries(root, [MARKER, 'safe', 'review', 'denied']);
    const marker = JSON.parse(await readRegular(path.join(root, MARKER)));
    if (marker.schema !== 'safeops-c0-fixture.v1' || marker.root !== root)
      throw new DemoReplayError('fixture_marker_invalid', 'Fixture marker or root mismatch');

    const missing = [];
    for (const item of FILES) {
      const directory = path.join(root, item.dir);
      await requireDirectory(directory);
      await requireEntries(directory, [item.file], item.optional);
      const filename = path.join(directory, item.file);
      try {
        if (await readRegular(filename) !== item.content)
          throw new DemoReplayError('fixture_content_invalid', 'Fixture content unexpectedly modified');
      } catch (error) {
        if (error.code === 'ENOENT' && item.optional) missing.push({ filename, content: item.content });
        else throw error;
      }
    }

    // Recreate ONLY the missing allowlisted SAFE file; never delete any path.
    for (const item of missing) {
      const fh = await fs.open(item.filename, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      try { await fh.writeFile(item.content); } finally { await fh.close(); }
    }
    const aged = new Date(now() - AGE_MS);
    for (const item of FILES) {
      const fh = await fs.open(path.join(root, item.dir, item.file), constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        if (!(await fh.stat()).isFile()) throw new DemoReplayError('fixture_file_invalid', 'Fixture file is not regular');
        await fh.utimes(aged, aged);
      } finally { await fh.close(); }
    }
}

async function requireDirectory(directory) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new DemoReplayError('fixture_directory_invalid', 'Fixture directory is not a real directory');
}
async function requireEntries(directory, allowed, mayBeAbsent = false) {
  const entries = await fs.readdir(directory);
  if (entries.some(e => !allowed.includes(e)) || (!mayBeAbsent && allowed.some(e => !entries.includes(e))))
    throw new DemoReplayError('fixture_contents_invalid', 'Unexpected or missing fixture entry');
}
async function readRegular(filename) {
  const fh = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await fh.stat();
    if (!stat.isFile() || stat.size > 4096) throw new DemoReplayError('fixture_file_invalid', 'Fixture entry must be a small regular file');
    return await fh.readFile('utf8');
  } finally { await fh.close(); }
}
function safeEqual(a, b) {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());
}
