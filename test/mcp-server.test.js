import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
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

test('destructive tool failures keep details in stderr and return a generic MCP error', async () => {
  const server = new FiveSMcpServer();
  const tool = server.tools.get('seiso_clean_system');
  const sensitiveMessage = 'backup failed at /private/operator/path';
  server.tools.set(tool.name, {
    ...tool,
    execute: async () => {
      throw new Error(sensitiveMessage);
    }
  });

  const stderr = [];
  const originalConsoleError = console.error;
  console.error = (...args) => stderr.push(args.map(String).join(' '));

  try {
    await assert.rejects(
      server.handleToolCall({
        params: {
          name: tool.name,
          arguments: { action: 'apply', plan_id: 'synthetic-plan', approved: true }
        }
      }),
      error => {
        assert.equal(error.code, ErrorCode.InternalError);
        assert.match(error.message, /Tool execution failed$/);
        assert.doesNotMatch(error.message, /private\/operator\/path/);
        return true;
      }
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(stderr.join('\n'), /seiso_clean_system/);
  assert.match(stderr.join('\n'), /backup failed at \/private\/operator\/path/);
});
