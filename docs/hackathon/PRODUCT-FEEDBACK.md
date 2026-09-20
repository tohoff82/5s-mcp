# Alexa+ Hackathon — Product Feedback

## What we used

The project targeted the Alexa+ hackathon integration model with a self-hosted MCP backend. SafeOps exposes a narrow three-tool Streamable HTTP surface and uses a participant-built conversational front end to exercise the integration path available to us.

The backend work focused on MCP 2025-11-25+ Streamable HTTP, service/user identity separation, OAuth authorization code + PKCE for the user path, explicit resource binding, narrow tool projection, bounded approval and policy, effect verification, and explanation.

## What worked well

**MCP as a stable capability boundary.** It provided a clean separation between the conversation/orchestration layer and the governed maintenance backend.

**A small workflow-oriented tool surface.** Three workflow tools were easier to reason about and review than exposing the inherited broad maintenance surface.

**Self-hosted backend reuse.** The participant-built interaction surface could remain thin while classification, authority, effect, and verification stayed server-side.

## Onboarding friction

Our participant path did not expose the Alexa+ MCP Toolkit / Amazon-hosted simulator described by the broader onboarding material. Organizer clarification established that a self-built simulator or front end was acceptable.

That clarification unblocked the project, but it arrived after we had already investigated the unavailable Toolkit path.

## What would improve the developer experience

1. Publish a hackathon-specific entitlement matrix for Toolkit, simulator, credentials, and CLI access.
2. Put the participant-built front end + self-hosted Streamable HTTP MCP fallback next to the Toolkit path.
3. Provide a minimal user-auth example covering authorization code + PKCE, resource binding, MCP initialize, tools/list, and elicitation.
4. Provide a conformance checklist for required MCP version, transport, auth metadata, and judge-visible evidence.
5. Distinguish Amazon-hosted simulator/tooling from participant-built interaction surfaces in the terminology.

## Would we build with this again?

Yes. The useful part is the clean boundary between conversation and capability invocation. For effectful systems, we would continue to pair that boundary with server-side authorization, policy, evidence, and verification rather than treating tool visibility or successful invocation as permission.

## Design lesson

```text
conversation/orchestration != authority
tool visibility          != permission
approval                 != policy bypass
successful call          != verified effect
```
