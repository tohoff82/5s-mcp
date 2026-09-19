import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DemoSessionStore } from './lib/demo-session.mjs';
import { OAuthClient } from './lib/oauth.mjs';
import { DemoMcpClient } from './lib/mcp-client.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, 'public');

export function buildConfig(env = process.env) {
  return Object.freeze({
    host: env.HOST || '127.0.0.1',
    port: parsePort(env.PORT || '4173'),
    resourceUri: requireUrl(env.SAFEOPS_RESOURCE_URI, 'SAFEOPS_RESOURCE_URI'),
    authorizationEndpoint: requireUrl(env.DEMO_OAUTH_AUTHORIZATION_ENDPOINT, 'DEMO_OAUTH_AUTHORIZATION_ENDPOINT'),
    tokenEndpoint: requireUrl(env.DEMO_OAUTH_TOKEN_ENDPOINT, 'DEMO_OAUTH_TOKEN_ENDPOINT'),
    clientId: requireString(env.DEMO_OAUTH_CLIENT_ID, 'DEMO_OAUTH_CLIENT_ID'),
    clientSecret: requireString(env.DEMO_OAUTH_CLIENT_SECRET, 'DEMO_OAUTH_CLIENT_SECRET'),
    redirectUri: requireUrl(env.DEMO_OAUTH_REDIRECT_URI, 'DEMO_OAUTH_REDIRECT_URI'),
    targetId: requireString(env.DEMO_TARGET_ID || 'demo', 'DEMO_TARGET_ID'),
    cookieSecure: env.DEMO_COOKIE_SECURE === 'true'
  });
}

export function createDemoServer({
  config,
  sessionStore = new DemoSessionStore(),
  oauthClient = null,
  mcpFactory = null
}) {
  oauthClient ||= new OAuthClient({
    authorizationEndpoint: config.authorizationEndpoint,
    tokenEndpoint: config.tokenEndpoint,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    resource: config.resourceUri
  });
  mcpFactory ||= session => new DemoMcpClient({
    resourceUri: config.resourceUri,
    oauthClient,
    session
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://safeops.demo');
    try {
      const session = resolveSession(req, res, sessionStore, config);
      if (req.method === 'GET' && url.pathname === '/') return serveAsset(res, 'index.html', 'text/html; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/app.js') return serveAsset(res, 'app.js', 'text/javascript; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/styles.css') return serveAsset(res, 'styles.css', 'text/css; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/api/session') {
        return sendJson(res, 200, sessionView(session));
      }
      if (req.method === 'GET' && url.pathname === '/oauth/start') {
        const location = oauthClient.begin(session, { redirectUri: config.redirectUri });
        return redirect(res, location);
      }
      if (req.method === 'GET' && url.pathname === '/oauth/callback') {
        await oauthClient.exchange(session, {
          code: url.searchParams.get('code'),
          state: url.searchParams.get('state'),
          redirectUri: config.redirectUri
        });
        session.mcp = mcpFactory(session);
        await session.mcp.connect();
        return redirect(res, '/?connected=1');
      }
      if (req.method === 'POST' && url.pathname === '/api/inspect') {
        requireMcp(session);
        const result = await session.mcp.inspect({ targetId: config.targetId });
        return sendJson(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/approval') {
        requireMcp(session);
        const approval = session.mcp.issueApproval();
        return sendJson(res, 200, {
          approval_nonce: approval.nonce,
          expires_at: approval.expiresAt,
          workflow_id: approval.workflowId,
          plan_id: approval.planId
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/apply') {
        requireMcp(session);
        const body = await readJson(req);
        const result = await session.mcp.apply({ approvalNonce: requireString(body.approval_nonce, 'approval_nonce') });
        return sendJson(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/explain') {
        requireMcp(session);
        return sendJson(res, 200, await session.mcp.explain());
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        await sessionStore.destroy(session.id);
        clearSessionCookie(res, config);
        return sendJson(res, 200, { logged_out: true });
      }
      return sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      console.error('[SafeOps Participant Demo]', error);
      return sendJson(res, 400, {
        error: 'demo_request_failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  async function serveAsset(res, file, contentType) {
    const body = await fs.readFile(path.join(publicDir, file));
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': body.length,
      'cache-control': 'no-store'
    });
    res.end(body);
  }
}

function resolveSession(req, res, store, config) {
  const sid = parseCookies(req.headers.cookie || '').safeops_demo_sid;
  const session = store.getOrCreate(sid);
  if (session.id !== sid) setSessionCookie(res, session.id, config);
  return session;
}

function sessionView(session) {
  return {
    participant_surface: true,
    amazon_hosted_alexa: false,
    authenticated: Boolean(session.tokens?.access_token),
    mcp_connected: Boolean(session.mcp),
    current: session.current
  };
}

function requireMcp(session) {
  if (!session.mcp) throw new Error('Connect user OAuth before using SafeOps');
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request body too large');
  }
  return body ? JSON.parse(body) : {};
}

function parseCookies(header) {
  const result = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return result;
}

function setSessionCookie(res, id, config) {
  const secure = config.cookieSecure ? '; Secure' : '';
  res.setHeader('set-cookie', `safeops_demo_sid=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearSessionCookie(res, config) {
  const secure = config.cookieSecure ? '; Secure' : '';
  res.setHeader('set-cookie', `safeops_demo_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { location, 'cache-control': 'no-store' });
  res.end();
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535');
  return port;
}

function requireUrl(value, label) {
  return new URL(requireString(value, label)).toString();
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required`);
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = buildConfig();
  const server = createDemoServer({ config });
  server.listen(config.port, config.host, () => {
    console.error(`[SafeOps Participant Demo] listening on ${config.host}:${config.port}`);
  });
}
