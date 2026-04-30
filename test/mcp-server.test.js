import test from 'node:test';
import assert from 'node:assert/strict';
import { FiveSMcpServer } from '../src/mcp-server/server.js';

test('MCP server registers production hardening tools', () => {
  const server = new FiveSMcpServer();
  const tools = Array.from(server.tools.keys());

  assert.ok(tools.includes('5s_safety_policy'));
  assert.ok(tools.includes('5s_cron_manager'));
  assert.ok(tools.includes('5s_remote_clean'));
  assert.ok(tools.includes('kaizen_improve'));
  assert.ok(tools.includes('gemba_inspect'));
  assert.ok(tools.includes('poka_yoke_guard'));
  assert.ok(tools.includes('lean_ops'));
  assert.ok(tools.includes('seiton_organize_system'));
  assert.equal(tools.length, 12);
});
