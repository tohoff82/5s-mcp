export function deriveControls({
  authenticated = false,
  connected = false,
  stale = false,
  busy = false,
  canApply = false,
  canExplain = false
} = {}) {
  return Object.freeze({
    connectDisabled: authenticated || busy,
    reconnectDisabled: !authenticated || busy,
    logoutDisabled: !authenticated || busy,
    inspectDisabled: !connected || busy,
    applyDisabled: !connected || busy || !canApply,
    explainDisabled: !connected || busy || !canExplain,
    status: stale ? 'stale' : connected ? 'connected' : authenticated ? 'authenticated' : 'disconnected'
  });
}
