const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const issuer = required('AUTH_ISSUER');
const resource = required('RESOURCE_URI');
const clientId = required('SERVICE_CLIENT_ID');
const clientSecret = required('SERVICE_CLIENT_SECRET');

const response = await fetch(`${issuer}/token`, {
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

let body = {};
try { body = await response.json(); } catch {}
console.error(`[B2_TOKEN_DIAG] ${JSON.stringify({
  http_status: response.status,
  error: typeof body.error === 'string' ? body.error : null,
  error_description: typeof body.error_description === 'string' ? body.error_description : null,
  access_token_present: typeof body.access_token === 'string' && body.access_token.length > 0,
  refresh_token_present: typeof body.refresh_token === 'string' && body.refresh_token.length > 0,
  token_type: typeof body.token_type === 'string' ? body.token_type : null,
  scope: typeof body.scope === 'string' ? body.scope : null,
})}`);
