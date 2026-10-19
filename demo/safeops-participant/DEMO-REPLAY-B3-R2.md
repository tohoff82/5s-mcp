# SafeOps B3-R2 — Guided Demo Replay (candidate)

**State:** IMPLEMENTED AND LOCALLY TESTED / NOT DEPLOYED / AWAITING ARCHITECT ACCEPTANCE

**Scope:** Amazon Alexa+ hackathon demo only. This is **not** a new MCP tool or a SafeOps maintenance permission.

## Judge experience

1. Open the participant-built SafeOps demo.
2. Complete user OAuth and consent.
3. Select **Start guided demo**. The demo server requests a fresh controlled sample, then runs Inspect.
4. Observe SAFE 1 / REVIEW 1 / DENIED 1 and EFFECT NONE prior to approval.
5. Select **Apply safe only**. The governed MCP backend executes only the approved and currently eligible SAFE action.
6. Inspect verification and select **Explain decision**.
7. Select **Run again with fresh sample** to repeat without restarting Railway.

If another judge has the demo lease, preparation returns HTTP 409 (`demo_in_use`). The UI reports the conflict; it never silently resets another judge's active workspace.

## Non-MCP preparation boundary

The C0 startup wrapper alone enables `/__safeops_demo/prepare` and `/__safeops_demo/release`. The default SafeOps bootstrap does not expose these routes.

Preparation is permitted only when all of these hold:
- Bearer token authenticated and bound to actor `safeops-lab-user`;
- user token contains `mcp:tools` and `safeops:apply` (a service-only token is insufficient);
- registered target `demo` resolves to precisely `/home/safeops-c0-fixture`;
- a valid server-held demo session ID is supplied;
- no unexpired lease belongs to a different session and no guarded tool call is in flight;
- exact fixture directory structure, marker schema/root, expected file contents, and no symlinks/foreign files are verified before any writes.

Preparation only recreates the absent allowlisted `safe/safe.tmp` and adjusts age metadata on exactly three validated fixture files. It does **not** delete other files, rewrite REVIEW/DENIED content, change safety policy, erase workflow evidence, create unrestricted shell authority, or imply rollback.

One active lease is held in the C0 backend instance for 10 minutes of inactivity; activity extends it. The demo service keeps the lease secret server-side, attaches it only to authenticated MCP calls, and releases it on logout where possible. Restarts lose active leases, and the existing startup wrapper recreates the fixture. The implementation assumes the explicitly configured **single C0 backend replica**; it is not a distributed lease system.

## Tests / evidence

- `test/safeops/demo-replay.test.js`: exclusive leases, conflict, concurrent operation lock, expiration, auth/scope/actor checks, fixture rematerialization, marker, foreign content, and symlink rejection.
- `test/safeops/demo-replay-wire.test.js`: actual Streamable HTTP lease propagation to the MCP tool guard; exactly three MCP tools.
- `demo/safeops-participant/test/`: existing OAuth, MCP, session lifecycle and UI state regressions adapted to the mandatory Prepare step.
- Existing governed SafeOps backend tests remain applicable. The execution, verification and explanation paths are not redefined by replay.

## Limits / promotion gate

This branch has **not** been deployed. The live Railway services remain on the previously configured B3-R1 (participant), C0 (MCP) and B2 (OAuth) sources. The currently hosted demo must **not** be represented as automatically replayable until a separately authorized deployment, two independent browser passes, negative testing and a new receipt succeed.

No OAuth client secrets or lab passwords belong in GitHub README or demonstration output. Availability and privileges of a dedicated judge account remain a separate submission-access gate.

**Authority:** Architect authorization for isolated B3-R2 implementation and local testing does not authorize Railway deployment, changing `main`, altering Devpost, or final claims of production readiness.
