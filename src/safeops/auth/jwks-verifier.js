import { constants, createPublicKey, verify as verifySignature } from 'node:crypto';

const SUPPORTED_ALGORITHMS = new Set(['RS256', 'PS256', 'ES256']);

export function createJwksJwtVerifier({ issuer, jwksUri, fetchImpl = globalThis.fetch, cacheTtlMs = 300_000 } = {}) {
  requireUrl(issuer, 'issuer');
  requireUrl(jwksUri, 'jwksUri');
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl is required');
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) throw new Error('cacheTtlMs must be a non-negative number');

  let cache = null;

  async function loadJwks(force = false) {
    const now = Date.now();
    if (!force && cache && now - cache.loadedAt <= cacheTtlMs) return cache.keys;
    const response = await fetchImpl(jwksUri, { headers: { accept: 'application/json' } });
    if (!response?.ok) throw new Error(`JWKS fetch failed: ${response?.status ?? 'unknown'}`);
    const document = await response.json();
    if (!document || !Array.isArray(document.keys) || document.keys.length === 0) throw new Error('JWKS response contains no keys');
    cache = { loadedAt: now, keys: document.keys };
    return cache.keys;
  }

  async function findKey(header) {
    if (typeof header.kid !== 'string' || header.kid.length === 0) throw new Error('JWT kid is required');
    let keys = await loadJwks(false);
    let jwk = keys.find(key => key.kid === header.kid && (!key.alg || key.alg === header.alg));
    if (!jwk) {
      keys = await loadJwks(true);
      jwk = keys.find(key => key.kid === header.kid && (!key.alg || key.alg === header.alg));
    }
    if (!jwk) throw new Error(`JWT signing key not found: ${header.kid}`);
    return jwk;
  }

  return async function verifyToken(jwt) {
    if (typeof jwt !== 'string' || jwt.length === 0) throw new Error('JWT access token is required');
    const parts = jwt.split('.');
    if (parts.length !== 3) throw new Error('Access token must be a compact JWT');
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJson(encodedHeader, 'JWT header');
    if (!SUPPORTED_ALGORITHMS.has(header.alg)) throw new Error(`Unsupported JWT algorithm: ${header.alg || 'missing'}`);
    const jwk = await findKey(header);
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    const input = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (!verifyByAlgorithm(header.alg, input, key, signature)) throw new Error('JWT signature verification failed');
    const claims = decodeJson(encodedPayload, 'JWT payload');
    if (claims.iss !== issuer) throw new Error('JWT issuer mismatch');
    return claims;
  };
}

function verifyByAlgorithm(algorithm, input, key, signature) {
  if (algorithm === 'RS256') return verifySignature('RSA-SHA256', input, key, signature);
  if (algorithm === 'PS256') return verifySignature('sha256', input, { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, signature);
  if (algorithm === 'ES256') return verifySignature('sha256', input, { key, dsaEncoding: 'ieee-p1363' }, signature);
  return false;
}

function decodeJson(segment, label) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function requireUrl(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
  new URL(value);
}
