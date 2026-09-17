import http from 'node:http';
import crypto from 'node:crypto';
import Provider, { errors } from 'oidc-provider';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const issuer = process.env.AUTH_ISSUER || `https://${required('RAILWAY_PUBLIC_DOMAIN')}`;
const resourceUri = required('RESOURCE_URI');
const serviceClientId = required('SERVICE_CLIENT_ID');
const serviceClientSecret = required('SERVICE_CLIENT_SECRET');
const userClientId = required('USER_CLIENT_ID');
const userClientSecret = required('USER_CLIENT_SECRET');
const labUser = required('LAB_USER');
const labPassword = required('LAB_PASSWORD');
const cookieKey = required('COOKIE_KEY');
const redirectUris = JSON.parse(required('USER_REDIRECT_URIS_JSON'));

if (!Array.isArray(redirectUris) || redirectUris.length === 0) throw new Error('USER_REDIRECT_URIS_JSON must be a non-empty JSON array');
new URL(issuer);
new URL(resourceUri);
for (const uri of redirectUris) new URL(uri);

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 0x10001,
});
const signingJwk = privateKey.export({ format: 'jwk' });
signingJwk.kid = crypto.randomBytes(12).toString('base64url');
signingJwk.use = 'sig';
signingJwk.alg = 'RS256';
const jwks = { keys: [signingJwk] };

const serviceScope = 'mcp:service';
const userScopes = ['mcp:tools', 'mcp:resources', 'safeops:read', 'safeops:apply'];
const userScope = userScopes.join(' ');

const provider = new Provider(issuer, {
  clients: [
    {
      client_id: serviceClientId,
      client_secret: serviceClientSecret,
      grant_types: ['client_credentials'],
      token_endpoint_auth_method: 'client_secret_basic',
      scope: serviceScope,
    },
    {
      client_id: userClientId,
      client_secret: userClientSecret,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'client_secret_basic',
      scope: userScope,
    },
  ],
  scopes: [serviceScope, ...userScopes],
  jwks,
  cookies: { keys: [cookieKey] },
  features: {
    clientCredentials: { enabled: true },
    devInteractions: { enabled: false },
    resourceIndicators: {
      enabled: true,
      defaultResource() { return undefined; },
      getResourceServerInfo(_ctx, resource, client) {
        if (resource !== resourceUri) throw new errors.InvalidTarget();
        const scope = client.clientId === serviceClientId ? serviceScope : userScope;
        return {
          audience: resourceUri,
          accessTokenFormat: 'jwt',
          accessTokenTTL: 3600,
          scope,
        };
      },
      useGrantedResource() { return true; },
    },
  },
  issueRefreshToken(_ctx, client) {
    return client.clientId === userClientId && client.grantTypeAllowed('refresh_token');
  },
  pkce: {
    required(_ctx, client) { return client.clientId === userClientId; },
  },
  interactions: {
    url(_ctx, interaction) { return `/interaction/${interaction.uid}`; },
  },
  async findAccount(_ctx, id) {
    return {
      accountId: id,
      async claims() { return { sub: id }; },
    };
  },
});

provider.proxy = true;
const providerCallback = provider.callback();

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}
function safeEqual(a, b) {
  return crypto.timingSafeEqual(digest(a), digest(b));
}
function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function sendHtml(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function readForm(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16384) throw new Error('request body too large');
  }
  return new URLSearchParams(body);
}

async function handleInteraction(req, res, url) {
  const match = url.pathname.match(/^\/interaction\/([^/]+)(?:\/(login|confirm))?$/);
  if (!match) return false;
  const [, uid, action] = match;
  const details = await provider.interactionDetails(req, res);

  if (req.method === 'GET' && !action) {
    if (details.prompt.name === 'login') {
      sendHtml(res, 200, `<!doctype html><meta name="viewport" content="width=device-width"><title>SafeOps Lab Login</title><h1>SafeOps B2 Lab</h1><form method="post" action="/interaction/${htmlEscape(uid)}/login"><label>User <input name="user" autocomplete="username" required></label><br><label>Password <input name="password" type="password" autocomplete="current-password" required></label><br><button type="submit">Continue</button></form>`);
      return true;
    }
    if (details.prompt.name === 'consent') {
      const scope = htmlEscape(details.params.scope || '');
      const resource = htmlEscape(details.params.resource || '');
      sendHtml(res, 200, `<!doctype html><meta name="viewport" content="width=device-width"><title>SafeOps Lab Consent</title><h1>Authorize SafeOps Lab</h1><p>Scopes: ${scope}</p><p>Resource: ${resource}</p><form method="post" action="/interaction/${htmlEscape(uid)}/confirm"><button type="submit">Approve</button></form>`);
      return true;
    }
    sendJson(res, 400, { error: 'unsupported_interaction', prompt: details.prompt.name });
    return true;
  }

  if (req.method === 'POST' && action === 'login') {
    if (details.prompt.name !== 'login') throw new Error('login prompt not active');
    const form = await readForm(req);
    if (!safeEqual(form.get('user') || '', labUser) || !safeEqual(form.get('password') || '', labPassword)) {
      sendHtml(res, 401, '<h1>Invalid lab credentials</h1>');
      return true;
    }
    await provider.interactionFinished(req, res, { login: { accountId: labUser } }, { mergeWithLastSubmission: false });
    return true;
  }

  if (req.method === 'POST' && action === 'confirm') {
    if (details.prompt.name !== 'consent') throw new Error('consent prompt not active');
    const { params, prompt: { details: missing }, session } = details;
    let { grantId } = details;
    const grant = grantId
      ? await provider.Grant.find(grantId)
      : new provider.Grant({ accountId: session.accountId, clientId: params.client_id });
    if (missing.missingOIDCScope) grant.addOIDCScope(missing.missingOIDCScope.join(' '));
    if (missing.missingOIDCClaims) grant.addOIDCClaims(missing.missingOIDCClaims);
    if (missing.missingResourceScopes) {
      for (const [resource, scopes] of Object.entries(missing.missingResourceScopes)) grant.addResourceScope(resource, scopes.join(' '));
    }
    grantId = await grant.save();
    const consent = details.grantId ? {} : { grantId };
    await provider.interactionFinished(req, res, { consent }, { mergeWithLastSubmission: true });
    return true;
  }

  sendJson(res, 405, { error: 'method_not_allowed' });
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, issuer);
    if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, issuer, resource: resourceUri });
    if (url.pathname === '/lab/callback') return sendJson(res, 200, { code: url.searchParams.get('code'), state: url.searchParams.get('state') });
    if (await handleInteraction(req, res, url)) return;
    return providerCallback(req, res);
  } catch (error) {
    console.error('[SafeOps OAuth Lab]', error);
    if (!res.headersSent) sendJson(res, 500, { error: 'lab_server_error' });
    else res.end();
  }
});

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
server.listen(port, host, () => console.error(`[SafeOps OAuth Lab] listening on ${host}:${port} issuer=${issuer}`));
