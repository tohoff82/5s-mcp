import { composeWorkflowExplanation } from '../workflow/explanation.js';

export function createExplainWorkflowTool({ targetRegistry, store }) {
  if (!targetRegistry || !store) throw new Error('targetRegistry and store are required');
  return {
    name: 'safeops_explain_workflow',
    description: 'Explain a prior SafeOps workflow from persisted evidence without changing approval, policy, target, or effect state.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { workflow_id: { type: 'string', minLength: 1 } },
      required: ['workflow_id']
    },
    async execute(args, runtimeContext = {}) {
      const actorContext = runtimeContext.actorContext;
      if (!actorContext?.actor_id) throw new Error('Authenticated ActorContext is required');
      const workflow = await store.loadCurrent(args.workflow_id);
      if (workflow.actor_context?.actor_id !== actorContext.actor_id) throw new Error('Workflow actor mismatch');
      targetRegistry.resolve(actorContext, workflow.target_context?.target_id);
      const classification = await store.readObject(args.workflow_id, workflow.classification_ref);
      const approval = workflow.approval_ref ? await store.readObject(args.workflow_id, workflow.approval_ref) : null;
      const effectResult = workflow.effect_ref ? await store.readObject(args.workflow_id, workflow.effect_ref) : null;
      const verificationResult = workflow.verification_ref ? await store.readObject(args.workflow_id, workflow.verification_ref) : null;
      return composeWorkflowExplanation({ workflow, classificationSet: classification, approval, effectResult, verificationResult });
    }
  };
}
