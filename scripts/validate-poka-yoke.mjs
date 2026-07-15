#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPokaYokeTool } from '../src/mcp-server/tools/poka-yoke.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = await createPokaYokeTool().execute({
  action: 'validate',
  target_path: root,
  max_files: 1000,
  profile: 'repo'
});
const counts = result.findings.reduce((summary, finding) => {
  summary[finding.severity] = (summary[finding.severity] || 0) + 1;
  return summary;
}, {});

process.stdout.write(
  `poka-yoke repo validation: ${result.passed ? 'passed' : 'failed'}; `
  + `${counts.high || 0} high, ${counts.medium || 0} medium, ${counts.low || 0} low, `
  + `${counts.informational || 0} informational findings\n`
);

if (!result.passed) process.exit(1);
