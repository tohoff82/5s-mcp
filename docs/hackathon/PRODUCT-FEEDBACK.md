# Alexa+ Hackathon — Product Feedback

## What we used

The project targeted the Alexa+ hackathon integration model with a real self-hosted MCP backend. SafeOps exposes a narrow three-tool Streamable HTTP surface and uses a participant-built conversational interaction surface for the demonstrated experience.

The backend work focused on MCP 2025-11-25 Streamable HTTP, service/user identity separation, OAuth authorization code + PKCE for the user path, explicit resource binding, narrow tool projection, bounded approval and policy, effect verification, and explanation.

## What worked well

**MCP as a stable capability boundary.** It provided a clean separation between the conversation/orchestration layer and the governed maintenance backend.

**A small workflow-oriented tool surface.** Three workflow tools were easier to reason about, constrain, test, and explain than exposing the inherited broad maintenance surface.

**Self-hosted backend reuse.** The participant-built interaction surface could remain thin while classification, authority, policy, effect, verification, and explanation stayed server-side.

## Onboarding friction

In our participant access path, the Alexa+ Toolkit / hosted simulator described in broader onboarding material was not available to us. We spent time investigating that expected credential and tooling path before rebasing the interaction layer.

The competition materials independently recognize an alternate simulated Alexa+ experience built with the entrant's own agentic tools.

We therefore used a participant-built interaction surface while retaining the real self-hosted Streamable HTTP MCP backend and the governed authentication, policy, controlled-effect, verification, and explanation path.

This project does not represent that participant-built surface as an Amazon-hosted simulator, Alexa Add-on, or native Alexa+ runtime demonstration.

## What would improve the developer experience

1. Publish a hackathon-specific entitlement matrix for Toolkit, simulator, credentials, and CLI access.
2. Place the participant-built interaction-surface path beside the hosted Toolkit path in hackathon onboarding.
3. Provide a minimal user-auth example covering authorization code + PKCE, resource binding, MCP initialize, `tools/list`, and elicitation.
4. Provide a conformance checklist for required MCP version, transport, authentication metadata, and judge-visible evidence.
5. Distinguish Amazon-hosted simulator/tooling, participant-built interaction surfaces, and self-hosted MCP backends consistently in the terminology.

## Time to first working result

A reliable end-to-end elapsed-time measurement was not retained during the build, so we do not claim one.

The material friction was qualitative rather than a manufactured timing metric: time was spent investigating an interaction/tooling path that was not available in our participant access before the interaction layer was rebased.

## Would we build with this again?

Yes.

The useful part is the clean boundary between conversation and capability invocation. For effectful systems, we would continue to pair that boundary with server-side authorization, policy, evidence, and verification rather than treating tool visibility, authentication, approval, or successful invocation as sufficient authority.

## Design lesson

```text
conversation/orchestration != authority
authentication            != authorization
tool visibility            != permission
approval                   != policy bypass
successful call            != verified effect
```
