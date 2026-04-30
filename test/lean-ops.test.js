import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeanOpsTool } from '../src/mcp-server/tools/lean-ops.js';

test('lean ops returns andon status', async () => {
  const tool = createLeanOpsTool();
  const result = await tool.execute({ action: 'andon_status', target_path: process.cwd() });

  assert.equal(result.action, 'andon_status');
  assert.ok(['green', 'yellow', 'red'].includes(result.state));
  assert.equal(typeof result.summary.disk_percent, 'number');
});

test('jidoka check exposes stop automation flag', async () => {
  const tool = createLeanOpsTool();
  const result = await tool.execute({
    action: 'jidoka_check',
    target_path: process.cwd(),
    thresholds: { disk_critical: 0, memory_critical: 100 }
  });

  assert.equal(result.should_stop_automation, true);
  assert.ok(result.stop_conditions.some(item => item.type === 'disk'));
});

test('muda detect returns waste list', async () => {
  const tool = createLeanOpsTool();
  const result = await tool.execute({ action: 'muda_detect', target_path: process.cwd() });

  assert.equal(result.action, 'muda_detect');
  assert.ok(Array.isArray(result.wastes));
});
