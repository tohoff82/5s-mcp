import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createPokaYokeTool } from '../src/mcp-server/tools/poka-yoke.js';

test('poka-yoke scans direct destructive commands', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-poka-'));
  await writeFile(path.join(tmp, 'cleanup.md'), 'run find /tmp -type f -delete\n');
  const tool = createPokaYokeTool();

  const result = await tool.execute({ action: 'scan', target_path: tmp });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, 'direct-delete');
  assert.equal(result.findings[0].approval_level, 'P3_HIGH');

  await rm(tmp, { recursive: true, force: true });
});

test('poka-yoke suggestions map direct cleanup to Seiso plans', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-poka-'));
  await writeFile(path.join(tmp, 'script.sh'), 'rm -rf "$TARGET"\n');
  const tool = createPokaYokeTool();

  const result = await tool.execute({ action: 'suggest', target_path: tmp });

  assert.ok(result.suggestions.some(item => item.suggested_plan.tool === 'seiso_clean_system'));

  await rm(tmp, { recursive: true, force: true });
});

test('poka-yoke validate fails when high risk findings exist', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-poka-'));
  await writeFile(path.join(tmp, '.env'), 'TOKEN=abc123\n');
  const tool = createPokaYokeTool();

  const result = await tool.execute({ action: 'validate', target_path: tmp });

  assert.equal(result.passed, false);
  assert.equal(result.high_findings, 1);

  await rm(tmp, { recursive: true, force: true });
});
