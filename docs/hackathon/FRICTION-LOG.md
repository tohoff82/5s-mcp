# Alexa+ Hackathon — Friction Log

## FL-01 — Participant Toolkit / hosted simulator availability

### Task

Follow the Alexa+ hackathon integration path and connect the SafeOps self-hosted MCP backend to a judge-visible conversational interaction surface.

### Expected

Based on the broader Alexa+ onboarding material, we initially expected a participant-accessible Toolkit / CLI / hosted simulator path that could act as the Alexa+-side interaction surface.

### Observed

That Toolkit / hosted simulator surface was not available in our participant access path.

We initially investigated the expected credentials and tooling route before rebasing the interaction layer.

This is recorded as a participant-path observation. It is not a claim that the Toolkit was unavailable to every hackathon entrant.

### Competition-path context

The competition materials independently recognize an alternate simulated Alexa+ experience built with the entrant's own agentic tools.

That establishes an entrant-built simulated experience as an event path.

It does not make our participant-built surface an Amazon-hosted simulator, Alexa Add-on, or native Alexa+ runtime demonstration.

### Impact

- time spent investigating an interaction path that was not available in our participant access;
- uncertainty about how the judge-visible interaction layer should be represented;
- risk of overstating a participant-built surface as an Amazon-hosted Alexa+ surface;
- additional work to preserve a clear distinction between interaction/orchestration and backend authority.

A reliable elapsed-time measurement for this friction was not retained, so no duration is claimed.

### Resolution

We retained the real self-hosted MCP implementation and changed only the unavailable Alexa+-side interaction carrier.

```text
participant-built interaction surface
  → user OAuth authorization code + PKCE
  → real MCP client
  → Streamable HTTP SafeOps backend
  → actor / target binding
  → SAFE / REVIEW / DENIED
  → bounded approval
  → controlled SAFE effect
  → verification
  → explanation
```

The participant surface never became the authority root.

It does not:

- classify operations authoritatively;
- redefine the SAFE set;
- bypass REVIEW or DENIED;
- manufacture approval;
- bypass policy;
- determine verification truth;
- expose a generic unrestricted tool-call route.

### Suggested improvement

Publish a hackathon-specific participant-access matrix covering:

- Toolkit availability;
- hosted simulator availability;
- CLI and credential prerequisites;
- self-hosted MCP requirements;
- entrant-built simulated interaction options.

Place the supported alternate interaction path directly beside the Toolkit onboarding path and use explicit terminology distinguishing:

```text
Amazon-hosted Alexa+ tooling
!=
participant-built interaction surface
!=
self-hosted MCP backend
```

### Outcome

The friction required an **access rebase**, not an authority rebase.

SafeOps retained:

```text
Reasoning != Authorization
Authentication != Authorization
Approval != Policy Bypass
Execution != Verification
```

No product safety boundary was weakened to compensate for the unavailable interaction surface.
