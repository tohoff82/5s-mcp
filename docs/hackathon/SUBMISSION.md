# 5S SafeOps — Alexa+ Hackathon Submission

## Product thesis

**SafeOps gives Alexa+ a governed action layer for real-world maintenance: the AI can inspect, reason and coordinate, but only explicitly authorized, policy-eligible actions can produce effects — and every effect is verified and explained.**

> Let AI help without giving it unlimited control.

> Alexa+ knows what the user wants. SafeOps determines what may actually happen.

## Governed workflow

```text
INTENT -> OBSERVE -> EVIDENCE -> PLAN
-> SAFE / REVIEW / DENIED
-> BOUNDED APPROVAL
-> 5S POLICY GATE
-> EFFECT
-> VERIFY -> EXPLAIN
```

```text
ExecutableSet =
  ApprovedSet
  ∩ Current5SEligibleSet
  ∩ SatisfiedPrerequisites
```

## What the demo proves

The controlled demo begins with one SAFE, one REVIEW, and one DENIED candidate. Before approval the plan reports **EFFECT NONE**. The user chooses **Apply only the safe actions**. SafeOps executes only the currently eligible approved SAFE subset, verifies the resulting state, and explains both what changed and what remained untouched.

REVIEW is not converted into SAFE by approval. DENIED is not bypassed by approval.

## Alexa+ integration boundary

The hackathon interaction surface is participant-built. It represents the Alexa+ conversation/orchestration side because the Alexa+ participant Toolkit / hosted simulator was not available in our participant path.

**Participant-built interaction surface. Live governed backend.**

Behind that surface, the demo uses live authentication, a real Streamable HTTP MCP client/server path, backend classification and policy, bounded approval, controlled execution, verification, and explanation.

## Exact MCP surface

1. `safeops_inspect_workspace`
2. `safeops_apply_safe_actions`
3. `safeops_explain_workflow`

The demo client fails closed if the projected tool list differs.

## Repository evidence map

- `src/safeops/` — authenticated three-tool SafeOps backend and workflow contracts.
- `src/maintenance-engine.js` — bounded operation subset and verification-capable maintenance execution.
- `lab/oauth/` — hackathon OAuth lab path.
- `demo/safeops-participant/` — participant-built conversation carrier and real MCP client.
- `scripts/safeops-c0-start.mjs` — deterministic controlled target materialization used by the live C0 backend.
- `test/safeops/` — SafeOps backend contract and end-to-end tests.
- `demo/safeops-participant/test/` — participant carrier, OAuth, wire, approval, responsive, and presentation tests.

## Core invariants

- Authorization != Acceptance
- Capability != Authority
- Authentication != Authorization
- Reasoning != Authorization
- Plan != Apply
- Approval != Policy Bypass
- Effect != Verification

## Judge-facing criteria

### Technical implementation
Real self-hosted MCP 2025-11-25+ Streamable HTTP, authenticated service/user contexts, actor-to-target binding, bounded approval, apply-time policy checks, effect evidence, and verification.

### Design
The primary experience exposes the product decision: inspect, see SAFE / REVIEW / DENIED, approve the safe subset, then read the verified explanation. Raw protocol receipts remain secondary evidence.

### Potential impact
The governed-action pattern can apply anywhere conversational agents can cause real effects and capability should not silently become authority.

### Quality of idea
The differentiator is not another maintenance tool call. It is a reusable governed-action boundary that keeps conversation continuity separate from execution authority.

## Boundaries

This submission does not claim Amazon-hosted Alexa+ simulator/toolkit usage, production/customer readiness, unrestricted shell or filesystem authority, ordinary execution of REVIEW or DENIED actions, production promotion, or mainline adoption.

## Demo narration disclosure

The submission video uses an AI-generated HeyGen voice for narration. The demonstrated UI state, MCP/auth flow, policy behavior, controlled effect, verification, and explanation are project evidence rather than generated demo outcomes.

## Supporting material

- [Testing and verification](TESTING.md)
- [Product feedback](PRODUCT-FEEDBACK.md)
- [Friction log](FRICTION-LOG.md)
- [Participant demo surface](../../demo/safeops-participant/README.md)
