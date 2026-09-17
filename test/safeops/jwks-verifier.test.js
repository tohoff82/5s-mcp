import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createJwksJwtVerifier } from '../../src/safeops/auth/jwks-verifier.js';

const issuer = 'https://issuer.example';

function keyMaterial(kid = 'key-1') {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  return { privateKey, jwk: { ...jwk, kid, alg: 'RS256', use: 'sig' } };
}

function compactJwt(privateKey, payload, { kid = 'key-1', alg = 'RS256' } = {}) {
  const header = Buffer.from(JSON.stringify({ alg, kid, typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const input = `${header}.${body}`;
  const signature = sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  return `${input}.${signature}`;
}

test('JWKS verifier validates a signed access token and caches the key set', async () => {
  const { privateKey, jwk } = keyMaterial();
  let fetches = 0;
  const verifier = createJwksJwtVerifier({
    issuer,
    jwksUri: `${issuer}/.well-known/jwks.json`,
    fetchImpl: async () => ({ ok: true, status: 200, async json() { fetches += 1; return { keys: [jwk] }; } })
  });
  const token = compactJwt(privateKey, { iss: issuer, exp: 2_000_000_000, aud: 'https://safeops.example/mcp', client_id: 'alexa-service', scope: 'mcp:service' });
  assert.equal((await verifier(token)).client_id, 'alexa-service');
  assert.equal((await verifier(token)).aud, 'https://safeops.example/mcp');
  assert.equal(fetches, 1);
});

test('JWKS verifier rejects wrong signatures and issuer mismatch', async () => {
  const first = keyMaterial();
  const second = keyMaterial();
  const verifier = createJwksJwtVerifier({
    issuer,
    jwksUri: `${issuer}/jwks`,
    fetchImpl: async () => ({ ok: true, status: 200, async json() { return { keys: [first.jwk] }; } })
  });
  const forged = compactJwt(second.privateKey, { iss: issuer, exp: 2_000_000_000 }, { kid: first.jwk.kid });
  await assert.rejects(() => verifier(forged), /signature verification failed/);
  const wrongIssuer = compactJwt(first.privateKey, { iss: 'https://other.example', exp: 2_000_000_000 });
  await assert.rejects(() => verifier(wrongIssuer), /issuer mismatch/);
});

test('JWKS verifier refreshes once for an unknown kid and then fails closed', async () => {
  const { privateKey, jwk } = keyMaterial('known');
  let fetches = 0;
  const verifier = createJwksJwtVerifier({
    issuer,
    jwksUri: `${issuer}/jwks`,
    fetchImpl: async () => ({ ok: true, status: 200, async json() { fetches += 1; return { keys: [jwk] }; } })
  });
  const token = compactJwt(privateKey, { iss: issuer, exp: 2_000_000_000 }, { kid: 'unknown' });
  await assert.rejects(() => verifier(token), /signing key not found/);
  assert.equal(fetches, 2);
});
