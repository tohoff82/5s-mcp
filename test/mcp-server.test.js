import test from 'node:test';
import assert from 'node:assert/strict';
import { FiveSMcpServer } from '../src/mcp-server/server.js';
import { PACKAGE_VERSION } from '../src/version.js';

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
  assert.equal(server.server._serverInfo.version, PACKAGE_VERSION);
  assert.equal(server.tools.get('seiri_sort_analyze').inputSchema.properties.path.default, '.');
  assert.equal(server.tools.get('seiton_organize_system').inputSchema.properties.target_path.default, '.');

  for (const tool of server.tools.values()) {
    assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
    assert.equal(typeof tool.annotations.destructiveHint, 'boolean');
    assert.equal(typeof tool.annotations.idempotentHint, 'boolean');
  }
});
