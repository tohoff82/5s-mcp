import crypto from 'crypto';

export class ApprovalManager {
  constructor({ store, now = () => new Date().toISOString() }) {
    if (!store) throw new Error('WorkflowStore is required');
    this.store = store;
    this.now = now;
  }

  async grant({ workflowId, actorId, targetId, planId, planDigest, approvedOperationIds, approvalEvent }) {
    const operationIds = normalizeIds(approvedOperationIds);
    requireString(workflowId, 'workflowId');
    requireString(actorId, 'actorId');
    requireString(targetId, 'targetId');
    requireString(planId, 'planId');
    requireDigest(planDigest);
    const approval = {
      approval_id: `approval-${crypto.randomUUID()}`,
      workflow_id: workflowId,
      actor_id: actorId,
      target_id: targetId,
      plan_id: planId,
      plan_digest: planDigest,
      approved_operation_ids: operationIds,
      approval_event: approvalEvent ?? null,
      issued_at: this.now(),
      status: 'ACTIVE'
    };
    await this.store.writeObject(workflowId, approval.approval_id, approval);
    await this.store.appendEvent(workflowId, { type: 'approval_granted', at: approval.issued_at, approval_id: approval.approval_id, plan_id: planId, operation_ids: operationIds });
    return approval;
  }

  async load(workflowId, approvalId) {
    return await this.store.readObject(workflowId, approvalId);
  }

  async consume({ workflowId, approvalId, expected }) {
    const approval = await this.load(workflowId, approvalId);
    assertApprovalMatches(approval, expected);
    const consumedAt = this.now();
    const markerId = `consumed-${approvalId}`;
    try {
      await this.store.writeObject(workflowId, markerId, { approval_id: approvalId, consumed_at: consumedAt, status: 'CONSUMED' });
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Approval already consumed: ${approvalId}`);
      throw error;
    }
    await this.store.appendEvent(workflowId, { type: 'approval_consumed', at: consumedAt, approval_id: approvalId });
    return { ...approval, status: 'CONSUMED', consumed_at: consumedAt };
  }
}

export function assertApprovalMatches(approval, expected = {}) {
  if (!approval || approval.status !== 'ACTIVE') throw new Error('Approval is not active');
  const checks = [
    ['actor_id', expected.actorId],
    ['target_id', expected.targetId],
    ['plan_id', expected.planId],
    ['plan_digest', expected.planDigest]
  ];
  for (const [field, expectedValue] of checks) {
    if (expectedValue !== undefined && approval[field] !== expectedValue) throw new Error(`Approval ${field} mismatch`);
  }
  if (expected.approvedOperationIds !== undefined) {
    const expectedIds = normalizeIds(expected.approvedOperationIds);
    if (!sameIds(approval.approved_operation_ids, expectedIds)) throw new Error('Approval operation scope mismatch');
  }
  return true;
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) throw new Error('approvedOperationIds must be an array');
  if (ids.some(id => typeof id !== 'string' || id.length === 0)) throw new Error('approvedOperationIds must contain non-empty strings');
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) throw new Error('approvedOperationIds must not contain duplicates');
  return unique;
}

function sameIds(left, right) {
  if (left.length !== right.length) return false;
  const set = new Set(right);
  return left.every(id => set.has(id));
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
}

function requireDigest(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('planDigest must be a SHA-256 hex digest');
}
