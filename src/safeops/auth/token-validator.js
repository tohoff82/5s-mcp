export class TokenValidator {
  constructor({ verifyToken, issuer, resource, requiredScopes = [], now = () => Date.now() / 1000 } = {}) {
    if (typeof verifyToken !== 'function') throw new Error('verifyToken function is required');
    if (issuer !== undefined && (typeof issuer !== 'string' || issuer.length === 0)) throw new Error('issuer must be a non-empty string');
    if (resource !== undefined) new URL(resource);
    if (!Array.isArray(requiredScopes) || requiredScopes.some(scope => typeof scope !== 'string' || scope.length === 0)) throw new Error('requiredScopes must be a string array');
    this.verifyToken = verifyToken;
    this.issuer = issuer;
    this.resource = resource;
    this.requiredScopes = [...requiredScopes];
    this.now = now;
  }

  async verifyAuthorizationHeader(header) {
    if (typeof header !== 'string' || !header.startsWith('Bearer ') || header.length <= 7) throw new AuthenticationError('Missing bearer token', 401);
    const accessToken = header.slice(7).trim();
    if (!accessToken) throw new AuthenticationError('Missing bearer token', 401);
    const claims = await this.verifyToken(accessToken);
    if (!claims || typeof claims !== 'object') throw new AuthenticationError('Token verification returned no claims', 401);
    if (this.issuer && claims.iss !== this.issuer) throw new AuthenticationError('Token issuer mismatch', 401);
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= this.now()) throw new AuthenticationError('Token expired or missing expiry', 401);
    if (this.resource && !claimContainsResource(claims, this.resource)) throw new AuthenticationError('Token resource mismatch', 401);
    const clientId = claims.client_id || claims.azp;
    if (typeof clientId !== 'string' || clientId.length === 0) throw new AuthenticationError('Token client identity missing', 401);
    const scopes = normalizeScopes(claims);
    const missingScopes = this.requiredScopes.filter(scope => !scopes.includes(scope));
    if (missingScopes.length > 0) throw new AuthenticationError(`Missing required scope: ${missingScopes.join(', ')}`, 403);
    return {
      ['token']: accessToken,
      clientId,
      scopes,
      expiresAt: claims.exp,
      resource: this.resource ? new URL(this.resource) : undefined,
      extra: {
        subject: typeof claims.sub === 'string' && claims.sub.length > 0 ? claims.sub : undefined,
        issuer: claims.iss,
        token_use: claims.token_use
      }
    };
  }
}

export class AuthenticationError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

function normalizeScopes(claims) {
  if (Array.isArray(claims.scp)) return [...new Set(claims.scp.filter(scope => typeof scope === 'string' && scope.length > 0))];
  if (typeof claims.scope === 'string') return [...new Set(claims.scope.split(/\s+/).filter(Boolean))];
  return [];
}

function claimContainsResource(claims, expected) {
  if (claims.resource === expected) return true;
  const audience = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  return audience.includes(expected);
}
