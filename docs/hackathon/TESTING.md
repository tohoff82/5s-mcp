# SafeOps Hackathon — Testing and Verification

## Verification model

SafeOps distinguishes source-level tests from controlled live-demo evidence. Passing tests is not presented as proof of a live effect; a successful tool call is not presented as verification.

## Repository verification

```sh
npm ci
npm run check
npm test
npm run docs:links
npm run docs:verify
npm run safeops:test
node --test demo/safeops-participant/test/*.test.mjs
node --check scripts/safeops-c0-start.mjs
```

Controlled fixture helpers:

```sh
npm run safeops:fixture:create
npm run safeops:fixture:verify
npm run safeops:fixture:reset
```

Backend tests cover actor/target binding, SAFE / REVIEW / DENIED classification, bounded approval, MCP elicitation, exact operation subsets, apply-time policy behavior, verification, explanation, and authenticated HTTP/MCP boundaries.

Participant-carrier tests cover authorization-code + PKCE behavior, exact resource binding, token refresh, exact three-tool projection, explicit single-use approval, stale and cross-session/plan rejection, no UI-supplied operation set, no generic raw tool-call route, target binding, responsive behavior, and presentation state.

## Controlled live proof

```text
Connect user (real user OAuth authorization code + PKCE)
  -> MCP initialize -> tools/list (exactly 3 SafeOps tools)
  -> Start guided demo (authenticated fixture Prepare + Inspect)
  -> SAFE 1 / REVIEW 1 / DENIED 1 / EFFECT NONE
  -> Apply safe only (bounded, single-use approval)
  -> one controlled, approved SAFE effect
  -> VERIFIED_SUCCESS (verification state in Apply receipt)
  -> Explain decision (same workflow and verified execution scope)
  -> Run again with fresh sample (new workflow ID)
  -> second verified SAFE-only effect
  -> Log out of demo (backend lease Release)
```

REVIEW is outside ordinary approval and DENIED remains policy-blocked. The acceptance harness checks the actual executed operation is in both the SAFE and approved sets, not in REVIEW or DENIED. It checks `VERIFIED_SUCCESS` in both Apply and Explain responses and separately waits for the human-readable explanation.

## B3-R2-R1 live acceptance — 20 Oct 2026

- **Result:** `LIVE_2_BROWSER_PASS` at **2026-10-20T00:52:47.254Z** (operator-run Playwright test on an authorized local Mac; the password, tokens and cookies are not published).
- **Browser 1:** OAuth -> Prepare/Inspect -> approved SAFE Apply/Verify/Explain -> fresh-sample Prepare/Inspect with distinct workflow ID -> second approved SAFE Apply/Verify/Explain -> Logout. All stages PASS.
- **Browser 2:** independent browser context and OAuth -> Prepare/Inspect -> approved SAFE Apply/Verify/Explain -> Logout. All stages PASS.
- **Local checks:** `npm test` 127/127 PASS; `npm run check`, `npm run docs:links`, `npm run docs:verify`, and `git diff --check` PASS at the B3-R2-R1 candidate source.
- **Live Railway HTTP correlation:** 3 demo `/api/prepare`, 3 `/api/inspect`, 3 `/api/approval`, 3 `/api/apply` and 3 `/api/explain` all HTTP 200. MCP reported 3 `/__safeops_demo/prepare` and 2 `/__safeops_demo/release` HTTP 200. Both distinct browser sessions logged out successfully. The harness's cleanup may issue an additional idempotent demo Logout after the UI Logout.
- **Negative checks:** separate unauthenticated browsers could load the public UI but received authorization failures from protected demo API routes. Direct backend Prepare/Release without bearer tokens returned HTTP 401.

[Sanitized machine-readable receipt](B3-R2-R1-LIVE-ACCEPTANCE.json) records the verified stage outcomes and HTTP summary, without credentials or session identifiers. The live acceptance receipt is an operator-run harness result correlated with Railway telemetry; it is **not** an independent third-party attestation or a raw externally signed effect log. HTTP 200 alone is not equated with verified effect — the acceptance harness separately asserted verification state and exact bounded execution scope.

## Deployed source and evidence boundary

| Component | Pinned source SHA | Railway deployment |
| --- | --- | --- |
| Participant-built demo | `1422bd29617a26e87b46ebaf7dae662de3fe18e1` | `b902a1c9-2ec1-4e42-9b64-5ff9e88726d0` |
| MCP / C0 backend | `fda23aed8689ad310486c48f7a77f50b0c0c0551` | `a0f3d9be-ddb0-47e3-9ee2-64348e94d377` |
| B2 OAuth lab | `aac34a7eecad2e0c3e4622a219ab269d94844b94` | `dfdd1d02-5a91-411c-91ef-3068b34cccff` |

The deployment was verified by Railway service/source readback; all three services were Online/SUCCESS with no active warning or critical issues during the acceptance preflight. The hackathon demo is reachable at https://safeops-b3-r1-demo-production.up.railway.app/; the legacy domain name does **not** mean that it serves the old B3-R1 source.

## Deterministic demo target

The live C0 startup wrapper at [`scripts/safeops-c0-start.mjs`](../../scripts/safeops-c0-start.mjs) validates the expected target/policy contract and materializes a deterministic fixture before starting the backend.

## Interpretation limits

These checks do not establish production identity-provider readiness, Amazon-hosted Alexa+ UI access, customer production deployment, unrestricted host safety, automatic rollback for arbitrary effects, or mainline adoption.

The proof target is narrower: the controlled governed workflow works end to end, and the evidence surface distinguishes plan, authority, effect, verification, and explanation.

## Guided replay and release contract

B3-R2 introduced server-held, authenticated, exclusive 10-minute inactivity leases and exact allowlisted fixture preparation, without adding an MCP tool. B3-R2-R1 corrected the participant carrier's lease lifecycle: Logout waits for pending Prepare, failed backend Release returns an explicit error instead of falsely succeeding, and duplicate same-session Prepare is rejected. Three new release-boundary tests passed.

[Guided replay implementation and safety contract](../../demo/safeops-participant/DEMO-REPLAY-B3-R2.md) documents the limits. This controlled demo does not establish native Alexa+ runtime integration, customer-production readiness, unrestricted filesystem safety, generic rollback, public judge credential provisioning, or independently audited security.
