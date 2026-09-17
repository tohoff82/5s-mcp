import crypto from 'crypto';

export function computePlanDigest(plan, targetContext = null) {
  if (!plan?.id || !Array.isArray(plan.operations)) throw new Error('Valid plan is required');
  const payload = {
    plan_id: plan.id,
    target_id: targetContext?.target_id ?? null,
    targets: plan.targets ?? [],
    operations: plan.operations.map(operation => ({
      id: operation.id,
      kind: operation.kind ?? null,
      type: operation.type ?? null,
      command: operation.command ?? null,
      executable: operation.executable ?? null,
      args: operation.args ?? [],
      paths: operation.paths ?? [],
      destructive: operation.destructive === true,
      manifest: (operation.manifest ?? []).map(item => ({
        id: item.id ?? null,
        path: item.path ?? null,
        size_bytes: item.size_bytes ?? null,
        mtime: item.mtime ?? null,
        inode: item.inode ?? null
      }))
    }))
  };
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
  }
  return value;
}
