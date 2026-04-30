/**
 * Seiso (清掃) - Production cleanup through a staged maintenance engine.
 *
 * This tool intentionally does not execute shell delete pipelines. Cleanup is:
 * observe -> plan -> stage -> apply. Apply requires an approved staged plan id.
 */

import { MaintenanceExecutionEngine } from '../../maintenance-engine.js';

export function createSeisoTool() {
  const engine = new MaintenanceExecutionEngine();

  return {
    name: 'seiso_clean_system',
    description: '清掃 (Seiso) - Production-safe cleanup using observe/plan/stage/apply, policy checks, manifests, backups, and post-clean verification.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['observe', 'analyze', 'plan', 'stage', 'apply', 'clean', 'deep_clean', 'optimize'],
          description: 'observe/analyze are read-only; plan creates manifest; stage creates dry-run artifact and backup; apply executes approved staged plan.'
        },
        targets: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['cache', 'logs', 'temp', 'packages', 'journal', 'trash', 'all']
          },
          default: ['all']
        },
        aggressive_level: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          default: 2
        },
        preserve_days: {
          type: 'number',
          default: 7
        },
        plan_id: {
          type: 'string',
          description: 'Required for stage/apply'
        },
        approved: {
          type: 'boolean',
          default: false
        },
        dry_run: {
          type: 'boolean',
          default: true
        }
      },
      required: ['action']
    },

    async execute(args) {
      const {
        action,
        targets = ['all'],
        aggressive_level = 2,
        preserve_days = 7,
        plan_id,
        approved = false
      } = args;

      switch (action) {
        case 'observe':
        case 'analyze':
          return await engine.observe(targets, { preserve_days, aggressive_level });

        case 'plan':
          return await engine.createPlan(targets, { preserve_days, aggressive_level });

        case 'stage':
          if (!plan_id) throw new Error('plan_id is required for stage');
          return await engine.stagePlan(plan_id);

        case 'apply':
          if (!plan_id) throw new Error('plan_id is required for apply');
          return await engine.applyPlan(plan_id, { approved });

        case 'clean':
        case 'deep_clean':
        case 'optimize':
          return await compatibilityPlan(engine, action, targets, { preserve_days, aggressive_level });

        default:
          throw new Error(`Unknown Seiso action: ${action}`);
      }
    }
  };
}

async function compatibilityPlan(engine, action, targets, options) {
  const effectiveOptions = {
    ...options,
    aggressive_level: action === 'deep_clean' ? Math.max(options.aggressive_level, 4) : options.aggressive_level
  };
  const plan = await engine.createPlan(targets, effectiveOptions);
  return {
    ...plan,
    compatibility_notice: `${action} now creates a maintenance plan only. Call action=stage with plan_id, then action=apply with approved=true.`
  };
}
