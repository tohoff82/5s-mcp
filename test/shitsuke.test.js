import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createShitsukeTool } from '../src/mcp-server/tools/shitsuke.js';

test('shitsuke health does not mark unsupported platform checks as critical', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-shitsuke-'));
  const tool = createShitsukeTool({
    auditLogPath: path.join(tmp, 'audit.log'),
    metricsPath: path.join(tmp, 'metrics.json'),
    reportsPath: path.join(tmp, 'reports')
  });

  const result = await tool.execute({ action: 'health' });

  assert.notEqual(result.overall, 'CRITICAL');
  assert.ok(['HEALTHY', 'WARNING', 'DEGRADED'].includes(result.overall));

  await rm(tmp, { recursive: true, force: true });
});

test('shitsuke metrics handles missing history as no data', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-shitsuke-'));
  const tool = createShitsukeTool({
    auditLogPath: path.join(tmp, 'audit.log'),
    metricsPath: path.join(tmp, 'missing-metrics.json'),
    reportsPath: path.join(tmp, 'reports')
  });

  const result = await tool.execute({ action: 'metrics' });

  assert.equal(result.auditsCount, 0);
  assert.equal(result.message, 'Недостатньо даних для аналізу');

  await rm(tmp, { recursive: true, force: true });
});
