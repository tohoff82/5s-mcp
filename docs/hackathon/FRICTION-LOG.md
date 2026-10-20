# Alexa+ Hackathon — Friction Log

## FL-01 — Alexa+ Toolkit / hosted simulator access in the hackathon participant path

**Severity rating:** **High (4/5; impact-based rating, not a platform-incident measurement)**. It blocked the initially planned Amazon-hosted interaction/testing route and required a substitute carrier. It was not an Amazon service outage, data-loss event, or assertion that other approved preview partners lost access.

### Task

Follow the Alexa+ hackathon integration path and connect the SafeOps self-hosted MCP backend to a judge-visible conversational interaction surface.

### Steps taken

1. Reviewed the broader Alexa+ developer onboarding materials describing the preview Toolkit / CLI / hosted simulator path and mapped the planned demo integration against it.
2. Investigated the anticipated credential and tooling access route for the actual hackathon participant context. We could not obtain the preview tool/simulator surface through that context.
3. Checked competition-specific documentation and organizer clarification rather than assuming a preview-partner entitlement or inventing working hosted Toolkit receipts.
4. Chose the rules-supported participant-built interaction surface while retaining the testable self-hosted Streamable HTTP MCP backend, real OAuth and SafeOps authority enforcement.
5. Verified the substitute path end to end; see [live verification](TESTING.md). No native Alexa+ Toolkit run is claimed.

These are evidence-backed **high-level steps**; no exact CLI-error log, support-ticket chronology, or elapsed onboarding duration was preserved.

### Expected

Based on the broader Alexa+ onboarding material, we initially expected a participant-accessible Toolkit / CLI / hosted simulator path that could act as the Alexa+-side interaction surface.

### Observed

That Toolkit / hosted simulator surface was not available in our participant access path. This is consistent with the official hackathon FAQ, which clarifies that the preview developer tools are select-partner access and that an entrant-built web frontend is an accepted demonstration path. No claim of unauthorized access or an unexpected public API outage is made.

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

### Workaround used

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

### Actionable improvement request

**Priority:** High for new hackathon participants following the general Alexa+ preview docs.

Publish a hackathon-specific participant-access matrix covering:

- Toolkit availability;
- hosted simulator availability;
- CLI and credential prerequisites;
- self-hosted MCP requirements;
- entrant-built simulated interaction options.

Place the supported alternate interaction path directly beside the Toolkit onboarding path. In each relevant Toolkit/CLI/simulator setup article, mark partner-only gating and link to a **hackathon-specific working example**: participant-built web interaction -> user OAuth (PKCE) -> authenticated MCP `initialize` / `tools/list` / `tools/call` -> bounded approval -> verification. This would make the first usable path discoverable without changing the backend's authority model.

Use explicit terminology distinguishing:

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

### External context and evidence

- [Official Alexa+ participant tooling FAQ](https://amazonappdev2026.devpost.com/details/faqs) — select-partner preview limitation, entrant-built simulator/frontend alternative.
- [Organizer response on MCP Toolkit / simulator access](https://amazonappdev2026.devpost.com/forum_topics/45255-can-participants-get-alexa-mcp-toolkit-or-simulator-access-for-testing) — no participant application route, self-built demo options.
- [Project implementation and boundary](SUBMISSION.md) · [Product feedback](PRODUCT-FEEDBACK.md) · [Live testing](TESTING.md).

**Scope of evidence:** This is an observed developer-onboarding friction report with a self-assessed severity, not a measured platform reliability incident. No unrecoverable failure duration or unobserved CLI trace is claimed.
