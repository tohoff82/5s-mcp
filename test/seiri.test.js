import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createSeiriTool } from '../src/mcp-server/tools/seiri.js';

test('seiri treats target paths as data instead of shell syntax', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-seiri-'));
  const marker = path.join(tmp, 'injected');
  const tool = createSeiriTool();

  await tool.execute({
    target: 'files',
    path: `"; touch ${marker}; #`
  });

  await assert.rejects(() => access(marker), { code: 'ENOENT' });
  await rm(tmp, { recursive: true, force: true });
});

test('seiri rejects non-numeric criteria before command construction', async () => {
  const tool = createSeiriTool();

  await assert.rejects(
    () => tool.execute({
      target: 'files',
      criteria: { size_mb: '10; touch unexpected' }
    }),
    /criteria\.size_mb must be an integer/
  );
});
