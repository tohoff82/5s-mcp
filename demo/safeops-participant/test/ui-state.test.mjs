import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveControls } from '../public/ui-state.js';

test('logout state enables Connect user and disables backend/workflow controls', () => {
  const controls = deriveControls({
    authenticated: false,
    connected: false,
    stale: false,
    busy: false,
    canApply: false,
    canExplain: false
  });

  assert.equal(controls.connectDisabled, false);
  assert.equal(controls.reconnectDisabled, true);
  assert.equal(controls.logoutDisabled, true);
  assert.equal(controls.inspectDisabled, true);
  assert.equal(controls.applyDisabled, true);
  assert.equal(controls.explainDisabled, true);
  assert.equal(controls.status, 'disconnected');
});

test('stale MCP state preserves authenticated identity and enables reconnect without enabling tools', () => {
  const controls = deriveControls({
    authenticated: true,
    connected: false,
    stale: true,
    busy: false,
    canApply: false,
    canExplain: false
  });

  assert.equal(controls.connectDisabled, true);
  assert.equal(controls.reconnectDisabled, false);
  assert.equal(controls.logoutDisabled, false);
  assert.equal(controls.inspectDisabled, true);
  assert.equal(controls.applyDisabled, true);
  assert.equal(controls.explainDisabled, true);
  assert.equal(controls.status, 'stale');
});

test('connected state enables inspect while apply/explain remain workflow-bound', () => {
  const controls = deriveControls({
    authenticated: true,
    connected: true,
    stale: false,
    busy: false,
    canApply: false,
    canExplain: false
  });

  assert.equal(controls.connectDisabled, true);
  assert.equal(controls.reconnectDisabled, false);
  assert.equal(controls.logoutDisabled, false);
  assert.equal(controls.inspectDisabled, false);
  assert.equal(controls.applyDisabled, true);
  assert.equal(controls.explainDisabled, true);
  assert.equal(controls.status, 'connected');
});
