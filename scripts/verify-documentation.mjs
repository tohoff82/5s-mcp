#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOrWrite, deriveTools } from './generate-tools-reference.mjs';
import { verifyLinks } from './verify-documentation-links.mjs';
import { PACKAGE_VERSION } from '../src/version.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'docs/documentation-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);

function markdown(dir) {
  return readdirSync(dir).flatMap(entry => {
    if (ignored.has(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? markdown(path) : extname(path) === '.md' ? [relative(root, path)] : [];
  });
}

function classification(path) {
  return manifest.documents.find(doc => doc.path === path)
    ?? manifest.inherited.find(rule => path.startsWith(rule.prefix));
}

function frontmatter(path) {
  const text = readFileSync(join(root, path), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(match[1].split('\n').filter(Boolean).map(line => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
}

export function verifyDocumentation() {
  const errors = [];
  const allMarkdown = markdown(root);
  const manifestPaths = new Set();

  for (const doc of manifest.documents) {
    if (manifestPaths.has(doc.path)) errors.push(`duplicate manifest path: ${doc.path}`);
    manifestPaths.add(doc.path);
    if (!existsSync(join(root, doc.path))) errors.push(`manifest path missing: ${doc.path}`);
  }
  for (const path of allMarkdown) {
    if (!classification(path)) errors.push(`unclassified document: ${path}`);
  }

  const ids = new Set();
  for (const doc of manifest.documents.filter(doc => doc.metadata)) {
    if (!existsSync(join(root, doc.path))) continue;
    const meta = frontmatter(doc.path);
    if (!meta) {
      errors.push(`missing metadata: ${doc.path}`);
      continue;
    }
    if (meta.authority !== doc.authority) errors.push(`authority mismatch: ${doc.path}`);
    if (meta.status !== doc.status) errors.push(`status mismatch: ${doc.path}`);
    if (!meta.source_of_truth) errors.push(`source_of_truth missing: ${doc.path}`);
    if (!meta.last_verified_commit) errors.push(`last_verified_commit missing: ${doc.path}`);
    if (!meta.audience) errors.push(`audience missing: ${doc.path}`);
    if (!meta.document_id || ids.has(meta.document_id)) errors.push(`missing/duplicate document_id: ${doc.path}`);
    ids.add(meta.document_id);
  }

  const map = readFileSync(join(root, 'docs/00-DOCUMENTATION-MAP.md'), 'utf8');
  for (const doc of manifest.documents.filter(doc => ['canonical', 'generated'].includes(doc.authority) && doc.status === 'current')) {
    if (doc.path === 'docs/00-DOCUMENTATION-MAP.md') continue;
    const route = doc.path.startsWith('docs/') ? doc.path.slice(5) : `../${doc.path}`;
    if (!map.includes(route)) errors.push(`unindexed canonical doc: ${doc.path}`);
  }

  for (const path of ['docs/README.md', 'docs/tools.md', 'docs/architecture.md', 'docs/operations.md', 'docs/safety.md', 'docs/remote-clean.md', 'docs/PRODUCTION-HARDENING.md']) {
    const text = readFileSync(join(root, path), 'utf8');
    if (!text.includes('canonical')) errors.push(`compatibility route lacks canonical warning: ${path}`);
  }

  const tools = deriveTools();
  if (tools.length !== 12 || new Set(tools.map(tool => tool.name)).size !== 12) errors.push('tool count/uniqueness mismatch');
  const groupCounts = Object.fromEntries(['5S core', 'Safety controls', 'Lean extensions'].map(group => [group, tools.filter(tool => tool.group === group).length]));
  if (groupCounts['5S core'] !== 5 || groupCounts['Safety controls'] !== 3 || groupCounts['Lean extensions'] !== 4) {
    errors.push(`tool group mismatch: ${JSON.stringify(groupCounts)}`);
  }
  if (tools.filter(tool => tool.annotations.readOnlyHint).length !== 6) errors.push('read-only annotation count mismatch');
  if (tools.filter(tool => tool.annotations.destructiveHint).length !== 4) errors.push('destructive annotation count mismatch');

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (pkg.version !== PACKAGE_VERSION) errors.push('MCP server/package version mismatch');
  if (pkg.main !== 'src/mcp-server/index.js') errors.push('package entrypoint mismatch');
  for (const entry of ['src', 'config', 'test', 'scripts', 'skills/5s-mcp', 'docs/*.md', 'docs/documentation-manifest.json', 'docs/07-MAINTENANCE-LIFECYCLE']) {
    if (!pkg.files?.includes(entry)) errors.push(`package allowlist missing: ${entry}`);
  }
  if (pkg.files?.includes('docs')) errors.push('package allowlist ships historical procedure records through broad docs inclusion');
  const clientConfig = JSON.parse(readFileSync(join(root, 'mcp-config.json'), 'utf8'));
  if (clientConfig.version !== pkg.version) errors.push('sample MCP config version mismatch');
  if ('tools' in clientConfig) errors.push('sample MCP config duplicates the runtime tool catalog');
  if (!clientConfig.mcpServers?.['5s']?.args?.includes('/absolute/path/to/5s-mcp/src/mcp-server/index.js')) {
    errors.push('sample MCP config lacks the portable absolute-path placeholder');
  }
  const installer = readFileSync(join(root, 'install.sh'), 'utf8');
  for (const pattern of [/apt-get/i, /systemctl/i, /\/etc\/cron\.d/i, /\brm\s+-rf\b/i]) {
    if (pattern.test(installer)) errors.push(`bootstrap helper contains forbidden system mutation: ${pattern}`);
  }
  const activeTemplates = ['seiri-template.json', 'seiso-template.json']
    .map(name => readFileSync(join(root, 'docs/changes/5s-procedures/templates', name), 'utf8'))
    .join('\n');
  for (const pattern of [/\bfind\b.*\b-delete\b/i, /\brm\s+-rf\b/i, /\bapt\s+autoremove\b/i, /\bdocker\s+system\s+prune\b/i]) {
    if (pattern.test(activeTemplates)) errors.push(`active procedure template bypasses MCP maintenance: ${pattern}`);
  }
  try { checkOrWrite({ check: true }); } catch (error) { errors.push(error.message); }
  try { verifyLinks(); } catch (error) { errors.push(error.message); }

  const canonicalText = manifest.documents
    .filter(doc => ['canonical', 'generated'].includes(doc.authority) && doc.status === 'current')
    .map(doc => readFileSync(join(root, doc.path), 'utf8'))
    .join('\n');
  for (const fact of ['12 tools', '6 read-only tools', '4 destructive-capable tools', '1 stdio entrypoint']) {
    if (!canonicalText.includes(fact)) errors.push(`canonical fact missing: ${fact}`);
  }
  for (const pattern of [/all inputs are sandboxed/i, /automatic authorization/i, /works on every platform/i]) {
    if (pattern.test(canonicalText)) errors.push(`unsupported safety/readiness claim: ${pattern}`);
  }
  if (/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/.test(canonicalText)) errors.push('secret hits: private key marker');

  if (errors.length) throw new Error(errors.join('\n'));
  return {
    documents: allMarkdown.length,
    canonical: manifest.documents.filter(doc => doc.authority === 'canonical').length,
    tools: tools.length
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyDocumentation();
    process.stdout.write(`documentation verified: ${result.documents} classified Markdown files, ${result.canonical} canonical entries, ${result.tools} tools\n`);
    process.stdout.write('unindexed canonical docs: 0\nunsupported safety/readiness claims: 0\nsecret hits: 0\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
