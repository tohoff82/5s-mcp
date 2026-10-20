# SafeOps B3-R2-R1 — Guided Demo Replay (live verified)

**State:** ARCHITECT ACCEPTED / LIVE DEMO DEPLOYED / INDEPENDENT TWO-BROWSER ACCEPTANCE PASS (20 Oct 2026). Demo source: `1422bd29617a26e87b46ebaf7dae662de3fe18e1`.

**Scope:** Amazon Alexa+ hackathon demo only. This is **not** a new MCP tool or a SafeOps maintenance permission.

## Judge experience

1. Open the participant-built SafeOps demo.
2. Complete user OAuth and consent.
3. Select **Start guided demo**. The demo server requests a fresh controlled sample, then runs Inspect.
4. Observe SAFE 1 / REVIEW 1 / DENIED 1 and EFFECT NONE prior to approval.
5. Select **Apply safe only**. The governed MCP backend executes only the approved and currently eligible SAFE action.
6. Inspect verification and select **Explain decision**.
7. Select **Run again with fresh sample** to repeat without restarting Railway, verifying a fresh workflow ID.
8. Select **Log out of demo** to release the server-held lease before another browser walkthrough.

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

One active lease is held in the C0 backend instance for 10 minutes of inactivity; activity extends it. The demo service keeps the lease secret server-side and attaches it only to authenticated MCP calls. The B3-R2-R1 participant-service fix waits for in-flight preparation before releasing the **current** lease on logout, rejects concurrent preparation within one session, and returns an explicit HTTP 409 instead of `logged_out: true` if backend Release is not acknowledged. This does not weaken lease authentication, permit arbitrary reset, or bypass policy. Restarts lose active leases, and the existing startup wrapper recreates the fixture. The implementation assumes the explicitly configured **single C0 backend replica**; it is not a distributed lease system.

## Tests / evidence

- `test/safeops/demo-replay.test.js`: exclusive leases, conflict, concurrent operation lock, expiration, auth/scope/actor checks, fixture rematerialization, marker, foreign content, and symlink rejection.
- `test/safeops/demo-replay-wire.test.js`: actual Streamable HTTP lease propagation to the MCP tool guard; exactly three MCP tools.
- `demo/safeops-participant/test/`: OAuth, MCP, session lifecycle and UI state regressions adapted to mandatory Prepare.
- `demo/safeops-participant/test/demo-release-boundary.test.mjs`: Prepare/Logout serialization, fail-closed Release failure, and duplicate Prepare rejection (3/3 PASS).
- Existing governed SafeOps backend tests remain applicable. The execution, verification and explanation paths are not redefined by replay.

## Live acceptance, scope and limitations

The demo service is deployed on Railway from `1422bd29617a26e87b46ebaf7dae662de3fe18e1` (deployment `b902a1c9-2ec1-4e42-9b64-5ff9e88726d0`). The separately pinned MCP backend remains at `fda23aed8689ad310486c48f7a77f50b0c0c0551`; OAuth remains at `aac34a7eecad2e0c3e4622a219ab269d94844b94`. Both are unchanged by the lease-lifecycle hotfix.

The controlled browser acceptance completed 10 stages (`LIVE_2_BROWSER_PASS`, 20 Oct 2026 00:52:47 UTC): Browser 1 OAuth / Prepare / Inspect / Apply / Verify / Explain / Replay with a fresh workflow / second Apply / Verify / Explain / Logout, then an independent Browser 2 OAuth / Prepare / Inspect / Apply / Verify / Explain / Logout. Railway HTTP telemetry confirms three Prepare calls and two backend Release calls, all HTTP 200 in this run. The operator-run harness checked `VERIFIED_SUCCESS` and that actual execution scope stayed within the approved SAFE set, excluding REVIEW/DENIED. See [Testing and verification](../../docs/hackathon/TESTING.md) and the [sanitized acceptance receipt](../../docs/hackathon/B3-R2-R1-LIVE-ACCEPTANCE.json).

Local automated verification at this hotfix source: 127/127 tests PASS; source/docs checks PASS. This is a controlled **demo** acceptance, not a customer production or native Amazon-hosted Alexa+ runtime certification, and not an independent third-party security audit.


No OAuth client secrets or lab passwords belong in GitHub README or demonstration output. Availability and privileges of a dedicated judge account remain a separate submission-access gate.

**Authority:** Architect accepted the B3-R2-R1 live technical gate. This acceptance does not authorize mainline merge, further deployment, Devpost edits, license/provenance changes, production promotion, or participant eligibility/legal attestations.
