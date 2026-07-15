import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createCronManagerTool } from '../src/mcp-server/tools/cron-manager.js';

test('cron manager renders default non-destructive jobs for provided project dir', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-cron-'));
  const tool = createCronManagerTool();

  const result = await tool.execute({
    action: 'render',
    project_dir: tmp,
    node_bin: '/usr/bin/node'
  });

  assert.match(result.rendered, /daily read-only 5S health check/i);
  assert.match(result.rendered, new RegExp(`cd ${tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.doesNotMatch(result.rendered, /deep-clean|autoremove|find .*delete|rm -rf/);

  await rm(tmp, { recursive: true, force: true });
});

test('cron manager refuses destructive custom jobs', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-cron-'));
  const tool = createCronManagerTool();

  await assert.rejects(
    () => tool.execute({
      action: 'validate',
      project_dir: tmp,
      jobs: [
        {
          id: 'bad-cleanup',
          schedule: '0 1 * * *',
          command: 'find /tmp -type f -delete'
        }
      ]
    }),
    /Refusing destructive cron command/
  );

  await rm(tmp, { recursive: true, force: true });
});

test('cron manager can read an existing cron file', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-cron-'));
  const cronPath = path.join(tmp, '5s.cron');
  await writeFile(cronPath, '# test\n');
  const tool = createCronManagerTool();

  const result = await tool.execute({ action: 'read', cron_path: cronPath });

  assert.equal(result.exists, true);
  assert.equal(result.content, '# test\n');

  await rm(tmp, { recursive: true, force: true });
});

test('cron manager checks safety policy before removal', async () => {
  const tool = createCronManagerTool();

  await assert.rejects(
    () => tool.execute({ action: 'remove', cron_path: '/etc/ssh/5s.cron', dry_run: false }),
    /Cron removal blocked by policy/
  );
});
