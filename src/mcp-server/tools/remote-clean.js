import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { SafetyPolicyManager } from '../../safety-policy.js';

const execFileAsync = promisify(execFile);

const REMOTE_SKIP_SUFFIXES = ['.pid', '.sock', '.lock'];

export function createRemoteCleanTool(options = {}) {
  const policy = options.policy || new SafetyPolicyManager();
  const executor = options.executor;

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
          return await analyzeRemote(ssh, evidence, executor);

        case 'plan':
          return await buildRemotePlan(policy, ssh, evidence, executor);

        case 'cleanup': {
          const plan = await buildRemotePlan(policy, ssh, evidence, executor);
          if (dry_run) {
            return { ...plan, action, dry_run, executed: false };
          }
          if (!approved) {
            throw new Error('approved=true is required for remote cleanup apply');
          }
          return await applyRemotePlan(ssh, plan, { dry_run, approved, executor, policy });
        }

        default:
          throw new Error(`Unknown remote clean action: ${action}`);
      }
    }
  };
}

async function analyzeRemote(ssh, evidence, executor) {
  const inferredPaths = inferTouchedPaths(evidence.paths_visited, evidence.commands_executed);
  const safeCandidates = inferredPaths.filter(candidate => isRemoteCleanupCandidate(candidate.path));
  const inspections = [];

  for (const candidate of safeCandidates.slice(0, evidence.max_items)) {
    const command = `if [ -e ${shellQuote(candidate.path)} ]; then stat -c '%n|%F|%s|%Y' ${shellQuote(candidate.path)}; fi`;
    try {
      const { stdout } = await runRemote(ssh, command, executor);
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

async function buildRemotePlan(policy, ssh, evidence, executor) {
  const analysis = await analyzeRemote(ssh, evidence, executor);
  const operations = [];

  for (const candidate of analysis.candidates) {
    if (candidate.error) continue;
    const manifest = await collectRemoteManifest(ssh, candidate, evidence, executor);
    if (manifest.length === 0) {
      operations.push({
        id: operationId(candidate.path),
        type: 'remote_noop',
        path: candidate.path,
        command: `remote-manifest-remove ${candidate.path}`,
        remote_command: null,
        reason: candidate.reason,
        manifest,
        destructive: false,
        status: 'no_candidates',
        verdict: await policy.evaluateOperation({
          command: `remote-manifest-remove ${candidate.path}`,
          paths: [candidate.path],
          destructive: false,
          approved: false
        })
      });
      continue;
    }

    const command = `remote-manifest-remove ${candidate.path}`;
    const remoteCommand = buildRemoteRemoveCommand(manifest);
    const verdict = await policy.evaluateOperation({
      command,
      paths: manifest.map(item => item.path),
      destructive: true,
      approved: false
    });

    operations.push({
      id: operationId(candidate.path),
      type: 'remote_remove',
      path: candidate.path,
      command,
      remote_command: remoteCommand,
      reason: candidate.reason,
      manifest,
      size_bytes: manifest.reduce((sum, item) => sum + (item.size_bytes || 0), 0),
      mtime_epoch: candidate.mtime_epoch,
      destructive: true,
      verdict
    });
  }

  const actionable = operations.filter(operation => operation.type === 'remote_remove');
  const blocked = actionable.filter(operation => !operation.verdict.allowed);
  const runnable = actionable.filter(operation => operation.verdict.allowed);

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
      actionable: actionable.length,
      no_candidates: operations.filter(operation => operation.status === 'no_candidates').length,
      runnable: runnable.length,
      blocked: blocked.length,
      estimated_bytes: runnable.reduce((sum, item) => sum + (item.size_bytes || 0), 0)
    }
  };
}

async function applyRemotePlan(ssh, plan, options) {
  const results = [];

  for (const operation of plan.operations) {
    if (operation.type !== 'remote_remove') {
      results.push({ id: operation.id, path: operation.path, skipped: true, reason: operation.status || 'No remote cleanup action' });
      continue;
    }

    const verdict = await options.policy.evaluateOperation({
      command: operation.command,
      paths: (operation.manifest || []).map(item => item.path),
      destructive: true,
      approved: true
    });

    if (!verdict.allowed) {
      results.push({ id: operation.id, path: operation.path, skipped: true, reason: verdict.reasons.join('; ') });
      continue;
    }

    if (operation.verdict.risk_level === 'P4_FORBIDDEN') {
      results.push({ id: operation.id, path: operation.path, skipped: true, reason: 'Blocked by plan policy verdict' });
      continue;
    }

    if (!operation.remote_command) {
      results.push({ id: operation.id, path: operation.path, skipped: true, reason: 'Missing remote_command' });
      continue;
    }

    try {
      const { stdout, stderr } = await runRemote(ssh, operation.remote_command, options.executor);
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
  const normalized = path.posix.normalize(candidatePath);
  const denied = ['/etc', '/usr', '/bin', '/sbin', '/lib', '/lib64', '/var/lib', '/root/.ssh'];
  if (denied.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}/`))) return false;

  if (normalized.startsWith('/tmp/')) return normalized.split('/').filter(Boolean).length >= 2;
  if (normalized.startsWith('/var/tmp/')) return normalized.split('/').filter(Boolean).length >= 3;
  if (normalized.startsWith('/home/')) return normalized.split('/').filter(Boolean).length >= 3;
  return false;
}

async function collectRemoteManifest(ssh, candidate, evidence, executor) {
  const command = [
    `target=${shellQuote(candidate.path)}`,
    'if [ -f "$target" ]; then',
    remoteStatCommand('"$target"'),
    'elif [ -d "$target" ]; then',
    `find "$target" -mindepth 1 -maxdepth 3 -type f ${remoteSkipExpression()} -printf '%p|%s|%T@|%u|%g|%i\\n' | head -n ${Number(evidence.max_items) || 50}`,
    'fi'
  ].join('; ');

  try {
    const { stdout } = await runRemote(ssh, command, executor);
    return parseManifest(stdout);
  } catch {
    return [];
  }
}

function parseManifest(output) {
  return String(output || '')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [filePath, size, mtime, owner, group, inode] = line.split('|');
      return {
        id: `remote-item-${Buffer.from(filePath || '').toString('base64url').slice(0, 18)}`,
        path: filePath,
        size_bytes: Number(size) || 0,
        mtime_epoch: Number.parseFloat(mtime) || null,
        owner,
        group,
        inode,
        file_type: 'file'
      };
    })
    .filter(item => item.path && isRemoteCleanupCandidate(item.path) && !REMOTE_SKIP_SUFFIXES.some(suffix => item.path.endsWith(suffix)));
}

function buildRemoteRemoveCommand(manifest) {
  const files = manifest.map(item => shellQuote(item.path)).join(' ');
  return `rm -f -- ${files}`;
}

function remoteStatCommand(targetExpression) {
  return `stat -c '%n|%s|%Y|%U|%G|%i' ${targetExpression}`;
}

function remoteSkipExpression() {
  return REMOTE_SKIP_SUFFIXES.map(suffix => `! -name '*${suffix}'`).join(' ');
}

async function runRemote(ssh, command, executor) {
  if (executor) {
    return await executor.run(ssh, command);
  }
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
