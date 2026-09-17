import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
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


test('target profile scopes observation and planning to registered workspace roots', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-profile-'));
  const workspace = path.join(tmp, 'workspace');
  const tempRoot = path.join(workspace, 'temp');
  await mkdir(tempRoot, { recursive: true });
  await writeFile(path.join(tempRoot, 'candidate.tmp'), 'safeops fixture');

  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'),
    backupDir: path.join(tmp, 'backup'),
    targetProfile: { root: workspace, targets: { temp: { path: 'temp', patterns: ['*'] } } }
  });

  const observation = await engine.observe(['temp']);
  assert.equal(observation.observations.temp.root, tempRoot);

  const plan = await engine.createPlan(['temp'], { preserve_days: 0 });
  assert.equal(plan.targets[0], 'temp');
  assert.equal(plan.operations.length, 1);
  assert.ok(plan.operations[0].paths.length >= 1);
  assert.ok(plan.operations[0].paths.every(candidate => candidate.startsWith(`${tempRoot}${path.sep}`)));

  await rm(tmp, { recursive: true, force: true });
});

test('target profile rejects unregistered targets', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-profile-'));
  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'),
    backupDir: path.join(tmp, 'backup'),
    targetProfile: { root: path.join(tmp, 'workspace'), targets: { temp: 'temp' } }
  });

  await assert.rejects(() => engine.createPlan(['logs'], { preserve_days: 0 }), /not registered/);
  await rm(tmp, { recursive: true, force: true });
});

test('target profile rejects paths that escape the registered root', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-profile-'));
  const workspace = path.join(tmp, 'workspace');

  assert.throws(() => new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'),
    backupDir: path.join(tmp, 'backup'),
    targetProfile: { root: workspace, targets: { escape: '../outside' } }
  }), /escapes root/);

  await rm(tmp, { recursive: true, force: true });
});

test('target profile remains separate from the injected safety policy', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-profile-'));
  const workspace = path.join(tmp, 'workspace');
  const tempRoot = path.join(workspace, 'temp');
  await mkdir(tempRoot, { recursive: true });
  await writeFile(path.join(tempRoot, 'candidate.tmp'), 'safeops fixture');

  const evaluated = [];
  const policy = {
    async evaluateOperation(operation) {
      evaluated.push(operation);
      return { allowed: true, risk: 'low', risk_level: 'P0_SAFE', approval_required: false, matches: { denied: [], allowed: [] }, reasons: ['test policy'] };
    }
  };
  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'),
    backupDir: path.join(tmp, 'backup'),
    policy,
    targetProfile: { root: workspace, targets: { temp: 'temp' } }
  });

  await engine.createPlan(['temp'], { preserve_days: 0 });
  assert.equal(engine.policy, policy);
  assert.equal(evaluated.length, 1);
  assert.ok(evaluated[0].paths.every(candidate => candidate.startsWith(`${tempRoot}${path.sep}`)));

  await rm(tmp, { recursive: true, force: true });
});


test('explicit operation subset stages and applies only selected operations', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-subset-'));
  const workspace = path.join(tmp, 'workspace');
  const firstRoot = path.join(workspace, 'first');
  const secondRoot = path.join(workspace, 'second');
  const firstFile = path.join(firstRoot, 'one.tmp');
  const secondFile = path.join(secondRoot, 'two.tmp');
  await mkdir(firstRoot, { recursive: true });
  await mkdir(secondRoot, { recursive: true });
  await writeFile(firstFile, 'first');
  await writeFile(secondFile, 'second');

  const policy = { async evaluateOperation() { return { allowed: true, risk: 'low', risk_level: 'P0_SAFE', approval_required: false, matches: { denied: [], allowed: [] }, reasons: [] }; } };
  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'), backupDir: path.join(tmp, 'backup'), policy,
    targetProfile: { root: workspace, targets: { first: 'first', second: 'second' } }
  });
  engine.createBackup = async plan => ({ required: plan.manifest.length > 0, created: plan.manifest.length > 0, files: plan.manifest.length });

  const plan = await engine.createPlan(['first', 'second'], { preserve_days: 0 });
  const selected = plan.operations[0].id;
  const unselected = plan.operations[1].id;
  const staged = await engine.stagePlan(plan.id, { operationIds: [selected] });
  assert.deepEqual(staged.stage.operation_ids, [selected]);
  const applied = await engine.applyPlan(plan.id, { approved: true, operationIds: [selected] });
  assert.deepEqual(applied.execution_scope.operation_ids, [selected]);
  assert.ok(applied.results.some(result => result.id === unselected && result.skipped === true));
  await assert.rejects(() => access(firstFile));
  await access(secondFile);

  await rm(tmp, { recursive: true, force: true });
});

test('explicit operation subset rejects unknown operation ids', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-subset-'));
  const engine = new MaintenanceExecutionEngine({ plansDir: path.join(tmp, 'plans'), backupDir: path.join(tmp, 'backup') });
  const plan = await engine.createPlan(['temp'], { preserve_days: 36500 });
  await assert.rejects(() => engine.stagePlan(plan.id, { operationIds: ['not-in-plan'] }), /Unknown operation id/);
  await rm(tmp, { recursive: true, force: true });
});

test('empty explicit operation subset produces no effect instead of whole-plan execution', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-subset-'));
  const workspace = path.join(tmp, 'workspace');
  const tempRoot = path.join(workspace, 'temp');
  const candidate = path.join(tempRoot, 'keep.tmp');
  await mkdir(tempRoot, { recursive: true });
  await writeFile(candidate, 'keep');
  const policy = { async evaluateOperation() { return { allowed: true, risk: 'low', risk_level: 'P0_SAFE', approval_required: false, matches: { denied: [], allowed: [] }, reasons: [] }; } };
  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'), backupDir: path.join(tmp, 'backup'), policy,
    targetProfile: { root: workspace, targets: { temp: 'temp' } }
  });
  const plan = await engine.createPlan(['temp'], { preserve_days: 0 });
  await engine.stagePlan(plan.id, { operationIds: [] });
  const applied = await engine.applyPlan(plan.id, { approved: true, operationIds: [] });
  assert.deepEqual(applied.execution_scope.operation_ids, []);
  assert.ok(applied.results.every(result => result.skipped === true));
  await access(candidate);
  await rm(tmp, { recursive: true, force: true });
});

test('apply must match an explicitly staged operation subset', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), '5s-subset-'));
  const workspace = path.join(tmp, 'workspace');
  await mkdir(path.join(workspace, 'first'), { recursive: true });
  await mkdir(path.join(workspace, 'second'), { recursive: true });
  await writeFile(path.join(workspace, 'first', 'one.tmp'), 'one');
  await writeFile(path.join(workspace, 'second', 'two.tmp'), 'two');
  const policy = { async evaluateOperation() { return { allowed: true, risk: 'low', risk_level: 'P0_SAFE', approval_required: false, matches: { denied: [], allowed: [] }, reasons: [] }; } };
  const engine = new MaintenanceExecutionEngine({
    plansDir: path.join(tmp, 'plans'), backupDir: path.join(tmp, 'backup'), policy,
    targetProfile: { root: workspace, targets: { first: 'first', second: 'second' } }
  });
  engine.createBackup = async plan => ({ required: plan.manifest.length > 0, created: plan.manifest.length > 0, files: plan.manifest.length });
  const plan = await engine.createPlan(['first', 'second'], { preserve_days: 0 });
  const [first, second] = plan.operations.map(operation => operation.id);
  await engine.stagePlan(plan.id, { operationIds: [first] });
  await assert.rejects(() => engine.applyPlan(plan.id, { approved: true }), /operationIds is required/);
  await assert.rejects(() => engine.applyPlan(plan.id, { approved: true, operationIds: [second] }), /exactly match/);
  await rm(tmp, { recursive: true, force: true });
});
