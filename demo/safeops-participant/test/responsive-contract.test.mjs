import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemoServer } from '../server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const config = {
  host: '127.0.0.1',
  port: 0,
  resourceUri: 'https://safeops.example/mcp',
  authorizationEndpoint: 'https://auth.example/authorize',
  tokenEndpoint: 'https://auth.example/token',
  clientId: 'demo-client',
  clientSecret: 'demo-secret',
  redirectUri: 'http://127.0.0.1/oauth/callback',
  targetId: 'demo',
  cookieSecure: false
};

test('responsive transcript and technical receipt cannot force intrinsic page width', async () => {
  const css = await fs.readFile(path.join(root, 'public/styles.css'), 'utf8');

  assert.match(css, /\.transcript\s*\{[^}]*min-width:\s*0;/s);
  assert.match(css, /\.transcript\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(css, /\.message\s*\{[^}]*max-width:\s*100%;/s);
  assert.match(css, /\.message\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(css, /\.conversation\s*\{[^}]*max-width:\s*100%;/s);
  assert.match(css, /\.controls\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.signal-grid\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.technical\s*\{[^}]*max-width:\s*100%;/s);
  assert.match(css, /pre\s*\{[^}]*max-width:\s*100%;/s);
  assert.match(css, /pre\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
});

test('presentation module is served as a bounded static asset', async t => {
  const server = createDemoServer({
    config,
    oauthClient: {
      begin() { return 'https://auth.example/authorize'; },
      async exchange() {}
    },
    mcpFactory: () => ({
      async connect() {},
      async close() {}
    })
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/presentation.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/javascript/);
  const source = await response.text();
  assert.match(source, /summarizeExplanation/);
  assert.match(source, /technicalReceipt/);
});
