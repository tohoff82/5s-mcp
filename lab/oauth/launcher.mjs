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
