import { classifyPlan } from '../workflow/classifier.js';
import { computePlanDigest } from '../workflow/plan-digest.js';

export function createInspectWorkspaceTool({ targetRegistry, coordinator, store, bridgeFactory }) {
  requireDependencies({ targetRegistry, coordinator, store, bridgeFactory });
  return {
    name: 'safeops_inspect_workspace',
    description: 'Inspect one bound SafeOps workspace, create a governed 5S plan, and classify actions as SAFE, REVIEW, or DENIED without applying effects.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        target_id: { type: 'string', minLength: 1 },
        targets: { type: 'array', items: { type: 'string' }, default: ['all'] },
        preserve_days: { type: 'number', default: 7 },
        aggressive_level: { type: 'number', minimum: 1, maximum: 5, default: 2 },
        requested_outcome: { type: 'string' }
      },
      required: ['target_id']
    },
    async execute(args, runtimeContext = {}) {
      const actorContext = requireActor(runtimeContext);
      const targetContext = targetRegistry.resolve(actorContext, args.target_id);
      const workflow = await coordinator.create({
        serviceContext: runtimeContext.serviceContext ?? null,
        actorContext,
        targetContext,
        intentContext: { requested_outcome: args.requested_outcome ?? 'inspect and safely maintain workspace' }
      });
      const bridge = bridgeFactory(targetContext);
      const options = { preserve_days: args.preserve_days ?? 7, aggressive_level: args.aggressive_level ?? 2 };
      const targets = args.targets ?? ['all'];
      const observation = await bridge.observe(targets, options);
      const plan = await bridge.createPlan(targets, options);
      const classification = classifyPlan(plan);
      const planDigest = computePlanDigest(plan, targetContext);
      const observationRef = `observation-${plan.id}`;
      const planRef = `plan-${plan.id}`;
      await store.writeObject(workflow.workflow_id, observationRef, observation);
      await store.writeObject(workflow.workflow_id, planRef, plan);
      await store.writeObject(workflow.workflow_id, classification.classification_id, classification);
      await coordinator.transition(workflow.workflow_id, {
        state: 'CLASSIFIED',
        eventType: 'plan_classified',
        patch: {
          observation_ref: observationRef,
          plan_ref: planRef,
          plan_id: plan.id,
          plan_digest: planDigest,
          classification_ref: classification.classification_id
        }
      });
      return {
        workflow_id: workflow.workflow_id,
        target_id: targetContext.target_id,
        plan_id: plan.id,
        plan_digest: planDigest,
        safe_operation_ids: classification.safe_operation_ids,
        review_operation_ids: classification.review_operation_ids,
        denied_operation_ids: classification.denied_operation_ids,
        classifications: classification.per_action,
        estimated_effect: plan.summary ?? null,
        approval_required: classification.safe_operation_ids.length > 0
      };
    }
  };
}

function requireActor(runtimeContext) {
  if (!runtimeContext.actorContext?.actor_id) throw new Error('Authenticated ActorContext is required');
  return runtimeContext.actorContext;
}

function requireDependencies(dependencies) {
  for (const [name, value] of Object.entries(dependencies)) if (!value) throw new Error(`${name} is required`);
}
