export function composeWorkflowExplanation({ workflow, classificationSet, approval = null, effectResult = null, verificationResult = null }) {
  if (!workflow?.workflow_id) throw new Error('Workflow is required');
  if (!classificationSet?.per_action) throw new Error('ClassificationSet is required');
  const byClass = classification => classificationSet.per_action.filter(item => item.classification === classification).map(item => item.operation_id);
  return {
    workflow_id: workflow.workflow_id,
    target_id: workflow.target_context?.target_id ?? null,
    requested_outcome: workflow.intent_context?.requested_outcome ?? null,
    safe_operation_ids: byClass('SAFE'),
    review_operation_ids: byClass('REVIEW'),
    denied_operation_ids: byClass('DENIED'),
    approved_operation_ids: approval?.approved_operation_ids ?? [],
    actual_execution_scope: effectResult?.execution_scope?.operation_ids ?? [],
    verification_state: verificationResult?.verification_state ?? 'UNKNOWN',
    verification_reasons: verificationResult?.reasons ?? [],
    uncertainty: verificationResult ? [] : ['Verification result unavailable']
  };
}
