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

test('maintenance engine marks empty file cleanup as noop', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-engine-'));
  const plansDir = path.join(tmp, 'plans');
  const backupDir = path.join(tmp, 'backup');
  const engine = new MaintenanceExecutionEngine({ plansDir, backupDir });

  const plan = await engine.createPlan(['temp'], { preserve_days: 36500 });

  assert.ok(plan.operations.some(operation => operation.kind === 'noop'));
  assert.equal(plan.summary.no_candidates >= 1, true);
  assert.equal(plan.operations.find(operation => operation.kind === 'noop').destructive, false);

  await rm(tmp, { recursive: true, force: true });
});

test('maintenance engine fails closed when a required stage backup fails', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-engine-'));
  const plansDir = path.join(tmp, 'plans');
  const backupDir = path.join(tmp, 'backup');
  const engine = new MaintenanceExecutionEngine({ plansDir, backupDir });
  const plan = await engine.createPlan(['cache'], { preserve_days: 7 });
  engine.createBackup = async () => ({ required: true, created: false, error: 'simulated backup failure' });

  await assert.rejects(() => engine.stagePlan(plan.id), /Required backup was not created/);
  const failed = await engine.loadPlan(plan.id);
  assert.equal(failed.mode, 'stage_failed');
  assert.equal(failed.stage_attempt.backup.created, false);
  await assert.rejects(() => engine.applyPlan(plan.id, { approved: true }), /must be staged/);

  await rm(tmp, { recursive: true, force: true });
});
