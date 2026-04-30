import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { SafetyPolicyManager } from '../../safety-policy.js';

const execFileAsync = promisify(execFile);

export function createRemoteCleanTool() {
  const policy = new SafetyPolicyManager();

  return {
    name: '5s_remote_clean',
    description: 'Remote cleanup mode for agents. Builds and optionally applies a safe cleanup plan for remote servers after agent work.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'plan', 'cleanup'],
          description: 'Remote cleanup action'
        },
        host: { type: 'string', description: 'Remote host or IP' },
        user: { type: 'string', default: 'root' },
        port: { type: 'number', default: 22 },
        identity_file: { type: 'string' },
        session_id: { type: 'string', description: 'Agent session id for traceability' },
        paths_visited: {
          type: 'array',
          items: { type: 'string' },
          description: 'Remote paths the agent touched or inspected'
        },
        commands_executed: {
          type: 'array',
          items: { type: 'string' },
          description: 'Commands the agent executed on the remote host'
        },
        preserve_days: { type: 'number', default: 1 },
        dry_run: { type: 'boolean', default: true },
        approved: { type: 'boolean', default: false },
        max_items: { type: 'number', default: 50 }
      },
      required: ['action', 'host']
    },

    async execute(args) {
      const {
        action,
        host,
        user = 'root',
        port = 22,
        identity_file,
        session_id = `remote-${Date.now()}`,
        paths_visited = [],
        commands_executed = [],
        preserve_days = 1,
        dry_run = true,
        approved = false,
        max_items = 50
      } = args;

      const ssh = { host, user, port, identity_file };
      const evidence = { session_id, paths_visited, commands_executed, preserve_days, max_items };

      switch (action) {
        case 'analyze':
          return await analyzeRemote(ssh, evidence);

        case 'plan':
          return await buildRemotePlan(policy, ssh, evidence);

        case 'cleanup': {
          const plan = await buildRemotePlan(policy, ssh, evidence);
          if (dry_run) {
            return { ...plan, action, dry_run, executed: false };
          }
          if (!approved) {
            throw new Error('approved=true is required for remote cleanup apply');
          }
          return await applyRemotePlan(ssh, plan, { dry_run, approved });
        }

        default:
          throw new Error(`Unknown remote clean action: ${action}`);
      }
    }
  };
}

async function analyzeRemote(ssh, evidence) {
  const inferredPaths = inferTouchedPaths(evidence.paths_visited, evidence.commands_executed);
  const safeCandidates = inferredPaths.filter(candidate => isRemoteCleanupCandidate(candidate.path));
  const inspections = [];

  for (const candidate of safeCandidates.slice(0, evidence.max_items)) {
    const command = `if [ -e ${shellQuote(candidate.path)} ]; then stat -c '%n|%F|%s|%Y' ${shellQuote(candidate.path)}; fi`;
    try {
      const { stdout } = await runSsh(ssh, command);
      if (stdout.trim()) {
        inspections.push(parseStat(stdout.trim(), candidate));
      }
    } catch (error) {
      inspections.push({ ...candidate, error: error.message });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'analyze',
    host: ssh.host,
    session_id: evidence.session_id,
    inferred_paths: inferredPaths,
    candidates: inspections
  };
}

async function buildRemotePlan(policy, ssh, evidence) {
  const analysis = await analyzeRemote(ssh, evidence);
  const operations = [];

  for (const candidate of analysis.candidates) {
    if (candidate.error) continue;
    const command = `remote-manifest-remove ${candidate.path}`;
    const verdict = await policy.evaluateOperation({
      command,
      remote_command: `rm -r -- ${shellQuote(candidate.path)}`,
      paths: [candidate.path],
      destructive: true,
      approved: true
    });

    operations.push({
      id: operationId(candidate.path),
      type: 'remote_remove',
      path: candidate.path,
      command,
      reason: candidate.reason,
      size_bytes: candidate.size_bytes,
      mtime_epoch: candidate.mtime_epoch,
      verdict
    });
  }

  const blocked = operations.filter(operation => !operation.verdict.allowed);
  const runnable = operations.filter(operation => operation.verdict.allowed);

  return {
    timestamp: new Date().toISOString(),
    action: 'plan',
    host: ssh.host,
    session_id: evidence.session_id,
    preserve_days: evidence.preserve_days,
    analysis,
    operations,
    summary: {
      total: operations.length,
      runnable: runnable.length,
      blocked: blocked.length,
      estimated_bytes: runnable.reduce((sum, item) => sum + (item.size_bytes || 0), 0)
    }
  };
}

async function applyRemotePlan(ssh, plan, options) {
  const results = [];

  for (const operation of plan.operations) {
    if (!operation.verdict.allowed) {
      results.push({ id: operation.id, path: operation.path, skipped: true, reason: 'Blocked by policy' });
      continue;
    }

    try {
      const { stdout, stderr } = await runSsh(ssh, operation.remote_command);
      results.push({ id: operation.id, path: operation.path, executed: true, stdout: stdout.trim(), stderr: stderr.trim() });
    } catch (error) {
      results.push({ id: operation.id, path: operation.path, executed: false, error: error.message });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'cleanup',
    dry_run: options.dry_run,
    approved: options.approved,
    host: ssh.host,
    session_id: plan.session_id,
    summary: plan.summary,
    results
  };
}

export function inferTouchedPaths(pathsVisited, commandsExecuted) {
  const paths = new Map();

  for (const visited of pathsVisited || []) {
    addCandidate(paths, visited, 'provided by agent session evidence');
  }

  for (const command of commandsExecuted || []) {
    const gitCloneMatch = command.match(/\bgit\s+clone\s+\S+\s+([/~.A-Za-z0-9_./:-]+)/);
    if (gitCloneMatch) {
      addCandidate(paths, normalizeRemotePath(gitCloneMatch[1]), `inferred from command: ${command.slice(0, 120)}`);
    }

    for (const match of command.matchAll(/(?:cd|mkdir|touch|cp|mv|rm|git\s+clone|npm|python|node)\s+([/~.A-Za-z0-9_./:-]+)/g)) {
      addCandidate(paths, normalizeRemotePath(match[1]), `inferred from command: ${command.slice(0, 120)}`);
    }
  }

  return Array.from(paths.values());
}

function addCandidate(paths, rawPath, reason) {
  const normalized = normalizeRemotePath(rawPath);
  if (!normalized || normalized === '/' || normalized === '~') return;
  if (!paths.has(normalized)) {
    paths.set(normalized, { path: normalized, reason });
  }
}

function normalizeRemotePath(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.startsWith('~/')) return `/root/${cleaned.slice(2)}`;
  if (cleaned.startsWith('/')) return path.posix.normalize(cleaned);
  return null;
}

export function isRemoteCleanupCandidate(candidatePath) {
  if (!candidatePath) return false;
  const allowed = ['/tmp/', '/var/tmp/', '/home/'];
  const denied = ['/etc/', '/usr/', '/bin/', '/sbin/', '/lib/', '/lib64/', '/var/lib/', '/root/.ssh/'];
  if (denied.some(prefix => `${candidatePath}/`.startsWith(prefix))) return false;
  return allowed.some(prefix => `${candidatePath}/`.startsWith(prefix));
}

async function runSsh(ssh, command) {
  const args = ['-p', String(ssh.port), '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new'];
  if (ssh.identity_file) args.push('-i', ssh.identity_file);
  args.push(`${ssh.user}@${ssh.host}`, command);
  return await execFileAsync('ssh', args, { timeout: 30000, maxBuffer: 1024 * 1024 });
}

function parseStat(output, candidate) {
  const [name, fileType, size, mtime] = output.split('|');
  return {
    ...candidate,
    path: name || candidate.path,
    file_type: fileType || 'unknown',
    size_bytes: Number(size) || 0,
    mtime_epoch: Number(mtime) || null
  };
}

function operationId(value) {
  return `remote-clean-${Buffer.from(value).toString('base64url').slice(0, 24)}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
