import { promises as fs } from 'fs';
import path from 'path';
import { SafetyPolicyManager } from '../../safety-policy.js';

const RISKY_PATTERNS = [
  { id: 'direct-delete', regex: /\brm\s+-rf\b|\bfind\b.*-delete\b/, severity: 'high', message: 'Direct destructive cleanup command' },
  { id: 'secret-literal', regex: /(password|token|api[_-]?key|secret)\s*[:=]\s*["']?[^"'\s]+/i, severity: 'high', message: 'Possible secret literal' },
  { id: 'hardcoded-root-path', regex: /\/root\/[A-Za-z0-9_.-]+/, severity: 'medium', message: 'Hardcoded root-owned deployment path' },
  { id: 'unsafe-cron', regex: /\bcron\b|\bcrontab\b/i, severity: 'low', message: 'Cron change should go through 5s_cron_manager' }
];

export function createPokaYokeTool(options = {}) {
  const policy = options.policy || new SafetyPolicyManager();

  return {
    name: 'poka_yoke_guard',
    description: 'Poka-Yoke error prevention. Scans, suggests, and validates prevention controls without editing files.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['scan', 'suggest', 'validate'],
          description: 'Poka-Yoke action'
        },
        target_path: {
          type: 'string',
          default: '.'
        },
        max_files: {
          type: 'number',
          default: 100
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, target_path = '.', max_files = 100 } = args;
      const targetPath = path.resolve(target_path);

      switch (action) {
        case 'scan':
          return await scanForRisks(targetPath, max_files, policy);
        case 'suggest': {
          const scan = await scanForRisks(targetPath, max_files, policy);
          return { ...scan, action: 'suggest', suggestions: buildSuggestions(scan.findings) };
        }
        case 'validate': {
          const scan = await scanForRisks(targetPath, max_files, policy);
          return {
            timestamp: new Date().toISOString(),
            action: 'validate',
            target_path: targetPath,
            passed: scan.findings.filter(item => item.severity === 'high').length === 0,
            high_findings: scan.findings.filter(item => item.severity === 'high').length,
            findings: scan.findings
          };
        }
        default:
          throw new Error(`Unknown Poka-Yoke action: ${action}`);
      }
    }
  };
}

async function scanForRisks(targetPath, maxFiles, policy) {
  const verdict = await policy.evaluateOperation({
    command: `read ${targetPath}`,
    paths: [targetPath],
    destructive: false
  });
  if (verdict.risk_level === 'P4_FORBIDDEN') {
    throw new Error(`Target path is denied by policy: ${verdict.reasons.join('; ')}`);
  }

  const files = await listTextFiles(targetPath, maxFiles);
  const findings = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8').catch(() => '');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      for (const pattern of RISKY_PATTERNS) {
        if (pattern.regex.test(line)) {
          findings.push({
            id: `${pattern.id}-${findings.length + 1}`,
            rule: pattern.id,
            severity: pattern.severity,
            file,
            line: index + 1,
            message: pattern.message,
            approval_level: approvalForSeverity(pattern.severity)
          });
        }
      }
    });
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'scan',
    target_path: targetPath,
    files_scanned: files.length,
    findings
  };
}

function buildSuggestions(findings) {
  const grouped = new Map();
  for (const finding of findings) {
    if (!grouped.has(finding.rule)) {
      grouped.set(finding.rule, {
        rule: finding.rule,
        severity: finding.severity,
        count: 0,
        prevention: preventionForRule(finding.rule),
        suggested_plan: suggestedPlanForRule(finding.rule)
      });
    }
    grouped.get(finding.rule).count += 1;
  }
  return Array.from(grouped.values());
}

function preventionForRule(rule) {
  return {
    'direct-delete': 'Route cleanup through seiso_clean_system plan/stage/apply.',
    'secret-literal': 'Move secrets to a secret manager or environment-specific vault.',
    'hardcoded-root-path': 'Parameterize deployment paths through config or tool arguments.',
    'unsafe-cron': 'Manage schedules through 5s_cron_manager.'
  }[rule] || 'Add validation before execution.';
}

function suggestedPlanForRule(rule) {
  if (rule === 'direct-delete') return { tool: 'seiso_clean_system', action: 'plan' };
  if (rule === 'unsafe-cron') return { tool: '5s_cron_manager', action: 'validate' };
  return { tool: 'kaizen_improve', action: 'track' };
}

function approvalForSeverity(severity) {
  return {
    high: 'P3_HIGH',
    medium: 'P2_MEDIUM',
    low: 'P1_LOW'
  }[severity] || 'P1_LOW';
}

async function listTextFiles(root, limit) {
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
      if (entry.isFile() && /\.(js|ts|json|md|sh|yaml|yml|env|conf|service)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  await visit(root);
  return results;
}
