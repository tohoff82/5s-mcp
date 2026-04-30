import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPlatform, optionalExec } from '../src/platform-capabilities.js';

test('platform helper reports current platform shape', () => {
  const platform = currentPlatform();
  assert.equal(typeof platform.platform, 'string');
  assert.equal(typeof platform.is_linux, 'boolean');
  assert.equal(typeof platform.is_macos, 'boolean');
});

test('optionalExec reports unsupported command without throwing', async () => {
  const result = await optionalExec('definitely-not-a-5s-command');
  assert.equal(result.status, 'unsupported');
  assert.match(result.reason, /not available/);
});
