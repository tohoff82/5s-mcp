import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { SafetyPolicyManager } from '../../safety-policy.js';

const execFileAsync = promisify(execFile);

const DEFAULT_CRON_PATH = '/etc/cron.d/5s-methodology';

export function createCronManagerTool() {
  const policy = new SafetyPolicyManager();

  return {
    name: '5s_cron_manager',
    description: 'Manage 5S cron schedules without server-specific paths. Supports install, read, update, remove, validate, and dry-run rendering.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['render', 'install', 'read', 'remove', 'validate'],
          description: 'Cron management action'
        },
        cron_path: {
          type: 'string',
          description: 'Cron file path',
          default: DEFAULT_CRON_PATH
        },
        project_dir: {
          type: 'string',
          description: 'Directory containing this 5S MCP checkout'
        },
        node_bin: {
          type: 'string',
          description: 'Node.js binary path',
          default: 'node'
        },
        user: {
          type: 'string',
          description: 'Cron user field for /etc/cron.d files',
          default: 'root'
        },
        jobs: {
          type: 'array',
          description: 'Cron jobs to render/install',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              schedule: { type: 'string' },
              command: { type: 'string' },
              enabled: { type: 'boolean' },
              description: { type: 'string' }
            },
            required: ['id', 'schedule', 'command']
          }
        },
        dry_run: {
          type: 'boolean',
          default: true
        },
        reload_service: {
          type: 'boolean',
          default: false
        }
      },
      required: ['action']
    },

    async execute(args) {
      const {
        action,
        cron_path = DEFAULT_CRON_PATH,
        project_dir = process.cwd(),
        node_bin = 'node',
        user = 'root',
        jobs,
        dry_run = true,
        reload_service = false
      } = args;

      switch (action) {
        case 'render': {
          const rendered = await renderCron({ project_dir, node_bin, user, jobs });
          return { timestamp: new Date().toISOString(), action, dry_run: true, cron_path, rendered };
        }

        case 'validate': {
          const rendered = await renderCron({ project_dir, node_bin, user, jobs });
          return { timestamp: new Date().toISOString(), action, valid: true, cron_path, rendered };
        }

        case 'read':
          return await readCron(cron_path);

        case 'install': {
          const rendered = await renderCron({ project_dir, node_bin, user, jobs });
          const verdict = await policy.evaluateOperation({
            command: `write ${cron_path}`,
            paths: [cron_path],
            destructive: true,
            approved: dry_run === false
          });

          if (!verdict.allowed && !dry_run) {
            throw new Error(`Cron install blocked by policy: ${verdict.reasons.join('; ')}`);
          }

          if (dry_run) {
            return { timestamp: new Date().toISOString(), action, dry_run, cron_path, rendered, verdict };
          }

          await fs.mkdir(path.dirname(cron_path), { recursive: true });
          await fs.writeFile(cron_path, rendered, { mode: 0o644 });
          if (reload_service) {
            await reloadCronService();
          }
          return { timestamp: new Date().toISOString(), action, dry_run, cron_path, installed: true, reloaded: reload_service };
        }

        case 'remove': {
          if (dry_run) {
            return { timestamp: new Date().toISOString(), action, dry_run, cron_path, would_remove: true };
          }
          await fs.rm(cron_path, { force: true });
          if (reload_service) {
            await reloadCronService();
          }
          return { timestamp: new Date().toISOString(), action, dry_run, cron_path, removed: true, reloaded: reload_service };
        }

        default:
          throw new Error(`Unknown cron action: ${action}`);
      }
    }
  };
}

async function renderCron({ project_dir, node_bin, user, jobs }) {
  const resolvedProjectDir = path.resolve(project_dir);
  await fs.access(resolvedProjectDir);

  const resolvedJobs = jobs && jobs.length > 0 ? jobs : defaultJobs(resolvedProjectDir, node_bin);
  const lines = [
    '# Managed by 5s_cron_manager. Edit through MCP tool to preserve auditability.',
    'SHELL=/bin/sh',
    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    ''
  ];

  for (const job of resolvedJobs) {
    validateJob(job);
    if (job.description) lines.push(`# ${job.description}`);
    const prefix = job.enabled === false ? '# ' : '';
    lines.push(`${prefix}${job.schedule} ${user} ${job.command}`);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function defaultJobs(projectDir, nodeBin) {
  const quotedDir = shellQuote(projectDir);
  const quotedNode = shellQuote(nodeBin);
  return [
    {
      id: 'daily-health',
      schedule: '0 6 * * *',
      command: `cd ${quotedDir} && ${quotedNode} src/mcp-server/tools/shitsuke.js health >> /var/log/5s-daily.log 2>&1`,
      description: 'Daily read-only 5S health check'
    },
    {
      id: 'weekly-audit',
      schedule: '0 23 * * 0',
      command: `cd ${quotedDir} && ${quotedNode} src/mcp-server/tools/shitsuke.js audit >> /var/log/5s-audit.log 2>&1`,
      description: 'Weekly read-only 5S audit'
    }
  ];
}

function validateJob(job) {
  if (!/^[a-z0-9][a-z0-9-_.]+$/i.test(job.id)) {
    throw new Error(`Invalid cron job id: ${job.id}`);
  }
  if (!/^(@(hourly|daily|weekly|monthly|yearly|reboot)|(\S+\s+){4}\S+)$/.test(job.schedule)) {
    throw new Error(`Invalid cron schedule for ${job.id}: ${job.schedule}`);
  }
  if (/\b(rm|find\s+.*-delete|autoremove|purge|drop_caches|mkfs|shutdown|reboot)\b/.test(job.command)) {
    throw new Error(`Refusing destructive cron command for ${job.id}. Use staged 5S plans instead.`);
  }
}

async function readCron(cronPath) {
  try {
    const content = await fs.readFile(cronPath, 'utf8');
    return { timestamp: new Date().toISOString(), action: 'read', cron_path: cronPath, exists: true, content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { timestamp: new Date().toISOString(), action: 'read', cron_path: cronPath, exists: false, content: '' };
    }
    throw error;
  }
}

async function reloadCronService() {
  try {
    await execFileAsync('systemctl', ['reload', 'cron']);
    return 'cron';
  } catch {
    await execFileAsync('systemctl', ['reload', 'crond']);
    return 'crond';
  }
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
