import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { SafetyPolicyManager } from '../../safety-policy.js';

const execFileAsync = promisify(execFile);
const SECRET_PATTERN = /(password|passwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*["']?[^"'\s]+/gi;

export function createGembaTool(options = {}) {
  const policy = options.policy || new SafetyPolicyManager();

  return {
    name: 'gemba_inspect',
    description: 'Gemba source inspection. Read-only system/repo observation with safety policy checks and secret redaction.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['walk', 'observe', 'context'],
          description: 'Gemba action'
        },
        target_path: {
          type: 'string',
          default: '.'
        },
        service: {
          type: 'string',
          description: 'Optional systemd service for read-only status inspection'
        },
        max_files: {
          type: 'number',
          default: 20
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, target_path = '.', service, max_files = 20 } = args;
      const targetPath = path.resolve(target_path);
      await assertReadableByPolicy(policy, targetPath);

      switch (action) {
        case 'walk':
          return await gembaWalk(targetPath, max_files);
        case 'observe':
          return await gembaObserve(targetPath, service);
        case 'context':
          return await gembaContext(targetPath, max_files);
        default:
          throw new Error(`Unknown Gemba action: ${action}`);
      }
    }
  };
}

async function assertReadableByPolicy(policy, targetPath) {
  const verdict = await policy.evaluateOperation({
    command: `read ${targetPath}`,
    paths: [targetPath],
    destructive: false
  });
  if (verdict.risk_level === 'P4_FORBIDDEN') {
    throw new Error(`Target path is denied by policy: ${verdict.reasons.join('; ')}`);
  }
}

async function gembaWalk(targetPath, maxFiles) {
  const files = await listFiles(targetPath, maxFiles);
  const stats = await Promise.all(files.map(async file => {
    const stat = await fs.stat(file);
    return {
      path: file,
      size_bytes: stat.size,
      mtime: stat.mtime.toISOString()
    };
  }));

  return {
    timestamp: new Date().toISOString(),
    action: 'walk',
    target_path: targetPath,
    file_count: stats.length,
    files: stats
  };
}

async function gembaObserve(targetPath, service) {
  const disk = await safeExec('df', ['-h', targetPath]);
  const serviceStatus = service ? await safeExec('systemctl', ['is-active', service]) : null;
  const processSnapshot = await safeExec('ps', ['-eo', 'pid,ppid,comm,%cpu,%mem', '--sort=-%cpu']);

  return {
    timestamp: new Date().toISOString(),
    action: 'observe',
    target_path: targetPath,
    disk: redact(disk.stdout || disk.stderr),
    service: service ? {
      name: service,
      status: redact(serviceStatus.stdout || serviceStatus.stderr)
    } : null,
    top_processes: redact((processSnapshot.stdout || '').split('\n').slice(0, 12).join('\n'))
  };
}

async function gembaContext(targetPath, maxFiles) {
  const candidates = (await listFiles(targetPath, maxFiles * 3))
    .filter(file => /\.(md|json|yaml|yml|conf|env|service|js|ts)$/.test(file))
    .slice(0, maxFiles);

  const context = [];
  for (const file of candidates) {
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    context.push({
      path: file,
      preview: redact(content.slice(0, 1200))
    });
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'context',
    target_path: targetPath,
    files: context
  };
}

async function listFiles(root, limit) {
  const results = [];
  async function visit(current) {
    if (results.length >= limit) return;
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= limit) return;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      if (entry.isFile()) results.push(fullPath);
    }
  }
  await visit(root);
  return results;
}

async function safeExec(command, args) {
  try {
    return await execFileAsync(command, args, { timeout: 10000, maxBuffer: 512 * 1024 });
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}

function redact(value) {
  return String(value || '').replace(SECRET_PATTERN, '$1=[REDACTED]');
}

export { redact };
