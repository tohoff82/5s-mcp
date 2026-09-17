import crypto from 'crypto';

export class WorkflowCoordinator {
  constructor({ store, now = () => new Date().toISOString() }) {
    if (!store) throw new Error('WorkflowStore is required');
    this.store = store;
    this.now = now;
  }

  async create({ serviceContext, actorContext, targetContext, intentContext = null }) {
    if (!actorContext?.actor_id) throw new Error('ActorContext is required');
    if (!targetContext?.target_id) throw new Error('TargetContext is required');
    if (targetContext.actor_id !== actorContext.actor_id) throw new Error('ActorContext and TargetContext actor mismatch');
    const workflowId = `wf-${crypto.randomUUID()}`;
    const createdAt = this.now();
    const state = {
      workflow_id: workflowId,
      lifecycle_state: 'TARGET_BOUND',
      created_at: createdAt,
      updated_at: createdAt,
      service_context: serviceContext ?? null,
      actor_context: actorContext,
      target_context: targetContext,
      intent_context: intentContext
    };
    await this.store.createWorkflow(state);
    return state;
  }

  async transition(workflowId, { state, patch = {}, eventType = 'workflow_transition' }) {
    if (typeof state !== 'string' || state.length === 0) throw new Error('state is required');
    const current = await this.store.loadCurrent(workflowId);
    if (patch.workflow_id && patch.workflow_id !== workflowId) throw new Error('workflow_id cannot be changed');
    const next = {
      ...current,
      ...patch,
      workflow_id: workflowId,
      lifecycle_state: state,
      updated_at: this.now()
    };
    await this.store.writeCurrent(workflowId, next);
    await this.store.appendEvent(workflowId, { type: eventType, at: next.updated_at, from: current.lifecycle_state, to: state });
    return next;
  }
}
