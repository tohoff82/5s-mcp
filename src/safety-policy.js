import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_POLICY = {
  version: '1.0.0',
  updated_at: null,
  defaults: {
    dry_run_required: true,
    approval_required_for_risk: 'medium',
    max_risk_without_approval: 'low'
  },
  deny: [
    { id: 'deny-ui-agent-root', type: 'path_prefix', value: '/root/ui-agent', reason: 'Self-referential agent runtime' },
    { id: 'deny-systemd-units', type: 'path_prefix', value: '/etc/systemd/system', reason: 'System service definitions' },
    { id: 'deny-ssh-config', type: 'path_prefix', value: '/etc/ssh', reason: 'SSH access and recovery path' },
    { id: 'deny-nginx-config', type: 'path_prefix', value: '/etc/nginx', reason: 'Reverse proxy configuration' },
    { id: 'deny-mongodb-data', type: 'path_prefix', value: '/var/lib/mongodb', reason: 'MongoDB data files' },
    { id: 'deny-rabbitmq-data', type: 'path_prefix', value: '/var/lib/rabbitmq', reason: 'RabbitMQ data files' },
    { id: 'deny-root-delete', type: 'command_regex', value: '\\brm\\s+-rf\\s+/(\\s|$)', reason: 'Recursive delete of root filesystem' },
    { id: 'deny-systemd-delete', type: 'command_regex', value: '\\bfind\\s+/etc/systemd\\b.*\\b-delete\\b', reason: 'Deleting systemd files' }
  ],
  allow: [
    { id: 'allow-apt-cache', type: 'path_prefix', value: '/var/cache/apt', reason: 'Package cache cleanup' },
    { id: 'allow-var-tmp-old', type: 'path_prefix', value: '/var/tmp', min_age_days: 7, reason: 'Old temporary files' },
    { id: 'allow-tmp-old', type: 'path_prefix', value: '/tmp', min_age_days: 7, reason: 'Old temporary files' },
    { id: 'allow-rotated-logs', type: 'path_glob', value: '/var/log/**/*.gz', min_age_days: 30, reason: 'Old rotated compressed logs' },
    { id: 'allow-journal-vacuum', type: 'command_regex', value: '^journalctl\\s+--vacuum-time=([3-9][0-9]|[1-9][0-9]{2,})d$', reason: 'Journal retention at least 30 days' },
    { id: 'allow-apt-clean', type: 'command_regex', value: '^apt\\s+(auto)?clean\\b', reason: 'APT cache cleanup' }
  ],
  protected_services: ['ssh', 'cron', 'systemd-resolved'],
  remote_cleanup: {
    allowed_roots: ['/tmp', '/var/tmp', '/home'],
    denied_roots: ['/etc', '/usr', '/bin', '/sbin', '/lib', '/lib64', '/var/lib', '/root/.ssh'],
    default_preserve_days: 1
  }
};

export class SafetyPolicyManager {
  constructor(configPath = path.join(__dirname, '..', 'config', 'safety-policy.json')) {
    this.configPath = configPath;
  }

  async ensurePolicy() {
    try {
      await fs.access(this.configPath);
    } catch {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      const policy = { ...DEFAULT_POLICY, updated_at: new Date().toISOString() };
      await fs.writeFile(this.configPath, JSON.stringify(policy, null, 2));
    }
  }

  async loadPolicy() {
    await this.ensurePolicy();
    const data = await fs.readFile(this.configPath, 'utf8');
    return JSON.parse(data);
  }

  async savePolicy(policy) {
    const next = {
      ...policy,
      updated_at: new Date().toISOString()
    };
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(next, null, 2));
    return next;
  }

  async listRules(kind = 'all') {
    const policy = await this.loadPolicy();
    return {
      deny: kind === 'allow' ? [] : policy.deny || [],
      allow: kind === 'deny' ? [] : policy.allow || [],
      protected_services: policy.protected_services || [],
      defaults: policy.defaults || {},
      remote_cleanup: policy.remote_cleanup || {}
    };
  }

  async addRule(kind, rule) {
    if (!['deny', 'allow'].includes(kind)) {
      throw new Error('Rule kind must be deny or allow');
    }
    this.validateRule(rule);
    const policy = await this.loadPolicy();
    const rules = policy[kind] || [];
    if (rules.some(existing => existing.id === rule.id)) {
      throw new Error(`Rule id already exists: ${rule.id}`);
    }
    policy[kind] = [...rules, rule];
    return await this.savePolicy(policy);
  }

  async removeRule(kind, id) {
    if (!['deny', 'allow'].includes(kind)) {
      throw new Error('Rule kind must be deny or allow');
    }
    const policy = await this.loadPolicy();
    const before = policy[kind] || [];
    const after = before.filter(rule => rule.id !== id);
    if (after.length === before.length) {
      throw new Error(`Rule not found: ${id}`);
    }
    policy[kind] = after;
    return await this.savePolicy(policy);
  }

  async resetPolicy() {
    return await this.savePolicy({ ...DEFAULT_POLICY });
  }

  async evaluateOperation(operation) {
    const policy = await this.loadPolicy();
    const paths = operation.paths || [];
    const command = operation.command || '';
    const matches = {
      denied: [],
      allowed: []
    };

    for (const rule of policy.deny || []) {
      if (this.ruleMatches(rule, { paths, command })) {
        matches.denied.push(rule);
      }
    }

    for (const rule of policy.allow || []) {
      if (this.ruleMatches(rule, { paths, command })) {
        matches.allowed.push(rule);
      }
    }

    const risk = this.calculateRisk(operation, matches);
    const riskLevel = riskToPolicyLevel(risk, operation, matches);
    const approved = operation.approved === true;
    const allowed = matches.denied.length === 0 && (risk !== 'high' && risk !== 'critical' || approved);

    return {
      allowed,
      risk,
      risk_level: riskLevel,
      approval_required: ['medium', 'high', 'critical'].includes(risk),
      matches,
      reasons: this.buildReasons(matches, risk, allowed)
    };
  }

  validateRule(rule) {
    if (!rule || typeof rule !== 'object') {
      throw new Error('Rule must be an object');
    }
    if (!rule.id || !/^[a-z0-9][a-z0-9-_.]+$/i.test(rule.id)) {
      throw new Error('Rule id is required and must be stable');
    }
    if (!['path_prefix', 'path_glob', 'command_regex'].includes(rule.type)) {
      throw new Error('Rule type must be path_prefix, path_glob, or command_regex');
    }
    if (!rule.value || typeof rule.value !== 'string') {
      throw new Error('Rule value is required');
    }
  }

  ruleMatches(rule, operation) {
    if (rule.type === 'command_regex') {
      return Boolean(operation.command && new RegExp(rule.value).test(operation.command));
    }

    const normalizedRulePath = path.posix.normalize(rule.value);
    return operation.paths.some(candidate => {
      const normalizedCandidate = path.posix.normalize(candidate);
      if (rule.type === 'path_prefix') {
        return normalizedCandidate === normalizedRulePath || normalizedCandidate.startsWith(`${normalizedRulePath}/`);
      }
      if (rule.type === 'path_glob') {
        return globLikeMatch(normalizedRulePath, normalizedCandidate);
      }
      return false;
    });
  }

  calculateRisk(operation, matches) {
    if (matches.denied.length > 0) return 'critical';
    if (operation.command && /\bautoremove\b|\b--purge\b|\bdrop_caches\b/.test(operation.command)) return 'high';
    if (operation.paths?.some(candidate => candidate === '/tmp' || candidate.startsWith('/tmp/') || candidate === '/root' || candidate.startsWith('/root/'))) return 'high';
    if (operation.destructive === true && matches.allowed.length === 0) return 'high';
    if (operation.destructive === true) return 'medium';
    if (operation.command && /\b(rm|delete|autoremove|purge|vacuum|drop_caches)\b/.test(operation.command)) return 'medium';
    return 'low';
  }

  buildReasons(matches, risk, allowed) {
    const reasons = [];
    for (const rule of matches.denied) {
      reasons.push(`Denied by ${rule.id}: ${rule.reason || rule.value}`);
    }
    for (const rule of matches.allowed) {
      reasons.push(`Allowed by ${rule.id}: ${rule.reason || rule.value}`);
    }
    reasons.push(`Risk: ${risk}`);
    if (!allowed) {
      reasons.push('Operation is blocked until policy is changed or approval is supplied where applicable');
    }
    return reasons;
  }
}

function globLikeMatch(pattern, candidate) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(candidate);
}

function riskToPolicyLevel(risk, operation, matches) {
  if (risk === 'critical') return 'P4_FORBIDDEN';
  if (risk === 'high') return 'P3_HIGH';
  if (risk === 'medium') return matches.allowed.some(rule => rule.id?.includes('rotated')) ? 'P2_MEDIUM' : 'P1_LOW';
  if (operation.destructive === false) return 'P0_SAFE';
  return 'P0_SAFE';
}
