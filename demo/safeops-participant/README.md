# SafeOps Participant Demo Surface

Status: **B3-R1 live hackathon demo / judge-facing branch**

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

## Current live proof

The controlled hackathon path exercised real user OAuth, MCP initialize / tools-list, inspect, bounded SAFE-only approval, effect, verification, and explanation against the live backend.

```text
Inspect
  -> plan: SAFE 1 / REVIEW 1 / DENIED 1 / EFFECT NONE
  -> Apply only the safe actions
  -> VERIFIED_SUCCESS for the SAFE effect
  -> Explain the same governed workflow
```

The plan snapshot is not a claim that the filesystem remains unchanged after Apply. Verification and explanation refer to the effectful workflow state.

## Non-goals and boundaries

This hackathon evidence does **not** claim Amazon-hosted Alexa+ simulator/toolkit usage, production/customer readiness, unrestricted filesystem authority, execution of REVIEW or DENIED actions through ordinary approval, production promotion, or main merge.

## Judge-facing disclosure

**Participant-built interaction surface. Live governed backend.**

The participant UI represents the Alexa+ conversation/orchestration side for this hackathon demonstration. Authentication, MCP transport, SafeOps policy enforcement, controlled effect, verification, and explanation behind it are live.

See the [submission overview](../../docs/hackathon/SUBMISSION.md), [product feedback](../../docs/hackathon/PRODUCT-FEEDBACK.md), and [friction log](../../docs/hackathon/FRICTION-LOG.md).
