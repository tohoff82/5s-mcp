# AMAZON ALEXA+ / SEED VERIFICATION SOURCE SPEC v0.1

Status: ACCEPTED FOR DISCOVERY EXECUTION / IMPLEMENTATION NOT AUTHORIZED
Authority: Architect
Date: 2026-09-13
Repository: `tohoff82/5s-mcp`
Branch: `hackathon/amazon-alexa-seed-verification`
Base branch: `main`
Base commit: `f4db319f0d84c17b141cf2f5e20b80a9c16a7f2f`
Competition: Build, Ship, Shape: Amazon Developer Hackathon
Primary target track: Alexa+
Mini-challenge candidate: Open Source

---

## 0. Purpose

This document defines a bounded verification contour for selecting whether an existing governed project seed should be evolved into an Alexa+ hackathon submission.

The contour exists to answer one question only:

> Which existing seed, if any, can produce the strongest compliant Alexa+ submission without distorting its accepted architecture or contaminating its mainline lineage?

This is a discovery and verification instrument. It is not an implementation charter, deployment authorization, merge authorization, public-release authorization, or product-governance promotion.

---

## 1. Isolation and lineage boundary

All hackathon discovery work for the current primary seed is isolated from `main` on:

`hackathon/amazon-alexa-seed-verification`

The immutable pre-hackathon baseline for `5s-mcp` is:

`f4db319f0d84c17b141cf2f5e20b80a9c16a7f2f`

This commit predates the hackathon submission period that begins on 2026-08-31. Therefore:

```text
PRE_HACKATHON_BASELINE
!=
HACKATHON_INCREMENT
```

No change on this branch is implicitly authorized for merge to `main`.

No branch existence, successful test, demo success, hackathon eligibility, Devpost submission, external feedback, or prize outcome grants merge authority.

```text
branch created != implementation authorized
implementation complete != merge authorized
submission accepted != product acceptance
prize != governance promotion
```

---

## 2. Competition source basis

Official rules:

- https://amazonappdev2026.devpost.com/rules

Official Alexa+ MCP QuickStart:

- https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html

Official Alexa+ MCP authentication guidance:

- https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-authentication.html

### 2.1 Competition facts relevant to this contour

Submission period:

- 2026-08-31 10:15 Pacific Time through 2026-10-23 12:00 Pacific Time.

Alexa+ primary-track eligibility requires one of:

1. a working Agent Skill; or
2. a self-hosted MCP server implementing MCP spec `2025-11-25` or later over Streamable HTTP; or
3. an allowed simulated Alexa+ experience under the rules.

Repository requirements include:

- public GitHub repository;
- open-source license visible for judging;
- necessary source, assets, and operating instructions;
- runtime use of the required track technology for the normal Alexa+ MCP path.

Demo requirement:

- public YouTube or Vimeo video;
- less than three minutes;
- clear footage of the working product experience.

Existing projects are eligible only if they are built or significantly updated during the hackathon window.

Judging is equally weighted across:

1. Tech Implementation;
2. Design;
3. Potential Impact;
4. Quality of the Idea.

For Alexa+, the rules explicitly distinguish a basic MCP wrapper around an existing API as an obvious idea, while creative examples include agentic orchestration, context-aware state across sessions, purchasing capabilities, media support, MCP Apps, and Agent Skills.

Friction Log entries may receive up to a 10% judging bonus.

### 2.2 Alexa+ technical facts relevant to G0

For the MCP path, Amazon currently requires:

- Streamable HTTP;
- remote URL accessibility;
- MCP spec `2025-11-25` or later;
- round-trip query-response latency below 500 ms;
- OAuth 2.1 authorization-code flow with PKCE `S256` for user-level authentication;
- Protected Resource Metadata where applicable;
- authenticated Bearer token usage for user-bound calls.

Amazon also documents service-level `client_credentials` authentication before user-level account linking for MCP Add-ons.

MCP Apps may be used for visual interaction surfaces.

---

## 3. Candidate set

### C1 — 5S MCP / SafeOps

Role: PRIMARY

Current relevant characteristics:

- already public and open source;
- existing MCP server;
- evidence-driven maintenance domain;
- ordered lifecycle:

```text
observe
→ plan
→ policy evaluation
→ stage
→ approved apply
→ verify
→ record
```

- explicit safety and least-authority boundaries;
- current MCP entrypoint is local stdio, not Alexa-compatible Streamable HTTP.

Candidate projection:

`5S SafeOps — Governed Maintenance for Alexa+`

Core product thesis:

> Alexa+ becomes a conversational interaction and orchestration surface over a governed maintenance workflow; it does not become the authority root for destructive action.

Primary invariant:

```text
Reasoning != Authorization
```

### C2 — Cartography MCP / Agent Operations Map

Role: CHALLENGER

Candidate projection:

`Alexa+ Agent Operations Cartographer`

Core product thesis:

> Let Alexa+ explain what an agent may be capable of doing, what is verified, what authority is present or missing, and what admissible step exists next — without promoting observation or reasoning into authority.

Primary strengths:

- highest conceptual differentiation;
- directly addresses authority/provenance/acceptance ambiguity in agent ecosystems;
- strong fit to context-aware agent operations.

Primary constraints:

- current repository is private;
- current accepted architecture intentionally does not expose a general production write surface;
- requires an exceptionally clear three-minute narrative.

No public-release or effectful-surface expansion is authorized by this candidate status.

### C3 — Base Explorer / ESP

Role: RESERVE

Candidate projection:

`Alexa+ Governed Settlement Agent`

Core product thesis:

> Alexa+ can inspect and explain settlement evidence while preserving the separation between economic settlement and operational authority.

Primary invariant:

```text
Settlement != Authority
```

Primary strengths:

- real MCP implementation already exists;
- concrete settlement-evidence semantics;
- technically close to an Alexa+ adapter path.

Primary constraints:

- current repository is private;
- current entrypoint is stdio;
- wallet / transaction-hash interaction is less naturally voice-native;
- must avoid collapsing payment verification into entitlement or execution authority.

No repository-publication decision is authorized by this candidate status.

---

## 4. Gate model

The candidate selection sequence is:

```text
G0 — TECHNICAL / RULES COMPATIBILITY
        ↓
G1 — 180-SECOND PRODUCT DEMO VIABILITY
        ↓
G2 — HACKATHON DELTA + LINEAGE CLEANLINESS
        ↓
SELECT / HOLD / REJECT
```

A candidate must not advance by enthusiasm, conceptual fit, or implementation convenience alone.

Unknown or materially unverified conditions fail closed to HOLD, not SELECT.

---

## 5. G0 — Technical / rules compatibility

### Objective

Determine whether each seed can satisfy the Alexa+ track and repository requirements without violating its accepted architecture or requiring an unapproved disclosure boundary.

### Required checks

For each candidate verify:

1. Track path
   - real Alexa+ MCP path, Agent Skill path, or simulation path;
   - preferred default for this contour: real MCP path unless evidence favors otherwise.

2. MCP compatibility
   - MCP `2025-11-25` or later;
   - Streamable HTTP transport;
   - remote URL;
   - runtime technology hook demonstrably present.

3. Authentication
   - service-level auth if required by current Alexa+ onboarding;
   - OAuth 2.1 authorization code + PKCE S256 for user-specific capabilities;
   - resource binding and token-use semantics;
   - no authority inference from authentication alone.

4. Performance
   - credible path to sub-500 ms round-trip response for judge-relevant interactions;
   - identify operations that require asynchronous decomposition or precomputation.

5. Repository / OSS
   - public repository available for judges;
   - compatible open-source license;
   - disclosure boundary acceptable;
   - no proprietary, operational, personal, military, credential, or restricted context leaked into the public surface.

6. Testability
   - a judge can reproduce or inspect the required flow without access to private infrastructure;
   - safe sandbox or fixtures available where live effects are inappropriate.

7. Architecture preservation
   - Alexa integration adds a bounded carrier / interaction plane;
   - no accepted core invariant is weakened solely to satisfy the hackathon.

### G0 pass criterion

`PASS` only if all mandatory rule conditions have a credible, bounded implementation path and no unresolved disclosure or authority-boundary conflict exists.

Otherwise:

- remediable issue → `HOLD / REMEDIATION_REQUIRED`
- architecture conflict, unacceptable disclosure, or rule incompatibility → `REJECT`

---

## 6. G1 — 180-second product demo viability

### Objective

Determine whether a technically valid candidate can be understood and valued by a judge who has no prior knowledge of the underlying architecture.

### Mandatory demo shape

Within 180 seconds the demo must establish:

```text
USER PROBLEM
→ ALEXA+ INTERACTION
→ MULTI-STEP AGENTIC WORKFLOW
→ GOVERNED DECISION / ACTION
→ VISIBLE OR EXPLAINABLE RESULT
→ EVIDENCE / WHY
```

### Evaluation questions

1. Can the customer problem be stated in <= 15 seconds?
2. Does Alexa+ materially improve the interaction model rather than merely fronting an API?
3. Is there at least one multi-step workflow?
4. Does state or prior evidence matter across more than one tool call or conversational turn?
5. Is there a visible moment of judgment, policy, approval, evidence, or recovery that distinguishes the product from a wrapper?
6. Can the final result be shown without relying on architectural exposition?
7. Can the key invariant be understood by a non-specialist?
8. Can the demo succeed safely and deterministically using fixtures or a sandbox?

### G1 pass criterion

A candidate passes only if the complete customer story can be demonstrated in <= 180 seconds with a coherent beginning, value moment, and verified ending.

A technically impressive candidate that requires long architecture explanation is HOLD, not SELECT.

---

## 7. G2 — Hackathon delta + lineage cleanliness

### Objective

Prove that the submission represents a significant hackathon-period increment while preserving a clean distinction between pre-existing work and new work.

### Required artifacts

For the selected candidate, establish:

1. exact pre-hackathon baseline commit;
2. branch or fork boundary for the hackathon increment;
3. manifest of pre-existing components reused unchanged;
4. manifest of hackathon-created or materially updated components;
5. tests added during the hackathon window;
6. demo-specific fixtures and sandbox boundaries;
7. Friction Log;
8. competition-facing architecture diagram;
9. reproducible judge instructions;
10. final diff / compare evidence against the pre-hackathon baseline.

### Significant-update test

The increment must be materially more than:

- README changes;
- Alexa configuration only;
- exposing an existing tool list through a new URL;
- thin API wrapping;
- cosmetic UI.

A credible significant update for 5S would likely include a bounded combination of:

- Streamable HTTP transport;
- Alexa+ onboarding and auth integration;
- session/workflow state;
- explicit voice-safe approval semantics;
- Alexa-specific multi-step orchestration contract;
- MCP App visual plan / evidence surface;
- judge-safe sandbox / fixtures;
- Alexa integration tests;
- deployment and reproducibility tooling;
- friction-log evidence.

This list is a verification target, not implementation authorization.

---

## 8. Minimal demo contracts

### D1 — 5S SafeOps

User intent:

> Inspect this workspace and tell me what is safe to clean.

Required flow:

```text
Alexa+
→ observation
→ evidence collection
→ cleanup plan
→ policy classification
→ user-visible SAFE / REVIEW / DENIED partition
→ explicit bounded approval
→ apply only approved actions
→ verify effect
→ produce evidence-backed explanation
```

Required distinction from a wrapper:

- multiple tools / stages;
- policy-sensitive decision;
- approval boundary;
- verified post-condition;
- second-turn explanation using retained workflow state.

Terminal demo success:

> Customer sees what changed, what did not change, and why.

### D2 — Cartography Agent Operations Map

User intent:

> Can the deployment agent push this release?

Required flow:

```text
Alexa+
→ query operational map
→ bind capability state
→ bind authority state
→ bind verification / provenance state
→ identify missing obligation or admissible next step
→ explain bounded verdict
```

Required distinction from a wrapper:

- no yes/no inference from capability alone;
- current lineage and evidence materially affect the answer;
- response distinguishes capability, authority, execution, and acceptance.

Terminal demo success:

> Customer receives a bounded operational answer and a concrete missing-evidence / next-step explanation without unauthorized execution.

### D3 — Governed Settlement Agent

User intent:

> Has invoice 184 been paid?

Required flow:

```text
Alexa+
→ resolve settlement reference
→ collect transaction evidence
→ normalize observation
→ evaluate settlement claim
→ return settlement verdict
→ separately evaluate whether any downstream entitlement or action is authorized
```

Required distinction from a wrapper:

- transaction lookup alone is insufficient;
- evidence normalization and verdict semantics matter;
- payment confirmation does not itself authorize downstream execution.

Terminal demo success:

> Customer receives a settlement verdict plus a clear boundary between payment evidence and authority.

---

## 9. Comparative acceptance matrix

Each candidate is assessed 0–10 on the four official criteria, plus explicit execution-risk notes.

The score is an internal decision aid only. It is not a prediction of judge scores.

| Candidate | Tech Implementation | Design | Potential Impact | Quality of Idea | Disclosure / OSS Risk | Demo Risk | Current Disposition |
|---|---:|---:|---:|---:|---|---|---|
| 5S SafeOps | 9 | 9 | 8.5 | 9 | Low | Low–Medium | PRIMARY / VERIFY |
| Cartography | 8 | 8 | 8.5 | 10 | High until public-boundary decision | Medium–High | CHALLENGER / HOLD PENDING G0 |
| Base Explorer / ESP | 9 | 7.5 | 7.5 | 8.5 | High until public-boundary decision | Medium | RESERVE / HOLD PENDING G0 |

The table may be revised only by evidence gathered under G0–G2.

---

## 10. Initial evidence-backed hypothesis

Current leading hypothesis:

```text
PRIMARY   = 5S MCP / SafeOps
CHALLENGER = Cartography MCP
RESERVE    = Base Explorer / ESP
```

Reason:

5S currently has the cleanest combination of:

- existing public OSS surface;
- working MCP implementation;
- multi-step governed workflow;
- intuitive customer problem;
- explicit approval and verification semantics;
- low disclosure risk;
- strong Open Source mini-challenge fit;
- clear branch-separated pre-hackathon baseline.

This is not yet terminal candidate selection.

---

## 11. Selection verdict semantics

### SELECT

Grant only when:

- G0 PASS;
- G1 PASS;
- G2 PASS;
- no unresolved authority or disclosure conflict;
- the candidate is demonstrably stronger than retaining NO SUBMISSION.

`SELECT` means:

> Architect may consider a separate implementation authorization.

It does not mean implementation has been authorized.

### HOLD

Use when:

- evidence is incomplete;
- a remediable technical condition remains;
- public-release boundary is unresolved;
- demo viability is plausible but unproven;
- required Amazon documentation is materially unstable.

### REJECT

Use when:

- required rule compatibility cannot be achieved without unacceptable architecture distortion;
- safe judging would require leaking restricted context;
- the candidate reduces to a thin wrapper after removing non-authorized capabilities;
- the 180-second value story is not credible;
- the required implementation effort is disproportionate to competition value.

---

## 12. Authority boundary

AUTHORIZED by this source spec:

- read-only competition research;
- read-only candidate repository inspection;
- architecture comparison;
- compatibility modeling;
- demo-contract refinement;
- documentation on the dedicated hackathon branch;
- evidence-backed SELECT / HOLD / REJECT recommendation.

NOT AUTHORIZED:

- modification of existing 5S runtime behavior;
- Alexa+ transport implementation;
- OAuth implementation;
- remote deployment;
- credential creation or service registration;
- public disclosure of currently private repositories;
- changing repository visibility;
- mutation of Cartography, Base Explorer / ESP, HYPHA, Relay, TICKTONICK, or other project repositories;
- opening a pull request to `main`;
- merging this branch;
- Devpost submission;
- hackathon registration actions;
- production effects;
- automatic activation of Open Source or AWS Builder mini-challenge work;
- governance promotion.

Any implementation step requires a new explicit Architect authorization after seed selection.

---

## 13. Immediate verification sequence

The authorized next work under this contour is:

```text
V0  freeze source basis and branch baseline
V1  G0 / 5S Alexa+ technical compatibility pass
V2  G1 / 5S 180-second demo contract stress test
V3  G2 / 5S significant-update and lineage test
V4  challenger delta check: Cartography
V5  reserve delta check: Base Explorer / ESP
V6  comparative verdict: SELECT / HOLD / REJECT
```

No implementation is implied between V0 and V6.

---

## 14. Terminal output required from this contour

One evidence-backed decision pack containing:

1. verified competition constraints;
2. candidate-by-candidate G0 verdict;
3. 180-second demo viability verdict;
4. exact pre-existing vs hackathon-increment boundary;
5. risk register;
6. recommended seed;
7. `SELECT / HOLD / REJECT` disposition;
8. if SELECT: smallest implementation charter candidate for separate Architect review.

Terminal acceptance remains Architect-only.
