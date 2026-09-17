import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { SafetyPolicyManager } from './safety-policy.js';

const execFileAsync = promisify(execFile);

const DEFAULT_PLANS_DIR = '/tmp/5s-plans';
const DEFAULT_BACKUP_DIR = '/backup/5s';
const SKIP_SUFFIXES = ['.pid', '.sock', '.lock'];

export class MaintenanceExecutionEngine {
  constructor(options = {}) {
    this.plansDir = options.plansDir || process.env.FIVE_S_PLANS_DIR || DEFAULT_PLANS_DIR;
    this.backupDir = options.backupDir || process.env.FIVE_S_BACKUP_DIR || DEFAULT_BACKUP_DIR;
    this.policy = options.policy || new SafetyPolicyManager();
    this.targetProfile = normalizeTargetProfile(options.targetProfile);
  }

  async observe(targets, options = {}) {
    const normalizedTargets = normalizeTargets(targets, this.targetProfile);
    const observations = {};

    for (const target of normalizedTargets) {
      if (this.targetProfile) {
        observations[target] = await this.observePath(this.targetProfile.targets[target].root);
        continue;
      }
      if (target === 'temp') observations.temp = await this.observePath('/tmp');
      if (target === 'logs') observations.logs = await this.observePath('/var/log');
      if (target === 'trash') observations.trash = await this.observeTrash();
      if (target === 'cache') observations.cache = await this.observeCache();
      if (target === 'journal') observations.journal = await this.observeJournal();
      if (target === 'packages') observations.packages = await this.observePackages();
    }

    return {
      timestamp: new Date().toISOString(),
      mode: 'observe',
      targets: normalizedTargets,
      preserve_days: options.preserve_days ?? 7,
      observations
    };
  }

  async createPlan(targets, options = {}) {
    const normalizedTargets = normalizeTargets(targets, this.targetProfile);
    const preserveDays = options.preserve_days ?? 7;
    const aggressiveLevel = options.aggressive_level ?? 2;
    const plan = {
      id: `5s-plan-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${crypto.randomBytes(3).toString('hex')}`,
      created_at: new Date().toISOString(),
      mode: 'plan',
      targets: normalizedTargets,
      options: {
        preserve_days: preserveDays,
        aggressive_level: aggressiveLevel
      },
      manifest: [],
      operations: [],
      summary: {
        candidates: 0,
        no_candidates: 0,
        runnable: 0,
        blocked: 0,
        estimated_bytes: 0
      },
      verification: {
        before: await this.captureVerification()
      }
    };

    for (const target of normalizedTargets) {
      const operations = await this.planTarget(target, { preserveDays, aggressiveLevel });
      plan.operations.push(...operations);
    }

    for (const operation of plan.operations) {
      operation.verdict = await this.policy.evaluateOperation({
        command: operation.command,
        paths: operation.paths || [],
        destructive: operation.destructive === true,
        approved: false
      });
      operation.risk = operation.verdict.risk;
      if (operation.manifest) {
        plan.manifest.push(...operation.manifest);
      }
    }

    plan.summary.candidates = plan.operations.length;
    plan.summary.no_candidates = plan.operations.filter(operation => operation.status === 'no_candidates').length;
    plan.summary.runnable = plan.operations.filter(operation => operation.kind !== 'noop' && operation.verdict.allowed).length;
    plan.summary.blocked = plan.operations.filter(operation => operation.kind !== 'noop' && !operation.verdict.allowed).length;
    plan.summary.estimated_bytes = plan.manifest.reduce((sum, item) => sum + (item.size_bytes || 0), 0);

    await this.savePlan(plan);
    return plan;
  }

  async stagePlan(planId, options = {}) {
    const plan = await this.loadPlan(planId);
    const selection = selectPlanOperations(plan, options.operationIds);
    const stagedScope = scopePlanToOperations(plan, selection.operations);
    const artifactPath = await this.writeArtifact(stagedScope);
    const backup = await this.createBackup(stagedScope);
    if (backup.required && !backup.created) {
      const failed = {
        ...plan,
        mode: 'stage_failed',
        stage_failed_at: new Date().toISOString(),
        stage_attempt: {
          artifact_path: artifactPath,
          backup,
          operation_ids: selection.ids,
          explicit_operation_subset: selection.explicit
        }
      };
      await this.savePlan(failed);
      throw new Error(`Required backup was not created: ${backup.error || 'unknown backup failure'}`);
    }
    const staged = {
      ...plan,
      mode: 'stage',
      staged_at: new Date().toISOString(),
      stage: {
        artifact_path: artifactPath,
        backup,
        operation_ids: selection.ids,
        explicit_operation_subset: selection.explicit
      }
    };
    await this.savePlan(staged);
    return staged;
  }

  async applyPlan(planId, options = {}) {
    if (options.approved !== true) {
      throw new Error('approved=true is required to apply a maintenance plan');
    }

    const plan = await this.loadPlan(planId);
    if (!plan.stage) {
      throw new Error('Plan must be staged before apply');
    }
    if (plan.stage.backup?.required && !plan.stage.backup.created) {
      throw new Error('Plan backup is required but was not created');
    }

    const selection = selectPlanOperations(plan, options.operationIds);
    if (plan.stage.explicit_operation_subset) {
      if (!selection.explicit) {
        throw new Error('operationIds is required to apply an explicitly staged operation subset');
      }
      if (!sameOperationIds(selection.ids, plan.stage.operation_ids || [])) {
        throw new Error('Apply operationIds must exactly match the staged operation subset');
      }
    }

    const before = await this.captureVerification();
    const selectedIds = new Set(selection.ids);
    const results = plan.operations
      .filter(operation => !selectedIds.has(operation.id))
      .map(operation => ({ id: operation.id, skipped: true, reason: 'Not selected for execution' }));

    for (const operation of selection.operations) {
      const verdict = await this.policy.evaluateOperation({
        command: operation.command,
        paths: operation.paths || [],
        destructive: operation.destructive === true,
        approved: true
      });

      if (!verdict.allowed) {
        results.push({ id: operation.id, skipped: true, reason: verdict.reasons.join('; ') });
        continue;
      }

      if (operation.kind === 'noop') {
        results.push({ id: operation.id, skipped: true, reason: operation.status || 'No candidates' });
      } else if (operation.kind === 'file_remove') {
        results.push(...await this.applyFileOperation(operation));
      } else if (operation.kind === 'command') {
        results.push(await this.applyCommandOperation(operation));
      }
    }

    const after = await this.captureVerification();
    const applied = {
      ...plan,
      mode: 'apply',
      applied_at: new Date().toISOString(),
      verification: { before, after },
      results,
      execution_scope: {
        operation_ids: selection.ids,
        explicit_operation_subset: selection.explicit
      },
      space_freed_bytes: results.reduce((sum, item) => sum + (item.removed_bytes || 0), 0)
    };
    await this.savePlan(applied);
    return applied;
  }

  async planTarget(target, options) {
    if (this.targetProfile) {
      const profileTarget = this.targetProfile.targets[target];
      return [await this.planFileRemoval(`profile_${target}`, profileTarget.root, options.preserveDays, profileTarget.patterns)];
    }

    switch (target) {
      case 'logs':
        return [await this.planFileRemoval('old_rotated_logs', '/var/log', options.preserveDays, ['*.log.*', '*.log.gz', '*.gz'])];
      case 'temp':
        return [await this.planFileRemoval('old_tmp_files', '/tmp', options.preserveDays, ['*'])];
      case 'trash':
        return await this.planTrash();
      case 'cache':
        return this.planCache(options.aggressiveLevel);
      case 'packages':
        return this.planPackages(options.aggressiveLevel);
      case 'journal':
        return [this.planCommand('journal_vacuum', 'journalctl', [`--vacuum-time=${Math.max(options.preserveDays, 30)}d`], 'Vacuum systemd journal with minimum 30 day retention')];
      default:
        return [];
    }
  }

  async planFileRemoval(type, root, preserveDays, namePatterns) {
    const candidates = await this.findFileCandidates(root, preserveDays, namePatterns);
    if (candidates.length === 0) {
      return {
        id: `${type}-${crypto.randomBytes(3).toString('hex')}`,
        kind: 'noop',
        type,
        status: 'no_candidates',
        description: `No ${type} candidates under ${root} older than ${preserveDays} days`,
        command: `manifest-remove ${type}`,
        paths: [],
        destructive: false,
        manifest: []
      };
    }

    return {
      id: `${type}-${crypto.randomBytes(3).toString('hex')}`,
      kind: 'file_remove',
      type,
      description: `Remove ${type} under ${root} older than ${preserveDays} days`,
      command: `manifest-remove ${type}`,
      paths: candidates.map(item => item.path),
      destructive: true,
      manifest: candidates
    };
  }

  async planTrash() {
    const roots = [
      path.join(os.homedir(), '.local', 'share', 'Trash', 'files'),
      path.join(os.homedir(), '.trash')
    ];
    const operations = [];
    for (const root of roots) {
      try {
        await fs.access(root);
        operations.push(await this.planFileRemoval('trash_files', root, 0, ['*']));
      } catch {
        // Missing trash locations are fine.
      }
    }
    return operations;
  }

  planCache(aggressiveLevel) {
    const operations = [this.planCommand('apt_clean', 'apt', ['clean'], 'Clean APT package cache')];
    if (aggressiveLevel >= 2) {
      operations.push(this.planCommand('npm_cache_verify', 'npm', ['cache', 'verify'], 'Verify npm cache without destructive cleanup', false));
    }
    if (aggressiveLevel >= 3) {
      operations.push(this.planCommand('apt_autoclean', 'apt', ['autoclean'], 'Clean obsolete APT cache packages'));
    }
    return operations;
  }

  planPackages(aggressiveLevel) {
    if (aggressiveLevel < 4) {
      return [this.planCommand('apt_autoremove_dry_run', 'apt', ['autoremove', '--dry-run'], 'Report autoremovable packages only', false)];
    }
    return [this.planCommand('apt_autoremove', 'apt', ['autoremove', '--purge', '-y'], 'Remove autoremovable packages after explicit high-risk approval')];
  }

  planCommand(type, executable, args, description, destructive = true) {
    return {
      id: `${type}-${crypto.randomBytes(3).toString('hex')}`,
      kind: 'command',
      type,
      description,
      executable,
      args,
      command: [executable, ...args].join(' '),
      paths: commandPaths(executable, args),
      destructive,
      manifest: []
    };
  }

  async findFileCandidates(root, preserveDays, namePatterns) {
    const files = await walkFiles(root, 3_000);
    const now = Date.now();
    const minAgeMs = preserveDays * 24 * 60 * 60 * 1000;
    const candidates = [];

    for (const filePath of files) {
      let stat;
      try {
        stat = await fs.lstat(filePath);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      if (stat.isSymbolicLink()) continue;
      if (SKIP_SUFFIXES.some(suffix => filePath.endsWith(suffix))) continue;
      if (!matchesAnyPattern(path.basename(filePath), namePatterns)) continue;
      if (preserveDays > 0 && now - stat.mtimeMs < minAgeMs) continue;

      const usage = await this.checkFileUsage(filePath);
      candidates.push({
        id: `item-${crypto.createHash('sha1').update(filePath).digest('hex').slice(0, 12)}`,
        path: filePath,
        size_bytes: stat.size,
        mtime: stat.mtime.toISOString(),
        mtime_epoch: Math.floor(stat.mtimeMs / 1000),
        owner_uid: stat.uid,
        group_gid: stat.gid,
        inode: stat.ino,
        is_symlink: stat.isSymbolicLink(),
        file_type: 'file',
        in_use: usage.in_use,
        usage,
        eligible: !usage.in_use
      });
    }

    return candidates.filter(item => item.eligible);
  }

  async checkFileUsage(filePath) {
    const usage = { in_use: false, lsof: null, fuser: null };
    try {
      const { stdout } = await execFileAsync('lsof', ['--', filePath], { timeout: 3000, maxBuffer: 64 * 1024 });
      usage.lsof = stdout.trim();
      usage.in_use = Boolean(usage.lsof);
    } catch {
      usage.lsof = '';
    }
    try {
      const { stdout } = await execFileAsync('fuser', [filePath], { timeout: 3000, maxBuffer: 64 * 1024 });
      usage.fuser = stdout.trim();
      usage.in_use = usage.in_use || Boolean(usage.fuser);
    } catch {
      usage.fuser = '';
    }
    return usage;
  }

  async applyFileOperation(operation) {
    const results = [];
    for (const item of operation.manifest || []) {
      try {
        await fs.rm(item.path, { force: true });
        results.push({ id: item.id, operation: operation.id, path: item.path, removed: true, removed_bytes: item.size_bytes || 0 });
      } catch (error) {
        results.push({ id: item.id, operation: operation.id, path: item.path, removed: false, error: error.message });
      }
    }
    return results;
  }

  async applyCommandOperation(operation) {
    try {
      const { stdout, stderr } = await execFileAsync(operation.executable, operation.args || [], { timeout: 120000, maxBuffer: 1024 * 1024 });
      return { id: operation.id, operation: operation.type, executed: true, stdout: stdout.trim(), stderr: stderr.trim(), removed_bytes: 0 };
    } catch (error) {
      return { id: operation.id, operation: operation.type, executed: false, error: error.message, removed_bytes: 0 };
    }
  }

  async createBackup(plan) {
    const files = plan.manifest?.map(item => item.path) || [];
    if (files.length === 0) {
      return { required: false, created: false, reason: 'No file manifest items require backup' };
    }

    await fs.mkdir(this.backupDir, { recursive: true });
    const listPath = path.join(this.backupDir, `${plan.id}-files.txt`);
    const archivePath = path.join(this.backupDir, `${plan.id}.tar.gz`);
    await fs.writeFile(listPath, files.join('\n'));

    try {
      await execFileAsync('tar', ['-czf', archivePath, '-T', listPath], { timeout: 120000, maxBuffer: 1024 * 1024 });
      return { required: true, created: true, archive_path: archivePath, file_list: listPath, files: files.length };
    } catch (error) {
      return { required: true, created: false, file_list: listPath, files: files.length, error: error.message };
    }
  }

  async captureVerification() {
    const [disk, memory, services] = await Promise.all([
      safeExec('df', ['-k', '/']),
      safeExec('free', ['-m']),
      Promise.all(['ssh', 'cron', 'systemd-resolved'].map(async service => ({
        service,
        status: (await safeExec('systemctl', ['is-active', service])).stdout.trim() || 'unknown'
      })))
    ]);
    return {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      disk: disk.stdout.trim(),
      memory: memory.stdout.trim(),
      protected_services: services
    };
  }

  async observePath(root) {
    const du = await safeExec('du', ['-sh', root]);
    const df = await safeExec('df', ['-h', root]);
    return { root, size: du.stdout.trim(), filesystem: df.stdout.trim() };
  }

  async observeTrash() {
    return await Promise.all([
      path.join(os.homedir(), '.local', 'share', 'Trash'),
      path.join(os.homedir(), '.trash')
    ].map(root => this.observePath(root)));
  }

  async observeCache() {
    return await Promise.all(['/var/cache/apt', path.join(os.homedir(), '.npm'), path.join(os.homedir(), '.cache', 'pip')].map(root => this.observePath(root)));
  }

  async observeJournal() {
    const usage = await safeExec('journalctl', ['--disk-usage']);
    return { usage: usage.stdout.trim() || usage.stderr.trim() };
  }

  async observePackages() {
    const audit = await safeExec('dpkg', ['--audit']);
    const autoremove = await safeExec('apt', ['autoremove', '--dry-run']);
    return { dpkg_audit: audit.stdout.trim(), autoremove: autoremove.stdout.trim() };
  }

  async writeArtifact(plan) {
    await fs.mkdir(this.plansDir, { recursive: true });
    const artifactPath = path.join(this.plansDir, `${plan.id}-dry-run.json`);
    await fs.writeFile(artifactPath, JSON.stringify(plan, null, 2));
    return artifactPath;
  }

  async savePlan(plan) {
    await fs.mkdir(this.plansDir, { recursive: true });
    await fs.writeFile(path.join(this.plansDir, `${plan.id}.json`), JSON.stringify(plan, null, 2));
  }

  async loadPlan(planId) {
    const data = await fs.readFile(path.join(this.plansDir, `${planId}.json`), 'utf8');
    return JSON.parse(data);
  }
}

function selectPlanOperations(plan, operationIds) {
  const operations = Array.isArray(plan.operations) ? plan.operations : [];
  if (operationIds === undefined) {
    return { operations, ids: operations.map(operation => operation.id), explicit: false };
  }
  if (!Array.isArray(operationIds)) {
    throw new Error('operationIds must be an array when provided');
  }
  if (operationIds.some(id => typeof id !== 'string' || id.length === 0)) {
    throw new Error('operationIds must contain non-empty strings');
  }
  const unique = [...new Set(operationIds)];
  if (unique.length !== operationIds.length) {
    throw new Error('operationIds must not contain duplicates');
  }
  const byId = new Map(operations.map(operation => [operation.id, operation]));
  const unknown = unique.filter(id => !byId.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown operation id: ${unknown.join(', ')}`);
  }
  return { operations: unique.map(id => byId.get(id)), ids: unique, explicit: true };
}

function scopePlanToOperations(plan, operations) {
  return {
    ...plan,
    operations,
    manifest: operations.flatMap(operation => operation.manifest || [])
  };
}

function sameOperationIds(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every(id => rightSet.has(id));
}

function normalizeTargets(targets, targetProfile = null) {
  const input = Array.isArray(targets) ? targets : [targets || 'all'];

  if (targetProfile) {
    const registered = Object.keys(targetProfile.targets);
    const normalized = input.includes('all') ? registered : input;
    const unknown = normalized.filter(target => !Object.hasOwn(targetProfile.targets, target));
    if (unknown.length > 0) {
      throw new Error(`Target is not registered in target profile: ${unknown.join(', ')}`);
    }
    return normalized;
  }

  if (input.includes('all')) return ['cache', 'logs', 'temp', 'packages', 'journal', 'trash'];
  return input;
}

function normalizeTargetProfile(profile) {
  if (profile === undefined || profile === null) return null;
  if (typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('targetProfile must be an object');
  }
  if (typeof profile.root !== 'string' || !path.isAbsolute(profile.root)) {
    throw new Error('targetProfile.root must be an absolute path');
  }
  if (!profile.targets || typeof profile.targets !== 'object' || Array.isArray(profile.targets)) {
    throw new Error('targetProfile.targets must be an object');
  }

  const root = path.resolve(profile.root);
  const entries = Object.entries(profile.targets);
  if (entries.length === 0) {
    throw new Error('targetProfile.targets must contain at least one target');
  }

  const normalizedTargets = {};
  for (const [name, rawDescriptor] of entries) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
      throw new Error(`Invalid target profile name: ${name}`);
    }

    const descriptor = typeof rawDescriptor === 'string'
      ? { path: rawDescriptor }
      : rawDescriptor;
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
      throw new Error(`Invalid target profile descriptor: ${name}`);
    }
    if (typeof descriptor.path !== 'string' || descriptor.path.trim() === '' || path.isAbsolute(descriptor.path)) {
      throw new Error(`Target profile path must be a relative path: ${name}`);
    }

    const resolvedRoot = path.resolve(root, descriptor.path);
    if (resolvedRoot !== root && !resolvedRoot.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Target profile path escapes root: ${name}`);
    }

    const patterns = descriptor.patterns ?? ['*'];
    if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some(pattern => typeof pattern !== 'string' || pattern.length === 0)) {
      throw new Error(`Target profile patterns must be a non-empty string array: ${name}`);
    }

    normalizedTargets[name] = { root: resolvedRoot, patterns: [...patterns] };
  }

  return { root, targets: Object.freeze(normalizedTargets) };
}

async function walkFiles(root, limit) {
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
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        results.push(fullPath);
      }
    }
  }
  await visit(root);
  return results;
}

function matchesAnyPattern(fileName, patterns) {
  if (patterns.includes('*')) return true;
  return patterns.some(pattern => {
    const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    return regex.test(fileName);
  });
}

function commandPaths(executable, args) {
  if (executable === 'apt') return ['/var/cache/apt'];
  if (executable === 'journalctl') return ['/var/log/journal'];
  if (executable === 'npm') return [path.join(os.homedir(), '.npm')];
  return [];
}

async function safeExec(command, args) {
  try {
    return await execFileAsync(command, args, { timeout: 10000, maxBuffer: 512 * 1024 });
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}
