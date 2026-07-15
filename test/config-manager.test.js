import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { ConfigManager } from '../src/config-manager.js';

test('config manager rejects module names outside the bounded config set', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-config-'));
  const manager = new ConfigManager();
  manager.configPath = path.join(tmp, 'config');

  await assert.rejects(() => manager.loadConfig('../outside'), /Unknown config module/);
  await assert.rejects(() => manager.saveConfig('../outside', {}), /Unknown config module/);

  await rm(tmp, { recursive: true, force: true });
});

test('config import reports unknown modules without writing them', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-config-'));
  const inputPath = path.join(tmp, 'import.json');
  const manager = new ConfigManager();
  manager.configPath = path.join(tmp, 'config');
  await writeFile(inputPath, JSON.stringify({
    version: '1.0.0',
    configs: { '../outside': {} }
  }));

  const result = await manager.importConfigs(inputPath);

  assert.equal(result.imported, 0);
  assert.match(result.errors[0], /Unknown config module/);
  await rm(tmp, { recursive: true, force: true });
});
