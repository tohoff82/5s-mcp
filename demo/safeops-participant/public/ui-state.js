export function deriveControls({
  authenticated = false,
  connected = false,
  prepared = false,
  stale = false,
  busy = false,
  canApply = false,
  canExplain = false
} = {}) {
  return Object.freeze({
    connectDisabled: authenticated || busy,
    reconnectDisabled: !authenticated || busy,
    logoutDisabled: !authenticated || busy,
    startDemoDisabled: !connected || busy,
    inspectDisabled: !connected || !prepared || busy,
    applyDisabled: !connected || !prepared || busy || !canApply,
    explainDisabled: !connected || !prepared || busy || !canExplain,
    status: stale ? 'stale' : connected ? 'connected' : authenticated ? 'authenticated' : 'disconnected'
  });
}
