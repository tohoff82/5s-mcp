import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { MaintenanceExecutionEngine } from '../src/maintenance-engine.js';

test('maintenance engine creates, stages, and approval-gates cleanup plans', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-engine-'));
  const plansDir = path.join(tmp, 'plans');
  const backupDir = path.join(tmp, 'backup');
  const engine = new MaintenanceExecutionEngine({ plansDir, backupDir });
  const plan = await engine.createPlan(['cache'], { preserve_days: 7 });

  assert.equal(plan.mode, 'plan');
  assert.ok(plan.id);

  const staged = await engine.stagePlan(plan.id);
  assert.equal(staged.mode, 'stage');
  assert.ok(staged.stage.artifact_path.endsWith('-dry-run.json'));

  await assert.rejects(() => engine.applyPlan(plan.id, { approved: false }), /approved=true/);

  await rm(tmp, { recursive: true, force: true });
});
