await import('./server.mjs');

if (process.env.B2_USER_SELF_PROBE === 'true') {
  setTimeout(() => {
    import('./user-self-probe-hardened.mjs').catch((error) => {
      console.error(`[B2_USER_SELF_PROBE] ${JSON.stringify({
        verdict: 'FAIL',
        reason: error instanceof Error ? error.message : String(error),
      })}`);
    });
  }, 3000);
}

if (process.env.B3_LATENCY_PROBE === 'true') {
  setTimeout(async () => {
    try {
      const issuer = process.env.AUTH_ISSUER;
      const resource = process.env.RESOURCE_URI;
      const clientId = process.env.SERVICE_CLIENT_ID;
      const clientSecret = process.env.SERVICE_CLIENT_SECRET;
      if (!issuer || !resource || !clientId || !clientSecret) {
        throw new Error('required B3 latency probe environment is missing');
      }

      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'mcp:service',
          resource,
        }),
      });
      const tokenBody = await tokenResponse.json();
      if (!tokenResponse.ok || typeof tokenBody.access_token !== 'string') {
        throw new Error(`token_failed_${tokenResponse.status}`);
      }

      const parse = (text, contentType) => {
        if (!text) return null;
        if (contentType.includes('application/json')) return JSON.parse(text);
        let last = null;
        for (const line of text.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try { last = JSON.parse(data); } catch {}
        }
        return last;
      };

      const post = async (payload, sessionId, protocolVersion) => {
        const headers = {
          authorization: `Bearer ${tokenBody.access_token}`,
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
        };
        if (sessionId) headers['mcp-session-id'] = sessionId;
        if (protocolVersion) headers['mcp-protocol-version'] = protocolVersion;
        const started = performance.now();
        const response = await fetch(resource, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const durationMs = Math.round(performance.now() - started);
        const body = parse(await response.text(), response.headers.get('content-type') || '');
        return { response, body, durationMs };
      };

      const init = await post({
        jsonrpc: '2.0',
        id: 31,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'safeops-b3-latency-probe', version: '0.1' },
        },
      });
      const sessionId = init.response.headers.get('mcp-session-id');
      if (!init.response.ok || !sessionId || !init.body?.result) {
        throw new Error(`initialize_failed_${init.response.status}`);
      }
      const protocolVersion = init.body.result.protocolVersion || '2025-11-25';

      await post({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }, sessionId, protocolVersion);

      const list = await post({
        jsonrpc: '2.0',
        id: 32,
        method: 'tools/list',
        params: {},
      }, sessionId, protocolVersion);
      const toolCount = Array.isArray(list.body?.result?.tools)
        ? list.body.result.tools.length
        : null;
      const targetMs = 500;
      const pass = list.response.ok
        && toolCount === 3
        && init.durationMs < targetMs
        && list.durationMs < targetMs;

      console.error(`[B3_LATENCY_PROBE] ${JSON.stringify({
        verdict: pass ? 'PASS' : 'FAIL',
        target_ms: targetMs,
        initialize_http_status: init.response.status,
        initialize_ms: init.durationMs,
        tools_list_http_status: list.response.status,
        tools_list_ms: list.durationMs,
        tool_count: toolCount,
      })}`);
    } catch (error) {
      console.error(`[B3_LATENCY_PROBE] ${JSON.stringify({
        verdict: 'FAIL',
        reason: error instanceof Error ? error.message : String(error),
      })}`);
    }
  }, 3000);
}
