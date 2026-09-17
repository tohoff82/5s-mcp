import { MaintenanceExecutionEngine } from '../../maintenance-engine.js';
import { SafetyPolicyManager } from '../../safety-policy.js';

export class FiveSBridge {
  constructor({ targetContext, plansDir, backupDir, policy, engine } = {}) {
    if (!targetContext?.target_profile) throw new Error('Bound TargetContext with target_profile is required');
    this.targetContext = targetContext;
    this.policy = policy || new SafetyPolicyManager();
    this.engine = engine || new MaintenanceExecutionEngine({
      plansDir,
      backupDir,
      policy: this.policy,
      targetProfile: targetContext.target_profile
    });
  }

  async observe(targets, options = {}) {
    return await this.engine.observe(targets, options);
  }

  async createPlan(targets, options = {}) {
    return await this.engine.createPlan(targets, options);
  }

  async loadPlan(planId) {
    return await this.engine.loadPlan(planId);
  }

  async stage(planId, operationIds) {
    if (!Array.isArray(operationIds)) throw new Error('Exact operationIds are required for SafeOps staging');
    return await this.engine.stagePlan(planId, { operationIds });
  }

  async apply(planId, operationIds) {
    if (!Array.isArray(operationIds)) throw new Error('Exact operationIds are required for SafeOps apply');
    return await this.engine.applyPlan(planId, { approved: true, operationIds });
  }
}
