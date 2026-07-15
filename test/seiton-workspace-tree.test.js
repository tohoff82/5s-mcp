import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createSeitonTool } from '../src/mcp-server/tools/seiton-enhanced.js';

test('workspace tree applies bounded max_depth and max_files options', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-workspace-tree-'));
  const nested = path.join(tmp, 'nested');
  await mkdir(nested);
  await Promise.all(Array.from({ length: 12 }, (_, index) => writeFile(path.join(tmp, `file-${index}.txt`), 'x')));
  await writeFile(path.join(nested, 'hidden-by-depth.txt'), 'x');

  const result = await createSeitonTool().execute({
    action: 'workspace_tree',
    target_path: tmp,
    max_depth: 1,
    max_files: 10
  });

  assert.equal(result.success, true);
  assert.equal(result.metadata.filesShown, 10);
  assert.doesNotMatch(result.tree, /hidden-by-depth/);
  await rm(tmp, { recursive: true, force: true });
});

test('workspace tree never evaluates shell syntax embedded in a path', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-workspace-tree-'));
  const marker = path.join(tmp, 'injected');
  const result = await createSeitonTool().execute({
    action: 'workspace_tree',
    target_path: `"; touch ${marker}; #`
  });

  assert.equal(result.success, false);
  await assert.rejects(() => access(marker), { code: 'ENOENT' });
  await rm(tmp, { recursive: true, force: true });
});
