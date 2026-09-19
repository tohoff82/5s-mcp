import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('participant surface does not import SafeOps policy/domain implementation or shell execution', async () => {
  const files = await sourceFiles(root);
  const combined = (await Promise.all(files.map(file => fs.readFile(file, 'utf8')))).join('\n');
  for (const forbidden of [
    'SafetyPolicyManager',
    'classifyPlan',
    'FiveSBridge',
    'child_process',
    'node:child_process',
    'exec(',
    'spawn(',
    'eval('
  ]) {
    assert.equal(combined.includes(forbidden), false, `forbidden carrier primitive: ${forbidden}`);
  }
});

async function sourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (entry.name === 'test') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await sourceFiles(full));
    else if (/\.(mjs|js)$/.test(entry.name)) output.push(full);
  }
  return output;
}
