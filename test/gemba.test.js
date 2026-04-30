import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createGembaTool, redact } from '../src/mcp-server/tools/gemba.js';

test('gemba redacts secrets from context previews', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-gemba-'));
  await writeFile(path.join(tmp, '.env'), 'API_KEY=super-secret\nNORMAL=value\n');
  const tool = createGembaTool();

  const result = await tool.execute({ action: 'context', target_path: tmp, max_files: 5 });

  assert.equal(result.action, 'context');
  assert.match(result.files[0].preview, /API_KEY=\[REDACTED\]/);
  assert.doesNotMatch(result.files[0].preview, /super-secret/);

  await rm(tmp, { recursive: true, force: true });
});

test('gemba walk is read-only and lists files', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-gemba-'));
  await writeFile(path.join(tmp, 'README.md'), '# test\n');
  const tool = createGembaTool();

  const result = await tool.execute({ action: 'walk', target_path: tmp });

  assert.equal(result.file_count, 1);
  assert.equal(path.basename(result.files[0].path), 'README.md');

  await rm(tmp, { recursive: true, force: true });
});

test('redact masks token-like values', () => {
  assert.equal(redact('token=abc123'), 'token=[REDACTED]');
});
