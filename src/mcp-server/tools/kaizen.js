import { promises as fs } from 'fs';
import path from 'path';
import { SafetyPolicyManager } from '../../safety-policy.js';

const DEFAULT_BACKLOG = '/tmp/5s-kaizen-backlog.json';

export function createKaizenTool(options = {}) {
  const backlogPath = options.backlogPath || process.env.FIVE_S_KAIZEN_BACKLOG || DEFAULT_BACKLOG;
  const policy = options.policy || new SafetyPolicyManager();

  return {
    name: 'kaizen_improve',
    description: 'Kaizen continuous improvement. Read-only suggestions, backlog tracking, and reports built on 5S safety policy.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['suggest', 'track', 'report'],
          description: 'Kaizen action'
        },
        scope: {
          type: 'string',
          enum: ['repo', 'docs', 'tests', 'cleanup', 'all'],
          default: 'all'
        },
        target_path: {
          type: 'string',
          default: '.'
        },
        initiative: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            source: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            status: { type: 'string', enum: ['open', 'in_progress', 'done', 'blocked'] },
            linked_plan: { type: 'string' }
          }
        },
        status: {
          type: 'string',
          enum: ['open', 'in_progress', 'done', 'blocked']
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, scope = 'all', target_path = '.', initiative, status } = args;

      switch (action) {
        case 'suggest':
          return await suggestImprovements({ scope, targetPath: target_path, policy });
        case 'track':
          return await trackInitiative(backlogPath, initiative);
        case 'report':
          return await reportInitiatives(backlogPath, status);
        default:
          throw new Error(`Unknown Kaizen action: ${action}`);
      }
    }
  };
}

async function suggestImprovements({ scope, targetPath, policy }) {
  const suggestions = [];
  const root = path.resolve(targetPath);

  if (scope === 'repo' || scope === 'all') {
    suggestions.push(...await repoSuggestions(root));
  }
  if (scope === 'docs' || scope === 'all') {
    suggestions.push(...await docsSuggestions(root));
  }
  if (scope === 'tests' || scope === 'all') {
    suggestions.push(...await testSuggestions(root));
  }
  if (scope === 'cleanup' || scope === 'all') {
    const verdict = await policy.evaluateOperation({
      command: 'seiso_clean_system action=plan targets=["temp"]',
      paths: ['/tmp'],
      destructive: false
    });
    suggestions.push({
      id: 'kaizen-cleanup-plan',
      title: 'Use Seiso staged cleanup for reclaimable temporary files',
      priority: 'medium',
      category: 'cleanup',
      recommendation: 'Create a Seiso plan instead of running direct cleanup commands.',
      linked_tool: 'seiso_clean_system',
      linked_action: { action: 'plan', targets: ['temp'], preserve_days: 7 },
      policy_verdict: verdict
    });
  }

  return {
    timestamp: new Date().toISOString(),
    action: 'suggest',
    scope,
    target_path: root,
    suggestions: dedupeSuggestions(suggestions)
  };
}

async function repoSuggestions(root) {
  const suggestions = [];
  const packageJson = await readJson(path.join(root, 'package.json'));
  if (packageJson && !packageJson.scripts?.check) {
    suggestions.push({
      id: 'kaizen-add-check-script',
      title: 'Add syntax check script',
      priority: 'high',
      category: 'repo',
      recommendation: 'Add npm run check so agents can verify syntax before commits.'
    });
  }
  if (!(await exists(path.join(root, 'test')))) {
    suggestions.push({
      id: 'kaizen-add-tests',
      title: 'Add automated tests',
      priority: 'high',
      category: 'tests',
      recommendation: 'Add node:test coverage for MCP tools and policy gates.'
    });
  }
  return suggestions;
}

async function docsSuggestions(root) {
  const docsDir = path.join(root, 'docs');
  const suggestions = [];
  if (!(await exists(path.join(docsDir, 'safety.md')))) {
    suggestions.push({
      id: 'kaizen-document-safety',
      title: 'Document safety contract',
      priority: 'high',
      category: 'docs',
      recommendation: 'Add docs/safety.md describing policy, risk levels, and approval flow.'
    });
  }
  if (!(await exists(path.join(docsDir, 'tools.md')))) {
    suggestions.push({
      id: 'kaizen-document-tools',
      title: 'Document MCP tools',
      priority: 'medium',
      category: 'docs',
      recommendation: 'Add docs/tools.md with current tool schemas and examples.'
    });
  }
  return suggestions;
}

async function testSuggestions(root) {
  const testFiles = await listFiles(path.join(root, 'test'), '.js');
  if (testFiles.length < 5) {
    return [{
      id: 'kaizen-expand-tests',
      title: 'Expand test coverage',
      priority: 'medium',
      category: 'tests',
      recommendation: 'Add tests for each new Lean extension and policy block path.'
    }];
  }
  return [];
}

async function trackInitiative(backlogPath, initiative) {
  if (!initiative?.title) {
    throw new Error('initiative.title is required');
  }
  const backlog = await loadBacklog(backlogPath);
  const record = {
    id: initiative.id || `kaizen-${Date.now()}`,
    title: initiative.title,
    description: initiative.description || '',
    source: initiative.source || 'agent',
    priority: initiative.priority || 'medium',
    status: initiative.status || 'open',
    linked_plan: initiative.linked_plan || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  backlog.initiatives.push(record);
  await saveBacklog(backlogPath, backlog);
  return { timestamp: new Date().toISOString(), action: 'track', initiative: record };
}

async function reportInitiatives(backlogPath, status) {
  const backlog = await loadBacklog(backlogPath);
  const initiatives = status ? backlog.initiatives.filter(item => item.status === status) : backlog.initiatives;
  return {
    timestamp: new Date().toISOString(),
    action: 'report',
    total: initiatives.length,
    by_status: countBy(initiatives, 'status'),
    by_priority: countBy(initiatives, 'priority'),
    initiatives
  };
}

async function loadBacklog(backlogPath) {
  try {
    return JSON.parse(await fs.readFile(backlogPath, 'utf8'));
  } catch {
    return { version: '1.0.0', initiatives: [] };
  }
}

async function saveBacklog(backlogPath, backlog) {
  await fs.mkdir(path.dirname(backlogPath), { recursive: true });
  await fs.writeFile(backlogPath, JSON.stringify(backlog, null, 2));
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, suffix) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter(entry => entry.isFile() && entry.name.endsWith(suffix)).map(entry => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function dedupeSuggestions(suggestions) {
  return Array.from(new Map(suggestions.map(item => [item.id, item])).values());
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key] || 'unknown'] = (acc[item[key] || 'unknown'] || 0) + 1;
    return acc;
  }, {});
}
