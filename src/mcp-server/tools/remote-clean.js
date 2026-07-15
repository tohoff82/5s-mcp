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
        host: {
          type: 'string',
          description: 'Remote host, SSH alias, or IP without user or option prefixes',
          minLength: 1,
          pattern: '^(?!-)(?!.*@)[A-Za-z0-9_.:\\[\\]%-]+$'
        },
        user: { type: 'string', default: 'root', pattern: '^[A-Za-z_][A-Za-z0-9_-]*[$]?$' },
        port: { type: 'integer', default: 22, minimum: 1, maximum: 65535 },
        identity_file: { type: 'string', minLength: 1, pattern: '^[^\\r\\n\\u0000]+$' },
        session_id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[^\\r\\n\\u0000]+$', description: 'Agent session id for traceability' },
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
        preserve_days: { type: 'number', default: 1, minimum: -1, maximum: 36500 },
        dry_run: { type: 'boolean', default: true },
        approved: { type: 'boolean', default: false },
        max_items: { type: 'integer', default: 50, minimum: 1, maximum: 500 }
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

      const ssh = validateSshTarget({ host, user, port, identity_file });
      const evidence = validateEvidence({
        session_id,
        paths_visited,
        commands_executed,
        preserve_days,
        max_items
      });

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
  const inferredPaths = inferTouchedPaths(evidence.paths_visited, evidence.commands_executed, ssh.user);
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
      approved: true
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

export function inferTouchedPaths(pathsVisited, commandsExecuted, remoteUser = 'root') {
  const paths = new Map();

  for (const visited of pathsVisited || []) {
    addCandidate(paths, visited, 'provided by agent session evidence', remoteUser);
  }

  for (const command of commandsExecuted || []) {
    const gitCloneMatch = command.match(/\bgit\s+clone\s+\S+\s+([/~.A-Za-z0-9_./:-]+)/);
    if (gitCloneMatch) {
      addCandidate(paths, gitCloneMatch[1], 'inferred from command evidence', remoteUser);
    }

    for (const match of command.matchAll(/(?:cd|mkdir|touch|cp|mv|rm|git\s+clone|npm|python|node)\s+([/~.A-Za-z0-9_./:-]+)/g)) {
      addCandidate(paths, match[1], 'inferred from command evidence', remoteUser);
    }
  }

  return Array.from(paths.values());
}

function addCandidate(paths, rawPath, reason, remoteUser) {
  const normalized = normalizeRemotePath(rawPath, remoteUser);
  if (!normalized || normalized === '/' || normalized === '~') return;
  if (!paths.has(normalized)) {
    paths.set(normalized, { path: normalized, reason });
  }
}

function normalizeRemotePath(value, remoteUser) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.startsWith('~/')) {
    if (!/^[a-z_][a-z0-9_-]*[$]?$/i.test(remoteUser || '')) return null;
    const home = remoteUser === 'root' ? '/root' : `/home/${remoteUser}`;
    return path.posix.normalize(`${home}/${cleaned.slice(2)}`);
  }
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

function validateSshTarget({ host, user, port, identity_file }) {
  if (typeof host !== 'string' || host.length === 0 || host.startsWith('-') || host.includes('@') || !/^[A-Za-z0-9_.:[\]%-]+$/.test(host)) {
    throw new Error('host must be a hostname, SSH alias, or IP address without whitespace, @, or option prefixes');
  }
  if (typeof user !== 'string' || !/^[a-z_][a-z0-9_-]*[$]?$/i.test(user)) {
    throw new Error('user must be a POSIX account name');
  }
  const normalizedPort = Number(port);
  if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65_535) {
    throw new Error('port must be an integer between 1 and 65535');
  }
  if (identity_file !== undefined && (typeof identity_file !== 'string' || identity_file.length === 0 || /[\0\r\n]/.test(identity_file))) {
    throw new Error('identity_file must be a non-empty single-line path');
  }
  return { host, user, port: normalizedPort, identity_file };
}

function validateEvidence({ session_id, paths_visited, commands_executed, preserve_days, max_items }) {
  if (typeof session_id !== 'string' || session_id.length === 0 || session_id.length > 200 || /[\0\r\n]/.test(session_id)) {
    throw new Error('session_id must be a non-empty single-line string up to 200 characters');
  }
  if (!Array.isArray(paths_visited) || !paths_visited.every(value => typeof value === 'string')) {
    throw new Error('paths_visited must be an array of strings');
  }
  if (!Array.isArray(commands_executed) || !commands_executed.every(value => typeof value === 'string')) {
    throw new Error('commands_executed must be an array of strings');
  }
  const normalizedPreserveDays = Number(preserve_days);
  if (!Number.isFinite(normalizedPreserveDays) || normalizedPreserveDays < -1 || normalizedPreserveDays > 36_500) {
    throw new Error('preserve_days must be between -1 and 36500');
  }
  const normalizedMaxItems = Number(max_items);
  if (!Number.isInteger(normalizedMaxItems) || normalizedMaxItems < 1 || normalizedMaxItems > 500) {
    throw new Error('max_items must be an integer between 1 and 500');
  }
  return {
    session_id,
    paths_visited,
    commands_executed,
    preserve_days: normalizedPreserveDays,
    max_items: normalizedMaxItems
  };
}
