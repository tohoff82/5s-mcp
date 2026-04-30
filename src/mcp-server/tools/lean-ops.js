import { execFile } from 'child_process';
import { promisify } from 'util';
import { SafetyPolicyManager } from '../../safety-policy.js';

const execFileAsync = promisify(execFile);

export function createLeanOpsTool(options = {}) {
  const policy = options.policy || new SafetyPolicyManager();

  return {
    name: 'lean_ops',
    description: 'Additional Lean tools: muda_detect, jidoka_check, and andon_status for waste, stop conditions, and status boards.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['muda_detect', 'jidoka_check', 'andon_status'],
          description: 'Lean operation'
        },
        target_path: {
          type: 'string',
          default: '.'
        },
        thresholds: {
          type: 'object',
          properties: {
            disk_warning: { type: 'number', default: 80 },
            disk_critical: { type: 'number', default: 90 },
            memory_warning: { type: 'number', default: 85 },
            memory_critical: { type: 'number', default: 95 }
          }
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, target_path = '.', thresholds = {} } = args;
      const normalizedThresholds = {
        disk_warning: thresholds.disk_warning ?? 80,
        disk_critical: thresholds.disk_critical ?? 90,
        memory_warning: thresholds.memory_warning ?? 85,
        memory_critical: thresholds.memory_critical ?? 95
      };

      switch (action) {
        case 'muda_detect':
          return await detectMuda(target_path, policy);
        case 'jidoka_check':
          return await jidokaCheck(target_path, normalizedThresholds, policy);
        case 'andon_status':
          return await andonStatus(target_path, normalizedThresholds, policy);
        default:
          throw new Error(`Unknown Lean ops action: ${action}`);
      }
    }
  };
}

async function detectMuda(targetPath, policy) {
  const verdict = await policy.evaluateOperation({ command: `observe ${targetPath}`, paths: [targetPath], destructive: false });
  const disk = await diskUsage(targetPath);
  const tmp = await safeExec('du', ['-sh', '/tmp']);

  const wastes = [];
  if (disk.percent >= 80) {
    wastes.push({
      type: 'inventory',
      severity: disk.percent >= 90 ? 'high' : 'medium',
      signal: `Disk usage ${disk.percent}%`,
      recommendation: 'Create a Seiso cleanup plan for reclaimable targets.'
    });
  }
  if ((tmp.stdout || '').trim()) {
    wastes.push({
      type: 'motion',
      severity: 'low',
      signal: `Temporary workspace footprint: ${(tmp.stdout || '').trim()}`,
      recommendation: 'Use seiso_clean_system action=plan targets=["temp"] when cleanup is needed.'
    });
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'muda_detect',
    target_path: targetPath,
    policy_verdict: verdict,
    wastes
  };
}

async function jidokaCheck(targetPath, thresholds, policy) {
  const verdict = await policy.evaluateOperation({ command: `observe ${targetPath}`, paths: [targetPath], destructive: false });
  const disk = await diskUsage(targetPath);
  const memory = await memoryUsage();
  const stopConditions = [];

  if (disk.percent >= thresholds.disk_critical) {
    stopConditions.push({ type: 'disk', severity: 'critical', message: `Disk usage ${disk.percent}% exceeds critical threshold` });
  }
  if (memory.percent >= thresholds.memory_critical) {
    stopConditions.push({ type: 'memory', severity: 'critical', message: `Memory usage ${memory.percent}% exceeds critical threshold` });
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'jidoka_check',
    target_path: targetPath,
    should_stop_automation: stopConditions.length > 0,
    stop_conditions: stopConditions,
    disk,
    memory,
    policy_verdict: verdict
  };
}

async function andonStatus(targetPath, thresholds, policy) {
  const jidoka = await jidokaCheck(targetPath, thresholds, policy);
  const muda = await detectMuda(targetPath, policy);
  const state = jidoka.should_stop_automation
    ? 'red'
    : muda.wastes.some(item => item.severity === 'medium' || item.severity === 'high')
      ? 'yellow'
      : 'green';

  return {
    timestamp: new Date().toISOString(),
    action: 'andon_status',
    state,
    summary: {
      stop_conditions: jidoka.stop_conditions.length,
      wastes: muda.wastes.length,
      disk_percent: jidoka.disk.percent,
      memory_percent: jidoka.memory.percent
    },
    jidoka,
    muda
  };
}

async function diskUsage(targetPath) {
  const result = await safeExec('df', ['-P', targetPath]);
  const line = (result.stdout || '').trim().split('\n')[1] || '';
  const parts = line.split(/\s+/);
  const percent = Number((parts[4] || '0').replace('%', '')) || 0;
  return { percent, raw: result.stdout.trim() || result.stderr.trim() };
}

async function memoryUsage() {
  const result = await safeExec('free', ['-m']);
  const line = (result.stdout || '').split('\n').find(item => item.startsWith('Mem:')) || '';
  const parts = line.split(/\s+/);
  const total = Number(parts[1]) || 0;
  const used = Number(parts[2]) || 0;
  const percent = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
  return { percent, total_mb: total, used_mb: used };
}

async function safeExec(command, args) {
  try {
    return await execFileAsync(command, args, { timeout: 10000, maxBuffer: 512 * 1024 });
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}
