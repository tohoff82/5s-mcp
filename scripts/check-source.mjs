import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const sourceRoots = ['src', 'scripts', 'test', 'docs/changes/5s-procedures/schemas'];
const rootFiles = ['changelog.config.js', 'create_todays_changelog.js', 'demo.js'];

const files = [...rootFiles];
for (const sourceRoot of sourceRoots) {
  files.push(...await collectJavaScript(path.join(root, sourceRoot)));
}

for (const file of [...new Set(files)].sort()) {
  await execFileAsync(process.execPath, ['--check', file], {
    cwd: root,
    timeout: 10_000,
    maxBuffer: 1024 * 1024
  });
}

console.log(`source syntax verified: ${files.length} JavaScript modules`);

async function collectJavaScript(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const collected = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...await collectJavaScript(fullPath));
    } else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) {
      collected.push(path.relative(root, fullPath));
    }
  }
  return collected;
}
