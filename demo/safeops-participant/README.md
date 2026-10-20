# SafeOps Participant Demo Surface

Status: **B3-R2-R1 guided replay live / Architect accepted / judge-facing hackathon branch** (20 Oct 2026; demo source pinned to `1422bd29617a26e87b46ebaf7dae662de3fe18e1`)

This directory contains the thin participant-built interaction carrier used for the Amazon Alexa+ hackathon demonstration.

It is **not** an Amazon-hosted Alexa+ simulator, Alexa Add-on, or replacement SafeOps implementation.

## Architecture

```text
Browser demo UI
  -> participant demo service
  -> user OAuth authorization-code + PKCE
  -> real Streamable HTTP MCP client
  -> SafeOps C0 /mcp
  -> SafeOps workflow / 5S gates / controlled target
```

The participant surface stands in only for the unavailable Alexa+-side interaction carrier. The backend remains authoritative for actor and target binding, workflow and plan identity, SAFE / REVIEW / DENIED classification, approval receipt, 5S staging and apply-time policy checks, controlled effect evidence, verification, and explanation.

## Exact MCP projection

The client fails closed unless `tools/list` returns exactly:

1. `safeops_inspect_workspace`
2. `safeops_apply_safe_actions`
3. `safeops_explain_workflow`

There is no generic raw `tools/call` HTTP route in the demo service.

## Approval carrier

The UI action **Apply only the safe actions** creates a short-lived, single-use approval event bound to the current demo session, `workflow_id`, and `plan_id`. That event only allows the MCP client to answer the backend's native form elicitation.

The backend still owns the actual approval receipt and executable-set enforcement. The UI does not submit `operation_ids` to broaden or redefine the SAFE set.

## OAuth

The carrier uses authorization code + PKCE S256, exact `resource` binding, a server-side client secret, refresh-token handling, and Bearer tokens only in the Authorization header. No user token is placed in a query string.

## Controlled demo target

The live C0 startup wrapper is committed at [`scripts/safeops-c0-start.mjs`](../../scripts/safeops-c0-start.mjs). It validates the expected target/policy contract and materializes a deterministic controlled fixture with one SAFE candidate, one REVIEW candidate, and one DENIED candidate before starting the SafeOps backend.

The demonstrated effect is intentionally narrow: only the approved SAFE action is eligible to execute. REVIEW remains outside the approved execution scope and DENIED remains blocked by policy.

## Local configuration

Do not place credentials in source control.

Required runtime variables:

```text
SAFEOPS_RESOURCE_URI
DEMO_OAUTH_AUTHORIZATION_ENDPOINT
DEMO_OAUTH_TOKEN_ENDPOINT
DEMO_OAUTH_CLIENT_ID
DEMO_OAUTH_CLIENT_SECRET
DEMO_OAUTH_REDIRECT_URI
DEMO_TARGET_ID
```

Optional:

```text
HOST=127.0.0.1
PORT=4173
DEMO_COOKIE_SECURE=false
```

For HTTPS deployment, `DEMO_COOKIE_SECURE` must be enabled.

## Verification

From the repository root:

```sh
npm ci
npm run check
npm test
npm run docs:links
npm run docs:verify
node --test demo/safeops-participant/test/*.test.mjs
node --check scripts/safeops-c0-start.mjs
```

See [hackathon testing evidence](../../docs/hackathon/TESTING.md) for the distinction between repository tests and the controlled live proof.

## Current B3-R2-R1 live proof

The participant-built interface performs a real user OAuth login, MCP initialize / `tools/list`, inspect, bounded SAFE-only approval, controlled effect, verification, explanation, and a fresh-sample replay.

```text
Connect user (OAuth and consent)
  -> Start guided demo (authenticated bounded fixture Prepare + Inspect)
  -> SAFE 1 / REVIEW 1 / DENIED 1 / EFFECT NONE
  -> Apply safe only (single-use, workflow-bound approval)
  -> one eligible SAFE effect; VERIFIED_SUCCESS
  -> Explain decision (REVIEW and DENIED untouched)
  -> Run again with fresh sample (new workflow)
  -> repeat Apply / Verify / Explain
  -> Log out of demo (authenticated lease Release)
```

On 20 Oct 2026, an operator-run browser acceptance harness completed two independent OAuth/browser contexts and three verified SAFE-only effects, including a fresh workflow replay. The backend separately recorded two successful `/__safeops_demo/release` HTTP 200 results. [Testing details](../../docs/hackathon/TESTING.md) and [sanitized receipt](../../docs/hackathon/B3-R2-R1-LIVE-ACCEPTANCE.json) separate live HTTP evidence from effect-verification assertions.

The plan snapshot does not imply no later effect: `EFFECT NONE` is the *pre-approval* state. `VERIFIED_SUCCESS` is reported only after a separately checked controlled effect.

## Non-goals and boundaries

This hackathon evidence does **not** claim Amazon-hosted Alexa+ simulator/toolkit usage, production/customer readiness, unrestricted filesystem authority, execution of REVIEW or DENIED actions through ordinary approval, production promotion, or main merge.

## Judge-facing disclosure

**Participant-built interaction surface. Live governed backend.**

The participant UI represents the Alexa+ conversation/orchestration side for this hackathon demonstration. Authentication, MCP transport, SafeOps policy enforcement, controlled effect, verification, and explanation behind it are live.

See the [submission overview](../../docs/hackathon/SUBMISSION.md), [product feedback](../../docs/hackathon/PRODUCT-FEEDBACK.md), and [friction log](../../docs/hackathon/FRICTION-LOG.md).

## Guided Demo Replay B3-R2-R1 (live and tested)

The deployed demo offers `Start guided demo` and `Run again with fresh sample`. Backend-only preparation is restricted to the exact C0 fixture, with a single authenticated session lease. Replay uses a fresh workflow ID; it never authorizes REVIEW or DENIED actions.

The B3-R2-R1 lease-lifecycle fix serializes logout against any in-flight preparation, rejects simultaneous preparation in the same session, and refuses to claim successful logout when the backend did not confirm Release. It does not add an MCP tool or relax SafeOps policy. [Implementation and safety contract](DEMO-REPLAY-B3-R2.md).
