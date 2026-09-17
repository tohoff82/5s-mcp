export function createMcpElicitationApprovalProvider({ server } = {}) {
  if (!server || typeof server.elicitInput !== 'function') throw new Error('Connected MCP Server with elicitation support is required');
  return {
    async requestApproval({ workflow, actorContext, targetContext, plan, operationIds }) {
      if (!workflow?.workflow_id || !actorContext?.actor_id || !targetContext?.target_id || !plan?.id) throw new Error('Bound workflow approval context is required');
      if (!Array.isArray(operationIds) || operationIds.length === 0) throw new Error('Non-empty SAFE operation scope is required for elicitation');
      const result = await server.elicitInput({
        mode: 'form',
        message: approvalMessage({ workflow, targetContext, plan, operationIds }),
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              title: 'Apply only the safe actions',
              description: `Approve exactly ${operationIds.length} SAFE action(s) for target ${targetContext.target_id} and plan ${plan.id}.`,
              default: false
            }
          },
          required: ['confirm']
        }
      });
      const confirmed = result?.action === 'accept' && result?.content?.confirm === true;
      return {
        approved: confirmed,
        event: {
          carrier: 'mcp-form-elicitation',
          action: result?.action ?? 'unknown',
          confirmed,
          workflow_id: workflow.workflow_id,
          actor_id: actorContext.actor_id,
          target_id: targetContext.target_id,
          plan_id: plan.id,
          operation_ids: [...operationIds]
        }
      };
    }
  };
}

function approvalMessage({ workflow, targetContext, plan, operationIds }) {
  return [
    'SafeOps is ready to apply only the currently SAFE actions.',
    `Workflow: ${workflow.workflow_id}`,
    `Target: ${targetContext.target_id}`,
    `Plan: ${plan.id}`,
    `SAFE operation IDs: ${operationIds.join(', ')}`,
    'REVIEW and DENIED actions will not execute. Confirm only if you want this exact SAFE subset applied now.'
  ].join('\n');
}
