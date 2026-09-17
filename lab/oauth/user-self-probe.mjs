import crypto from 'node:crypto';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const issuer = required('AUTH_ISSUER');
const issuerUrl = new URL(issuer);
const resourceUri = required('RESOURCE_URI');
const userClientId = required('USER_CLIENT_ID');
const userClientSecret = required('USER_CLIENT_SECRET');
const labUser = required('LAB_USER');
const labPassword = required('LAB_PASSWORD');
const redirectUris = JSON.parse(required('USER_REDIRECT_URIS_JSON'));
const redirectUri = redirectUris[0];
const userScope = 'mcp:tools mcp:resources safeops:read safeops:apply';
const cookies = new Map();

function cookieHeader() {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}
function cookieNames() {
  return [...cookies.keys()].sort();
}
function storeCookies(headers) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  for (const raw of values) {
    const first = raw.split(';', 1)[0];
    const index = first.indexOf('=');
    if (index <= 0) continue;
    const name = first.slice(0, index).trim();
    const value = first.slice(index + 1).trim();
    if (!value) cookies.delete(name);
    else cookies.set(name, value);
  }
}
async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = cookieHeader();
  if (cookie) headers.set('cookie', cookie);
  const response = await fetch(url, { ...options, headers, redirect: 'manual' });
  storeCookies(response.headers);
  return response;
}
function absolute(location) {
  if (!location) throw new Error('expected redirect location');
  return new URL(location, issuer).toString();
}
function classifyUrl(value) {
  const url = new URL(value, issuer);
  let pathClass = 'other';
  if (url.pathname === '/auth') pathClass = 'authorize';
  else if (url.pathname.startsWith('/auth/')) pathClass = 'authorization_resume';
  else if (url.pathname.startsWith('/interaction/')) pathClass = 'interaction';
  else if (url.origin + url.pathname === new URL(redirectUri).origin + new URL(redirectUri).pathname) pathClass = 'registered_callback';
  return {
    scheme: url.protocol,
    issuer_origin_match: url.origin === issuerUrl.origin,
    path_class: pathClass,
  };
}
function uidFromInteraction(location) {
  const url = new URL(location, issuer);
  const match = url.pathname.match(/^\/interaction\/([^/]+)$/);
  if (!match) throw new Error(`expected interaction redirect, got path class ${classifyUrl(url).path_class}`);
  return match[1];
}
function verifier() {
  return crypto.randomBytes(48).toString('base64url');
}
function challenge(value) {
  return crypto.createHash('sha256').update(value).digest('base64url');
}
function decodeJwt(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('access token is not a JWT');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}
function assertUserClaims(claims) {
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud].filter(Boolean);
  const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\s+/).filter(Boolean) : [];
  const pass = claims.iss === issuer
    && audience.includes(resourceUri)
    && (claims.client_id === userClientId || claims.azp === userClientId)
    && claims.sub === labUser
    && ['mcp:tools', 'mcp:resources', 'safeops:read', 'safeops:apply'].every(scope => scopes.includes(scope))
    && typeof claims.exp === 'number';
  if (!pass) throw new Error('user token claims did not match B2 contract');
  return { scopes, audience };
}
async function parseMcp(response) {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return JSON.parse(text);
  if (contentType.includes('text/event-stream')) {
    const messages = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { messages.push(JSON.parse(data)); } catch {}
    }
    return messages.at(-1) ?? null;
  }
  throw new Error(`unsupported MCP content-type ${contentType}`);
}
async function mcpPost(token, payload, sessionId, protocolVersion) {
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  if (protocolVersion) headers['mcp-protocol-version'] = protocolVersion;
  const response = await fetch(resourceUri, { method: 'POST', headers, body: JSON.stringify(payload) });
  return { response, payload: await parseMcp(response) };
}
async function initializeMcp(token, id) {
  const init = await mcpPost(token, {
    jsonrpc: '2.0', id, method: 'initialize',
    params: {
      protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: { name: 'safeops-b2-user-self-probe', version: '0.1' },
    },
  });
  if (!init.response.ok || !init.payload?.result) throw new Error(`SafeOps user initialize failed HTTP ${init.response.status}`);
  const sessionId = init.response.headers.get('mcp-session-id');
  if (!sessionId) throw new Error('SafeOps user initialize returned no MCP session id');
  const protocolVersion = init.payload.result.protocolVersion || '2025-11-25';
  await mcpPost(token, { jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId, protocolVersion);
  return { init, sessionId, protocolVersion };
}

const codeVerifier = verifier();
const state = crypto.randomBytes(20).toString('base64url');
const authUrl = new URL('/auth', issuer);
authUrl.search = new URLSearchParams({
  client_id: userClientId,
  response_type: 'code',
  redirect_uri: redirectUri,
  scope: userScope,
  code_challenge: challenge(codeVerifier),
  code_challenge_method: 'S256',
  resource: resourceUri,
  state,
}).toString();

const auth = await request(authUrl);
if (![302, 303].includes(auth.status)) throw new Error(`authorization start returned HTTP ${auth.status}`);
let location = absolute(auth.headers.get('location'));
let uid = uidFromInteraction(location);

const login = await request(new URL(`/interaction/${uid}/login`, issuer), {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ user: labUser, password: labPassword }),
});
if (![302, 303].includes(login.status)) throw new Error(`login interaction returned HTTP ${login.status}`);
location = absolute(login.headers.get('location'));
const loginRedirectClass = classifyUrl(location);

let resume = await request(location);
if (![302, 303].includes(resume.status)) {
  throw new Error(`post-login resume HTTP ${resume.status}; redirect=${JSON.stringify(loginRedirectClass)}; response=${JSON.stringify(classifyUrl(resume.url))}; cookies=${JSON.stringify(cookieNames())}; content_type=${resume.headers.get('content-type') || 'none'}`);
}
location = absolute(resume.headers.get('location'));
uid = uidFromInteraction(location);

const consent = await request(new URL(`/interaction/${uid}/confirm`, issuer), {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(),
});
if (![302, 303].includes(consent.status)) throw new Error(`consent interaction returned HTTP ${consent.status}`);
location = absolute(consent.headers.get('location'));
const consentRedirectClass = classifyUrl(location);

resume = await request(location);
if (![302, 303].includes(resume.status)) {
  throw new Error(`post-consent resume HTTP ${resume.status}; redirect=${JSON.stringify(consentRedirectClass)}; response=${JSON.stringify(classifyUrl(resume.url))}; cookies=${JSON.stringify(cookieNames())}; content_type=${resume.headers.get('content-type') || 'none'}`);
}
location = absolute(resume.headers.get('location'));
const callback = new URL(location);
if (callback.origin + callback.pathname !== new URL(redirectUri).origin + new URL(redirectUri).pathname) throw new Error('authorization did not return to registered redirect URI');
if (callback.searchParams.get('state') !== state) throw new Error('authorization state mismatch');
const code = callback.searchParams.get('code');
if (!code) throw new Error(`authorization returned error ${callback.searchParams.get('error') || 'without code'}`);

const basic = `Basic ${Buffer.from(`${userClientId}:${userClientSecret}`).toString('base64')}`;
const tokenResponse = await fetch(new URL('/token', issuer), {
  method: 'POST',
  headers: { authorization: basic, 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    resource: resourceUri,
  }),
});
const tokenBody = await tokenResponse.json();
if (!tokenResponse.ok) throw new Error(`authorization_code token exchange failed HTTP ${tokenResponse.status}: ${tokenBody.error || 'unknown_error'}`);
if (!tokenBody.access_token || !tokenBody.refresh_token) throw new Error('authorization_code exchange did not return access+refresh tokens');
if (String(tokenBody.token_type || '').toLowerCase() !== 'bearer') throw new Error('user token is not Bearer');
const claims = decodeJwt(tokenBody.access_token);
const { scopes } = assertUserClaims(claims);

const userMcp = await initializeMcp(tokenBody.access_token, 11);
const inspect = await mcpPost(tokenBody.access_token, {
  jsonrpc: '2.0', id: 12, method: 'tools/call',
  params: { name: 'safeops_inspect_workspace', arguments: { target_id: 'b2-user-actor-context-probe' } },
}, userMcp.sessionId, userMcp.protocolVersion);
const toolError = inspect.payload?.error?.message || '';
if (toolError.includes('Authenticated ActorContext is required')) throw new Error('valid user token did not create ActorContext');

const refreshResponse = await fetch(new URL('/token', issuer), {
  method: 'POST',
  headers: { authorization: basic, 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokenBody.refresh_token }),
});
const refreshBody = await refreshResponse.json();
if (!refreshResponse.ok) throw new Error(`refresh token exchange failed HTTP ${refreshResponse.status}: ${refreshBody.error || 'unknown_error'}`);
if (!refreshBody.access_token) throw new Error('refresh exchange returned no access token');
const refreshedClaims = decodeJwt(refreshBody.access_token);
assertUserClaims(refreshedClaims);
const refreshedMcp = await initializeMcp(refreshBody.access_token, 21);

console.error(`[B2_USER_SELF_PROBE] ${JSON.stringify({
  verdict: 'PASS',
  authorization_code_received: true,
  pkce_method: 'S256',
  resource_bound: true,
  token_http_status: tokenResponse.status,
  bearer_token: true,
  refresh_token_present: true,
  claims: {
    iss_match: claims.iss === issuer,
    resource_match: (Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(resourceUri),
    client_match: claims.client_id === userClientId || claims.azp === userClientId,
    subject_match: claims.sub === labUser,
    scopes,
    exp_present: typeof claims.exp === 'number',
  },
  mcp_user: {
    http_status: userMcp.init.response.status,
    session_id_returned: true,
    protocol_version: userMcp.protocolVersion,
    server_name: userMcp.init.payload.result.serverInfo?.name || null,
    auth_accepted: true,
    actor_context_created: !toolError.includes('Authenticated ActorContext is required'),
  },
  refresh: {
    http_status: refreshResponse.status,
    resource_parameter_omitted: true,
    refreshed_access_token_present: true,
    mcp_http_status: refreshedMcp.init.response.status,
    mcp_auth_accepted: true,
  },
})}`);
