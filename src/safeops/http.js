import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { DEMO_REPLAY_PATH } from './demo/replay-controller.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SafeOpsMcpServer } from './server.js';
import { authenticateRequest, runtimeContextFromAuthInfo } from './auth/middleware.js';

export function createSafeOpsHttpServer({ dependencies, tokenValidator, resourceMetadata, mcpPath = '/mcp', metadataPath = '/.well-known/oauth-protected-resource', requiredUserScope, demoReplay = null } = {}) {
  if (!dependencies) throw new Error('SafeOps dependencies are required');
  if (!tokenValidator) throw new Error('TokenValidator is required');
  if (!resourceMetadata) throw new Error('Protected resource metadata is required');

  const sessions = new Map();
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || '/', 'http://safeops.local').pathname;
    if (req.method === 'GET' && pathname === metadataPath) return sendJson(res, 200, resourceMetadata);
    if (demoReplay && (pathname === DEMO_REPLAY_PATH + '/prepare' || pathname === DEMO_REPLAY_PATH + '/release')) {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
      try {
        const authInfo = await authenticateRequest(req, tokenValidator);
        const input = await readDemoBody(req);
        if (pathname.endsWith('/prepare')) {
          const result = await demoReplay.prepare({ authInfo, targetRegistry: dependencies.targetRegistry, sessionId: input.session_id });
          return sendJson(res, 200, result);
        }
        const result = demoReplay.release({
          authInfo, targetRegistry: dependencies.targetRegistry,
          sessionId: input.session_id, token: input.lease_token
        });
        return sendJson(res, 200, result);
      } catch (error) {
        const status = Number.isInteger(error.status) ? error.status : Number.isInteger(error.statusCode) ? error.statusCode : 400;
        return sendJson(res, status, { error: error.code || 'demo_prepare_failed', message: error.message });
      }
    }
    if (pathname !== mcpPath) return sendJson(res, 404, { error: 'Not found' });
    if (!['POST', 'GET', 'DELETE'].includes(req.method || '')) {
      res.setHeader('Allow', 'POST, GET, DELETE');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    try {
      const authInfo = await authenticateRequest(req, tokenValidator);
      const leaseHeader = headerValue(req.headers['x-safeops-demo-lease']);
      req.auth = {
        ...authInfo,
        extra: { ...authInfo.extra, demoLeaseToken: leaseHeader }
      };
    } catch (error) {
      const status = Number.isInteger(error.statusCode) ? error.statusCode : 401;
      return sendJson(res, status, { error: 'unauthorized' });
    }

    const sessionId = headerValue(req.headers['mcp-session-id']);
    let session = sessionId ? sessions.get(sessionId) : null;
    if (sessionId && !session) return sendJson(res, 400, { error: 'invalid_session' });
    if (!session && req.method !== 'POST') return sendJson(res, 400, { error: 'missing_session' });

    if (!session) session = await createSession({ dependencies, requiredUserScope, sessions });

    try {
      await session.transport.handleRequest(req, res);
      if (!session.transport.sessionId) await closeUninitializedSession(session);
    } catch (error) {
      console.error('[SafeOps HTTP] request failed', error);
      if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
    }
  });

  server.on('close', () => {
    for (const session of sessions.values()) session.transport.close().catch(() => {});
    sessions.clear();
  });
  return server;
}

async function createSession({ dependencies, requiredUserScope, sessions }) {
  let session;
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: id => sessions.set(id, session)
  });
  const safeops = new SafeOpsMcpServer({
    dependencies,
    contextProvider: async (_request, extra) => runtimeContextFromAuthInfo(extra?.authInfo, { requiredUserScope })
  });
  session = { transport, safeops };
  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
  };
  await safeops.server.connect(transport);
  return session;
}

async function closeUninitializedSession(session) {
  await session.transport.close().catch(() => {});
  if (typeof session.safeops.server.close === 'function') await session.safeops.server.close().catch(() => {});
}

export async function listenSafeOpsHttp(server, { host = '127.0.0.1', port = 3000 } = {}) {
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve(server.address());
    });
  });
}

async function readDemoBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) throw new Error('Demo request too large');
  }
  const value = JSON.parse(body);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid demo request');
  return value;
}

function headerValue(value) {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function sendJson(res, statusCode, value) {
  if (res.writableEnded) return;
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}
