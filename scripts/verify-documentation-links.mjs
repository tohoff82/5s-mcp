#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);

function files(dir) {
  return readdirSync(dir).flatMap(entry => {
    if (ignored.has(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : extname(path) === '.md' ? [path] : [];
  });
}

function slug(heading) {
  return heading.trim().toLowerCase().replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function anchors(path) {
  const counts = new Map();
  const result = new Set();
  for (const match of readFileSync(path, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = slug(match[1]);
    const count = counts.get(base) ?? 0;
    result.add(count ? `${base}-${count}` : base);
    counts.set(base, count + 1);
  }
  return result;
}

export function verifyLinks() {
  const failures = [];
  let checked = 0;
  for (const source of files(root)) {
    const text = readFileSync(source, 'utf8');
    const withoutFences = text.replace(/```[\s\S]*?```/g, '');
    for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+['\"][^'\"]*['\"])?\)/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|data:)/i.test(href)) continue;
      const [rawPath, rawFragment] = href.split('#', 2);
      let target = rawPath ? resolve(dirname(source), decodeURIComponent(rawPath)) : source;
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'README.md');
      checked += 1;
      if (!existsSync(target)) {
        failures.push(`${relative(root, source)} -> ${href} (missing file)`);
      } else if (rawFragment && extname(target) === '.md' && !anchors(target).has(decodeURIComponent(rawFragment).toLowerCase())) {
        failures.push(`${relative(root, source)} -> ${href} (missing anchor)`);
      }
    }
  }
  if (failures.length) throw new Error(`broken internal links: ${failures.length}\n${failures.join('\n')}`);
  return checked;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`broken internal links: 0 (${verifyLinks()} checked)\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
