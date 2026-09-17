export async function authenticateRequest(req, tokenValidator) {
  if (!tokenValidator) throw new Error('TokenValidator is required');
  const authInfo = await tokenValidator.verifyAuthorizationHeader(req.headers.authorization);
  req.auth = authInfo;
  return authInfo;
}

export function runtimeContextFromAuthInfo(authInfo, { requiredUserScope } = {}) {
  if (!authInfo?.clientId) throw new Error('Validated AuthInfo is required');
  const serviceContext = Object.freeze({
    service_identity: authInfo.clientId,
    trust_state: 'VALID',
    scopes: Object.freeze([...(authInfo.scopes || [])]),
    validity: 'VALID'
  });
  const subject = authInfo.extra?.subject;
  const hasUserScope = !requiredUserScope || authInfo.scopes?.includes(requiredUserScope);
  const actorContext = typeof subject === 'string' && subject.length > 0 && hasUserScope
    ? Object.freeze({ actor_id: subject, identity_source: 'oauth-access-token', authentication_state: 'AUTHENTICATED', service_identity: authInfo.clientId, validity: 'VALID' })
    : null;
  return { serviceContext, actorContext, authInfo };
}
