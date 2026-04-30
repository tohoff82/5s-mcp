import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createKaizenTool } from '../src/mcp-server/tools/kaizen.js';

test('kaizen suggests Seiso plans for cleanup instead of direct actions', async () => {
  const tool = createKaizenTool();
  const result = await tool.execute({ action: 'suggest', scope: 'cleanup', target_path: process.cwd() });

  assert.equal(result.action, 'suggest');
  assert.ok(result.suggestions.some(item => item.linked_tool === 'seiso_clean_system'));
  assert.ok(result.suggestions.every(item => !/rm|delete/.test(item.recommendation)));
});

test('kaizen tracks and reports initiatives', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-kaizen-'));
  const tool = createKaizenTool({ backlogPath: path.join(tmp, 'backlog.json') });

  const tracked = await tool.execute({
    action: 'track',
    initiative: {
      title: 'Improve docs',
      priority: 'high',
      status: 'open'
    }
  });
  const report = await tool.execute({ action: 'report' });

  assert.equal(tracked.initiative.title, 'Improve docs');
  assert.equal(report.total, 1);
  assert.equal(report.by_priority.high, 1);

  await rm(tmp, { recursive: true, force: true });
});

test('kaizen rejects tracking without a title', async () => {
  const tool = createKaizenTool();
  await assert.rejects(() => tool.execute({ action: 'track', initiative: {} }), /initiative.title/);
});
