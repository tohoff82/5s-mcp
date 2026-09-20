# Alexa+ Hackathon — Friction Log

## FL-01 — Participant Toolkit / hosted simulator availability

**Task**

Follow the Alexa+ MCP onboarding path for the hackathon and connect the SafeOps self-hosted MCP backend to the expected participant interaction surface.

**Expected**

A participant-accessible Toolkit / CLI / hosted simulator path matching the onboarding flow described in the broader Alexa+ developer material.

**Actual**

That Toolkit / hosted simulator surface was not available in our hackathon participant path. We initially investigated the expected credential / CLI route before organizer clarification established that participants could use a self-built simulator or front end.

**Impact**

- time spent investigating an unavailable integration path;
- uncertainty about whether a custom interaction surface would remain eligible;
- risk of misdescribing a participant-built UI as an Amazon-hosted Alexa+ surface.

**Resolution**

We preserved the real self-hosted MCP implementation and substituted only the unavailable Alexa+-side interaction carrier with a participant-built surface.

```text
participant-built interaction surface
  -> user OAuth + PKCE
  -> real MCP client
  -> live SafeOps Streamable HTTP backend
  -> real policy / controlled effect / verification
```

The frontend never became the authority root. It does not classify operations, redefine the SAFE set, or expose a generic tool-call route.

**Suggested improvement**

Add a hackathon-specific available-to-participants matrix and document the participant-built-front-end fallback beside the Toolkit path. Include exact language distinguishing Amazon-hosted Alexa+ tooling, participant-built interaction surfaces, and self-hosted MCP backends.

**Outcome**

The friction did not require weakening the product architecture. It required an access rebase and explicit transparency in the demo and submission materials.
