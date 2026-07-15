import { createSeiriTool } from './tools/seiri.js';
import { createSeitonTool } from './tools/seiton-enhanced.js';
import { createSeisoTool } from './tools/seiso.js';
import { createSeiketsuTool } from './tools/seiketsu.js';
import { createShitsukeTool } from './tools/shitsuke.js';
import { createSafetyPolicyTool } from './tools/safety-policy.js';
import { createCronManagerTool } from './tools/cron-manager.js';
import { createRemoteCleanTool } from './tools/remote-clean.js';
import { createKaizenTool } from './tools/kaizen.js';
import { createGembaTool } from './tools/gemba.js';
import { createPokaYokeTool } from './tools/poka-yoke.js';
import { createLeanOpsTool } from './tools/lean-ops.js';

/**
 * The single ordered registry for the MCP surface.
 *
 * Tool annotations are conservative capability hints, not authorization. A tool
 * is marked destructive when any supported action can remove system or policy
 * state. Exact action-level gates remain in the tool handlers and canonical docs.
 */
export const TOOL_REGISTRATIONS = Object.freeze([
  {
    create: () => createSeiriTool(),
    source: 'src/mcp-server/tools/seiri.js',
    group: '5S core',
    lifecycle: 'Finite observation and classification',
    policyPath: 'Path policy is evaluated for file analysis; no cleanup is applied.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    create: ({ toolOrchestrator }) => createSeitonTool(toolOrchestrator),
    source: 'src/mcp-server/tools/seiton-enhanced.js',
    group: '5S core',
    lifecycle: 'Finite inventory, validation, or plan-only organization',
    policyPath: 'Production organize/standardize actions return plans; they do not move files.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    create: () => createSeisoTool(),
    source: 'src/mcp-server/tools/seiso.js',
    group: '5S core',
    lifecycle: 'Persisted local plan with stage and approved apply',
    policyPath: 'Every planned operation is evaluated; apply requires a staged plan_id and approved=true.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
  },
  {
    create: () => createSeiketsuTool(),
    source: 'src/mcp-server/tools/seiketsu.js',
    group: '5S core',
    lifecycle: 'Finite audit, policy generation, and standards output',
    policyPath: 'Reads the active safety policy when formal policy output is requested; does not install generated automation.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    create: () => createShitsukeTool(),
    source: 'src/mcp-server/tools/shitsuke.js',
    group: '5S core',
    lifecycle: 'Finite health/audit/report call with optional local evidence writes',
    policyPath: 'Health is observational; audit/metrics/report actions can write bounded local evidence.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
  },
  {
    create: () => createSafetyPolicyTool(),
    source: 'src/mcp-server/tools/safety-policy.js',
    group: 'Safety controls',
    lifecycle: 'Finite policy read, evaluation, or configuration mutation',
    policyPath: 'Rule removal/reset can reduce protections and requires explicit operator scope.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
  },
  {
    create: () => createCronManagerTool(),
    source: 'src/mcp-server/tools/cron-manager.js',
    group: 'Safety controls',
    lifecycle: 'Finite render/validate/read or guarded cron file mutation',
    policyPath: 'Defaults to dry-run; install/remove can write system cron state and optionally reload cron.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
  },
  {
    create: () => createRemoteCleanTool(),
    source: 'src/mcp-server/tools/remote-clean.js',
    group: 'Safety controls',
    lifecycle: 'Finite evidence-driven SSH analysis, plan, or cleanup',
    policyPath: 'Concrete descendants of safe roots only; cleanup defaults to dry-run and requires approved=true.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
  },
  {
    create: () => createKaizenTool(),
    source: 'src/mcp-server/tools/kaizen.js',
    group: 'Lean extensions',
    lifecycle: 'Finite suggestions/report or local backlog update',
    policyPath: 'Cleanup suggestions route to Seiso; track writes only the Kaizen backlog.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
  },
  {
    create: () => createGembaTool(),
    source: 'src/mcp-server/tools/gemba.js',
    group: 'Lean extensions',
    lifecycle: 'Finite read-only walk, observation, or context collection',
    policyPath: 'Denied target paths fail closed; context previews redact secret-like values.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    create: () => createPokaYokeTool(),
    source: 'src/mcp-server/tools/poka-yoke.js',
    group: 'Lean extensions',
    lifecycle: 'Finite read-only scan, suggestion, or validation',
    policyPath: 'Denied target paths fail closed; findings route to safe follow-up tools.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  },
  {
    create: () => createLeanOpsTool(),
    source: 'src/mcp-server/tools/lean-ops.js',
    group: 'Lean extensions',
    lifecycle: 'Finite read-only waste, stop-condition, or status observation',
    policyPath: 'Observes through policy evaluation; cleanup follow-up routes to Seiso.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
  }
]);

export function createRegisteredTools(options = {}) {
  return TOOL_REGISTRATIONS.map(registration => {
    const tool = registration.create(options);
    return {
      ...tool,
      annotations: { ...registration.annotations }
    };
  });
}
