# SafeOps Participant Demo Surface

Status: **B3-R1 / I0 local implementation candidate**

This directory contains a thin participant-built interaction carrier for the Amazon Alexa+ hackathon.

It is **not** an Amazon-hosted Alexa+ simulator, Alexa Add-on, or replacement SafeOps implementation.

## Architecture

```text
Browser demo UI
  -> participant demo service
  -> user OAuth authorization-code + PKCE
  -> real Streamable HTTP MCP client
  -> existing SafeOps C0 /mcp
  -> existing SafeOps workflow / 5S gates / target
```

The remote SafeOps backend remains authoritative for:

- actor and target binding;
- workflow and plan identity;
- SAFE / REVIEW / DENIED classification;
- approval receipt;
- 5S staging and apply-time policy checks;
- effect evidence;
- verification;
- explanation.

The participant carrier does not implement those semantics again.

## Exact MCP projection

The client fails closed unless `tools/list` returns exactly:

1. `safeops_inspect_workspace`
2. `safeops_apply_safe_actions`
3. `safeops_explain_workflow`

There is no generic raw `tools/call` HTTP route in the demo service.

## Approval carrier

The UI action **Apply only the safe actions** creates a short-lived, single-use approval event bound to:

- current demo session;
- current `workflow_id`;
- current `plan_id`.

That event only allows the MCP client to answer the backend's native form elicitation.

The backend still owns the actual approval receipt and executable-set enforcement.

The UI does not submit `operation_ids` to broaden or redefine the SAFE set.

## OAuth

The carrier uses the existing user-auth contract:

- authorization code;
- PKCE S256;
- exact `resource` binding;
- server-side client secret;
- refresh token handling;
- Bearer token only in the Authorization header.

No user token is placed in a query string.

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

For a future HTTPS deployment, `DEMO_COOKIE_SECURE` must be enabled.

## Local test

From the repository root:

```sh
node --test demo/safeops-participant/test/*.test.mjs
```

I0 tests cover:

- explicit/single-use approval;
- stale and cross-session/plan rejection;
- PKCE/resource binding;
- token refresh;
- exact three-tool projection;
- no UI-supplied operation set;
- target binding at the demo service;
- absence of a generic tool-call route;
- thin-carrier static boundary.

## I0 hold

B3-R1 / I0 does **not** authorize:

- Railway mutation;
- OAuth redirect-URI mutation;
- C0 or B2 deployment mutation;
- fixture effect;
- production/customer effect;
- AWS credentials or STS;
- CodeArtifact;
- `@alexa-ai/cli`;
- Alexa registration or deploy;
- main merge;
- Phase C.

## Devpost narrative delta

SafeOps exposes a real self-hosted MCP 2025-11-25+ Streamable HTTP backend.

Hackathon participants do not receive the Amazon MCP Toolkit or Amazon-hosted simulator. The demo therefore uses a participant-built Alexa+-style interaction surface connected to the real SafeOps MCP backend.

Only the unavailable Alexa-side interaction carrier is substituted. SafeOps workflow state, MCP transport, authentication/authorization boundaries, target binding, effect and verification remain backend-owned and real when the later controlled live/effect gates are opened.

## Friction Log candidate

**Task:** Follow the documented Alexa+ MCP onboarding path.

**Expected:** Participant-accessible Toolkit / CLI / hosted simulator path.

**Actual:** The public Alexa+ material describes Toolkit workflows, while participant entitlement does not provide that surface. Direct organizer clarification established that participants may use a self-built simulator or front end.

**Project response:** Preserve the real self-hosted MCP implementation and substitute only the unavailable Alexa-side interaction carrier.

**Current I0 state:** local carrier implementation only; no external runtime mutation and no effect.
