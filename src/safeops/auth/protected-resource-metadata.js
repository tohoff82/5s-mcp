export function buildProtectedResourceMetadata({ resource, authorizationServers, scopesSupported = [] }) {
  new URL(resource);
  if (!Array.isArray(authorizationServers) || authorizationServers.length === 0) throw new Error('authorizationServers must be a non-empty array');
  for (const server of authorizationServers) new URL(server);
  return Object.freeze({
    resource,
    authorization_servers: [...authorizationServers],
    scopes_supported: [...scopesSupported],
    bearer_methods_supported: ['header']
  });
}
