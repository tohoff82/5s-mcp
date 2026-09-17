import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const FIXTURE_MARKER = '.safeops-c0-fixture.json';

export async function createFixture(root = defaultFixtureRoot()) {
  const resolved = validateFixtureRoot(root);
  await fs.mkdir(resolved, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(resolved, FIXTURE_MARKER), JSON.stringify({ schema: 'safeops-c0-fixture.v1', root: resolved }, null, 2), { mode: 0o600 });
  for (const name of ['safe', 'review', 'denied']) await fs.mkdir(path.join(resolved, name), { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(resolved, 'safe', 'safe.tmp'), 'safe candidate\n', { mode: 0o600 });
  await fs.writeFile(path.join(resolved, 'review', 'review.tmp'), 'review candidate\n', { mode: 0o600 });
  await fs.writeFile(path.join(resolved, 'denied', 'denied.tmp'), 'denied candidate\n', { mode: 0o600 });
  return { root: resolved, marker: path.join(resolved, FIXTURE_MARKER) };
}

export async function verifyFixture(root = defaultFixtureRoot()) {
  const resolved = validateFixtureRoot(root);
  const marker = await readMarker(resolved);
  const expected = ['safe/safe.tmp', 'review/review.tmp', 'denied/denied.tmp'];
  const present = [];
  for (const relative of expected) {
    try { await fs.access(path.join(resolved, relative)); present.push(relative); } catch {}
  }
  return { root: resolved, marker, expected, present, complete: present.length === expected.length };
}

export async function resetFixture(root = defaultFixtureRoot()) {
  const resolved = validateFixtureRoot(root);
  await readMarker(resolved);
  await fs.rm(resolved, { recursive: true, force: false });
  return { root: resolved, reset: true };
}

export function defaultFixtureRoot() {
  return path.join(os.homedir(), 'safeops-c0-fixture');
}

function validateFixtureRoot(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('Fixture root must be an absolute path');
  const resolved = path.resolve(root);
  const base = path.basename(resolved);
  if (!(base === 'safeops-c0-fixture' || base.startsWith('safeops-c0-fixture-'))) throw new Error('Fixture root name is not recognized');
  if (resolved === '/' || resolved === os.homedir()) throw new Error('Refusing unsafe fixture root');
  return resolved;
}

async function readMarker(root) {
  const raw = await fs.readFile(path.join(root, FIXTURE_MARKER), 'utf8');
  const marker = JSON.parse(raw);
  if (marker.schema !== 'safeops-c0-fixture.v1' || marker.root !== root) throw new Error('Fixture marker does not match root');
  return marker;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2] || 'verify';
  const root = process.argv[3] ? path.resolve(process.argv[3]) : defaultFixtureRoot();
  const result = action === 'create' ? await createFixture(root)
    : action === 'reset' ? await resetFixture(root)
      : action === 'verify' ? await verifyFixture(root)
        : (() => { throw new Error(`Unknown fixture action: ${action}`); })();
  console.log(JSON.stringify(result, null, 2));
}
