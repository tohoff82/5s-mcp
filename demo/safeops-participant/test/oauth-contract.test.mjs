import test from 'node:test';
import assert from 'node:assert/strict';
import { OAuthClient } from '../lib/oauth.mjs';

test('authorization request uses PKCE S256 and exact resource binding', () => {
  const oauth = buildOAuth(async () => { throw new Error('unexpected fetch'); });
  const session = {};
  const location = new URL(oauth.begin(session, { redirectUri: 'http://127.0.0.1:4173/oauth/callback' }));

  assert.equal(location.origin + location.pathname, 'https://auth.example/authorize');
  assert.equal(location.searchParams.get('response_type'), 'code');
  assert.equal(location.searchParams.get('client_id'), 'demo-client');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(location.searchParams.get('code_challenge'));
  assert.equal(location.searchParams.get('resource'), 'https://safeops.example/mcp');
  assert.equal(location.searchParams.has('client_secret'), false);
  assert.ok(session.oauth_attempt.verifier);
});

test('token exchange keeps credentials out of URL and carries code_verifier/resource in POST body', async () => {
  let request;
  const oauth = buildOAuth(async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      token_type: 'Bearer',
      expires_in: 3600
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const session = {};
  const redirectUri = 'http://127.0.0.1:4173/oauth/callback';
  const location = new URL(oauth.begin(session, { redirectUri }));
  const state = location.searchParams.get('state');

  await oauth.exchange(session, { code: 'code-1', state, redirectUri });
  assert.equal(request.url, 'https://auth.example/token');
  assert.match(request.init.headers.authorization, /^Basic /);
  const body = request.init.body;
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('code'), 'code-1');
  assert.ok(body.get('code_verifier'));
  assert.equal(body.get('resource'), 'https://safeops.example/mcp');
  assert.equal(new URL(request.url).search, '');
  assert.equal(session.tokens.access_token, 'access-1');
});

test('expired access token refreshes before authorized MCP fetch', async () => {
  let now = 10_000;
  const calls = [];
  const oauth = buildOAuth(async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === 'https://auth.example/token') {
      return new Response(JSON.stringify({
        access_token: 'access-2',
        token_type: 'Bearer',
        expires_in: 3600
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  }, () => now);
  const session = {
    tokens: {
      access_token: 'expired',
      refresh_token: 'refresh-1',
      token_type: 'Bearer',
      scope: null,
      expires_at: now - 1
    }
  };

  await oauth.authorizedFetch(session, 'https://safeops.example/mcp', { method: 'POST' });
  const tokenBody = calls[0].init.body;
  assert.equal(tokenBody.get('grant_type'), 'refresh_token');
  assert.equal(tokenBody.get('resource'), 'https://safeops.example/mcp');
  assert.equal(calls[1].init.headers.get('authorization'), 'Bearer access-2');
});

function buildOAuth(fetchImpl, now = () => Date.now()) {
  return new OAuthClient({
    authorizationEndpoint: 'https://auth.example/authorize',
    tokenEndpoint: 'https://auth.example/token',
    clientId: 'demo-client',
    clientSecret: 'demo-secret',
    resource: 'https://safeops.example/mcp',
    fetchImpl,
    now
  });
}
