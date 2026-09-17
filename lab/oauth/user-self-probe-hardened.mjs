const resourceUri = process.env.RESOURCE_URI;
if (!resourceUri) throw new Error('RESOURCE_URI is required');

const nativeFetch = globalThis.fetch;
let targetRegistryReached = false;

function parseMcpText(text, contentType) {
  if (!text) return null;
  if (contentType.includes('application/json')) return JSON.parse(text);
  if (contentType.includes('text/event-stream')) {
    let last = null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { last = JSON.parse(data); } catch {}
    }
    return last;
  }
  throw new Error(`unsupported MCP response content-type: ${contentType}`);
}

function isInspectCall(body) {
  if (typeof body !== 'string') return false;
  try {
    const payload = JSON.parse(body);
    return payload?.method === 'tools/call' && payload?.params?.name === 'safeops_inspect_workspace';
  } catch {
    return false;
  }
}

globalThis.fetch = async (input, init = {}) => {
  const response = await nativeFetch(input, init);
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;
  if (requestUrl === resourceUri && isInspectCall(init?.body)) {
    const clone = response.clone();
    const payload = parseMcpText(await clone.text(), clone.headers.get('content-type') || '');
    const message = payload?.error?.message || '';
    if (message.includes('Target is not registered')) targetRegistryReached = true;
  }
  return response;
};

try {
  await import('./user-self-probe.mjs');
  if (!targetRegistryReached) throw new Error('valid user token did not reach TargetRegistry boundary');
  console.error(`[B2_USER_TARGET_BOUNDARY] ${JSON.stringify({ verdict: 'PASS', target_registry_reached: true })}`);
} finally {
  globalThis.fetch = nativeFetch;
}
