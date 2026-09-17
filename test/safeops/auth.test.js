import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenValidator } from '../../src/safeops/auth/token-validator.js';
import { runtimeContextFromAuthInfo } from '../../src/safeops/auth/middleware.js';
import { buildProtectedResourceMetadata } from '../../src/safeops/auth/protected-resource-metadata.js';

const resource = 'https://safeops.example/mcp';

function validator(claims) {
  return new TokenValidator({ verifyToken: async () => claims, issuer: 'https://issuer.example', resource, requiredScopes: ['safeops.connect'], now: () => 1000 });
}

test('token validator fails closed when no verifier is configured', () => {
  assert.throws(() => new TokenValidator(), /verifyToken/);
});

test('token validator establishes service trust and preserves optional user subject separately', async () => {
  const authInfo = await validator({ iss: 'https://issuer.example', exp: 2000, aud: resource, client_id: 'alexa-service', scope: 'safeops.connect safeops.user', sub: 'alice' }).verifyAuthorizationHeader('Bearer token-value');
  const runtime = runtimeContextFromAuthInfo(authInfo, { requiredUserScope: 'safeops.user' });
  assert.equal(runtime.serviceContext.service_identity, 'alexa-service');
  assert.equal(runtime.actorContext.actor_id, 'alice');
  const serviceOnly = await validator({ iss: 'https://issuer.example', exp: 2000, aud: resource, client_id: 'alexa-service', scope: 'safeops.connect' }).verifyAuthorizationHeader('Bearer service-token');
  assert.equal(runtimeContextFromAuthInfo(serviceOnly, { requiredUserScope: 'safeops.user' }).actorContext, null);
});

test('token validator rejects expired, wrong-resource, and missing-scope claims', async () => {
  await assert.rejects(() => validator({ iss: 'https://issuer.example', exp: 999, aud: resource, client_id: 'c', scope: 'safeops.connect' }).verifyAuthorizationHeader('Bearer x'), /expired/);
  await assert.rejects(() => validator({ iss: 'https://issuer.example', exp: 2000, aud: 'https://other.example', client_id: 'c', scope: 'safeops.connect' }).verifyAuthorizationHeader('Bearer x'), /resource mismatch/);
  await assert.rejects(() => validator({ iss: 'https://issuer.example', exp: 2000, aud: resource, client_id: 'c', scope: 'other' }).verifyAuthorizationHeader('Bearer x'), /Missing required scope/);
});

test('protected resource metadata binds resource and authorization server', () => {
  const metadata = buildProtectedResourceMetadata({ resource, authorizationServers: ['https://issuer.example'], scopesSupported: ['safeops.connect', 'safeops.user'] });
  assert.equal(metadata.resource, resource);
  assert.deepEqual(metadata.authorization_servers, ['https://issuer.example']);
});
