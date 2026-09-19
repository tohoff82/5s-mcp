import crypto from 'node:crypto';

export class OAuthClient {
  constructor({
    authorizationEndpoint,
    tokenEndpoint,
    clientId,
    clientSecret,
    resource,
    scopes = ['mcp:tools', 'mcp:resources', 'safeops:read', 'safeops:apply'],
    fetchImpl = globalThis.fetch,
    now = () => Date.now()
  }) {
    this.authorizationEndpoint = requireUrl(authorizationEndpoint, 'authorizationEndpoint');
    this.tokenEndpoint = requireUrl(tokenEndpoint, 'tokenEndpoint');
    this.clientId = requireString(clientId, 'clientId');
    this.clientSecret = requireString(clientSecret, 'clientSecret');
    this.resource = requireUrl(resource, 'resource');
    this.scopes = [...scopes];
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  begin(session, { redirectUri }) {
    redirectUri = requireUrl(redirectUri, 'redirectUri');
    const verifier = randomBase64Url(48);
    const state = randomBase64Url(24);
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    session.oauth_attempt = {
      state,
      verifier,
      redirectUri,
      expiresAt: this.now() + 5 * 60_000
    };
    const url = new URL(this.authorizationEndpoint);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: this.resource
    }).toString();
    return url.toString();
  }

  async exchange(session, { code, state, redirectUri }) {
    const attempt = session.oauth_attempt;
    if (!attempt) throw new Error('OAuth attempt is missing');
    if (attempt.expiresAt <= this.now()) throw new Error('OAuth attempt expired');
    if (!safeEqual(state, attempt.state)) throw new Error('OAuth state mismatch');
    if (requireUrl(redirectUri, 'redirectUri') !== attempt.redirectUri) throw new Error('OAuth redirect mismatch');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: requireString(code, 'code'),
      redirect_uri: attempt.redirectUri,
      code_verifier: attempt.verifier,
      resource: this.resource
    });
    const token = await this.requestToken(body);
    session.oauth_attempt = null;
    session.tokens = normalizeToken(token, this.now());
    return session.tokens;
  }

  async ensureAccessToken(session) {
    const token = session.tokens;
    if (!token?.access_token) throw new Error('User OAuth token is missing');
    if (!token.expires_at || token.expires_at - this.now() > 30_000) return token.access_token;
    if (!token.refresh_token) throw new Error('Access token expired and no refresh token is available');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      resource: this.resource
    });
    const refreshed = normalizeToken(await this.requestToken(body), this.now(), token.refresh_token);
    session.tokens = refreshed;
    return refreshed.access_token;
  }

  async authorizedFetch(session, input, init = {}) {
    const accessToken = await this.ensureAccessToken(session);
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    for (const [name, value] of new Headers(init.headers || {})) headers.set(name, value);
    headers.set('authorization', `Bearer ${accessToken}`);
    return this.fetchImpl(input, { ...init, headers });
  }

  async requestToken(body) {
    const response = await this.fetchImpl(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`OAuth token endpoint returned HTTP ${response.status}`);
    if (typeof payload.access_token !== 'string' || !payload.access_token) throw new Error('OAuth token response has no access token');
    if (String(payload.token_type || '').toLowerCase() !== 'bearer') throw new Error('OAuth token response is not Bearer');
    return payload;
  }
}

function normalizeToken(payload, now, fallbackRefreshToken = null) {
  const expiresIn = Number(payload.expires_in || 0);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || fallbackRefreshToken || null,
    token_type: 'Bearer',
    scope: payload.scope || null,
    expires_at: expiresIn > 0 ? now + expiresIn * 1000 : null
  };
}

function randomBase64Url(bytes) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireUrl(value, label) {
  const string = requireString(value, label);
  return new URL(string).toString();
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
  return value;
}
