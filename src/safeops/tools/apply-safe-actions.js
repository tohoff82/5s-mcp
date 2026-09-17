import crypto from 'crypto';
import { ApprovalManager } from '../workflow/approval.js';
import { computePlanDigest } from '../workflow/plan-digest.js';
import { selectSafeOperationIds } from '../workflow/classifier.js';
import { verifyExecution } from '../workflow/verifier.js';

export function createApplySafeActionsTool({ targetRegistry, coordinator, store, bridgeFactory, approvalProvider, approvalManager = null }) {
  requireDependencies({ targetRegistry, coordinator, store, bridgeFactory, approvalProvider });
  const approvals = approvalManager || new ApprovalManager({ store });
  return {
    name: 'safeops_apply_safe_actions',
    description: 'Apply only the exact currently SAFE subset of an existing SafeOps workflow after fresh bounded user approval and 5S revalidation.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', minLength: 1 },
        plan_id: { type: 'string', minLength: 1 },
        operation_ids: { type: 'array', items: { type: 'string' } }
      },
      required: ['workflow_id', 'plan_id']
    },
    async execute(args, runtimeContext = {}) {
      const actorContext = requireActor(runtimeContext);
      const workflow = await store.loadCurrent(args.workflow_id);
      if (workflow.actor_context?.actor_id !== actorContext.actor_id) throw new Error('Workflow actor mismatch');
      if (workflow.plan_id !== args.plan_id) throw new Error('Workflow plan mismatch');
      const targetContext = targetRegistry.resolve(actorContext, workflow.target_context?.target_id);
      const bridge = bridgeFactory(targetContext);
      const plan = await bridge.loadPlan(args.plan_id);
      const currentDigest = computePlanDigest(plan, targetContext);
      if (currentDigest !== workflow.plan_digest) throw new Error('Plan digest mismatch; replan and reapprove');
      const classification = await store.readObject(args.workflow_id, workflow.classification_ref);
      const operationIds = selectSafeOperationIds(classification, args.operation_ids);

      if (operationIds.length === 0) {
        const verification = { verification_state: 'VERIFIED_SUCCESS', reasons: ['No SAFE operations selected; no effect attempted'], approved_operation_ids: [], observed_execution_scope: [], failures: [] };
        const verificationRef = `verification-${crypto.randomUUID()}`;
        await store.writeObject(args.workflow_id, verificationRef, verification);
        await coordinator.transition(args.workflow_id, { state: 'EXPLAINABLE', eventType: 'no_effect_required', patch: { verification_ref: verificationRef } });
        return { workflow_id: args.workflow_id, plan_id: args.plan_id, approved_operation_ids: [], attempted: [], verification_state: verification.verification_state, no_effect: true };
      }

      const approvalDecision = await approvalProvider.requestApproval({ workflow, actorContext, targetContext, plan, classification, operationIds });
      if (!approvalDecision?.approved) throw new Error('User approval was not granted');
      const approval = await approvals.grant({
        workflowId: args.workflow_id,
        actorId: actorContext.actor_id,
        targetId: targetContext.target_id,
        planId: plan.id,
        planDigest: currentDigest,
        approvedOperationIds: operationIds,
        approvalEvent: approvalDecision.event ?? null
      });
      await bridge.stage(plan.id, operationIds);
      await approvals.consume({
        workflowId: args.workflow_id,
        approvalId: approval.approval_id,
        expected: { actorId: actorContext.actor_id, targetId: targetContext.target_id, planId: plan.id, planDigest: currentDigest, approvedOperationIds: operationIds }
      });
      const effectResult = await bridge.apply(plan.id, operationIds);
      const verification = verifyExecution({ approvedOperationIds: operationIds, classificationSet: classification, effectResult });
      const effectRef = `effect-${crypto.randomUUID()}`;
      const verificationRef = `verification-${crypto.randomUUID()}`;
      await store.writeObject(args.workflow_id, effectRef, effectResult);
      await store.writeObject(args.workflow_id, verificationRef, verification);
      await coordinator.transition(args.workflow_id, {
        state: 'EXPLAINABLE',
        eventType: 'effect_verified',
        patch: { approval_ref: approval.approval_id, effect_ref: effectRef, verification_ref: verificationRef }
      });
      return {
        workflow_id: args.workflow_id,
        plan_id: plan.id,
        approval_id: approval.approval_id,
        approved_operation_ids: operationIds,
        attempted: effectResult.execution_scope?.operation_ids ?? [],
        results: effectResult.results ?? [],
        verification_state: verification.verification_state,
        verification_reasons: verification.reasons
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
