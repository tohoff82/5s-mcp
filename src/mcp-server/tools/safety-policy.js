import { SafetyPolicyManager } from '../../safety-policy.js';

export function createSafetyPolicyTool() {
  const manager = new SafetyPolicyManager();

  return {
    name: '5s_safety_policy',
    description: 'Production safety policy manager for 5S cleanup. Lets agents read and manage deny/allow rules and evaluate operations before cleanup.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add_rule', 'remove_rule', 'evaluate', 'reset'],
          description: 'Policy action to execute'
        },
        kind: {
          type: 'string',
          enum: ['deny', 'allow', 'all'],
          description: 'Rule kind for list/add/remove'
        },
        rule: {
          type: 'object',
          description: 'Rule to add. Required for add_rule.',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['path_prefix', 'path_glob', 'command_regex'] },
            value: { type: 'string' },
            reason: { type: 'string' },
            min_age_days: { type: 'number' }
          }
        },
        id: {
          type: 'string',
          description: 'Rule id for remove_rule'
        },
        operation: {
          type: 'object',
          description: 'Operation to evaluate against policy',
          properties: {
            command: { type: 'string' },
            paths: {
              type: 'array',
              items: { type: 'string' }
            },
            destructive: { type: 'boolean' },
            approved: { type: 'boolean' }
          }
        }
      },
      required: ['action']
    },

    async execute(args) {
      const { action, kind = 'all', rule, id, operation } = args;

      switch (action) {
        case 'list':
          return {
            timestamp: new Date().toISOString(),
            action,
            policy: await manager.listRules(kind)
          };

        case 'add_rule':
          if (!rule) throw new Error('rule is required for add_rule');
          return {
            timestamp: new Date().toISOString(),
            action,
            policy: await manager.addRule(kind, rule)
          };

        case 'remove_rule':
          if (!id) throw new Error('id is required for remove_rule');
          return {
            timestamp: new Date().toISOString(),
            action,
            policy: await manager.removeRule(kind, id)
          };

        case 'evaluate':
          if (!operation) throw new Error('operation is required for evaluate');
          return {
            timestamp: new Date().toISOString(),
            action,
            verdict: await manager.evaluateOperation(operation)
          };

        case 'reset':
          return {
            timestamp: new Date().toISOString(),
            action,
            policy: await manager.resetPolicy()
          };

        default:
          throw new Error(`Unknown safety policy action: ${action}`);
      }
    }
  };
}
