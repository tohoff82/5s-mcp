import path from 'path';

export class TargetRegistry {
  constructor(targets = {}) {
    if (!targets || typeof targets !== 'object' || Array.isArray(targets)) {
      throw new Error('targets must be an object keyed by target id');
    }
    this.targets = new Map();
    for (const [targetId, config] of Object.entries(targets)) {
      this.targets.set(targetId, normalizeTarget(targetId, config));
    }
  }

  resolve(actorContext, targetId) {
    const actorId = actorContext?.actor_id || actorContext?.actorId;
    if (!actorId || typeof actorId !== 'string') {
      throw new Error('Valid ActorContext is required');
    }
    const target = this.targets.get(targetId);
    if (!target) throw new Error(`Target is not registered: ${targetId}`);
    if (!target.enabled) throw new Error(`Target is disabled: ${targetId}`);
    if (!target.actorIds.includes(actorId)) {
      throw new Error(`Actor is not bound to target: ${targetId}`);
    }
    return Object.freeze({
      target_id: target.id,
      target_class: 'workspace',
      actor_id: actorId,
      actor_target_binding: 'REGISTERED',
      binding_source: 'TargetRegistry',
      validity: 'VALID',
      scope: Object.freeze({
        workspace_root: target.root,
        capability_profile: target.capabilityProfile,
        policy_profile: target.policyProfile
      }),
      target_profile: Object.freeze({ root: target.root, targets: target.engineTargets }),
      provenance: Object.freeze({ source: 'runtime-target-registry' })
    });
  }
}

function normalizeTarget(targetId, config) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(targetId)) {
    throw new Error(`Invalid target id: ${targetId}`);
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`Invalid target config: ${targetId}`);
  }
  if (typeof config.root !== 'string' || !path.isAbsolute(config.root)) {
    throw new Error(`Target root must be absolute: ${targetId}`);
  }
  const actorIds = config.actor_ids ?? config.actorIds;
  if (!Array.isArray(actorIds) || actorIds.length === 0 || actorIds.some(id => typeof id !== 'string' || id.length === 0)) {
    throw new Error(`Target actor_ids must be a non-empty string array: ${targetId}`);
  }
  const engineTargets = config.engine_targets ?? config.engineTargets;
  if (!engineTargets || typeof engineTargets !== 'object' || Array.isArray(engineTargets) || Object.keys(engineTargets).length === 0) {
    throw new Error(`Target engine_targets must be a non-empty object: ${targetId}`);
  }
  return Object.freeze({
    id: targetId,
    root: path.resolve(config.root),
    actorIds: Object.freeze([...new Set(actorIds)]),
    enabled: config.enabled !== false,
    engineTargets: Object.freeze({ ...engineTargets }),
    capabilityProfile: config.capability_profile ?? config.capabilityProfile ?? 'safeops-c0',
    policyProfile: config.policy_profile ?? config.policyProfile ?? '5s-default'
  });
}
