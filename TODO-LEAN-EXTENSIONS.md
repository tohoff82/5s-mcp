---
document_id: 5S-DOC-LEAN-IMPLEMENTATION-HISTORY
authority: historical
status: deprecated
source_of_truth: docs/03-CAPABILITY-AND-MODE-MATRIX.md
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [maintainer]
---

# Lean extensions implementation notes

This completed plan is historical/deprecated and grants no current implementation authority. The current 12-tool surface is defined by the [generated reference](docs/04-TOOLS-REFERENCE.md) and [capability matrix](docs/03-CAPABILITY-AND-MODE-MATRIX.md).

## Phase 1: Kaizen

- [x] `kaizen_improve` action `suggest`: suggest incremental improvements from repo/docs/tests/cleanup context.
- [x] `kaizen_improve` action `track`: track improvement initiatives over time.
- [x] `kaizen_improve` action `report`: summarize improvement metrics.

Requirements:

- read-only by default
- no direct cleanup actions
- links recommendations to `Seiso` plans when cleanup is needed

## Phase 2: Gemba

- [x] `gemba_inspect` action `walk`: inspect actual file state through read-only checks.
- [x] `gemba_inspect` action `observe`: watch service/process/disk state without mutation.
- [x] `gemba_inspect` action `context`: gather redacted config and documentation context.

Requirements:

- respect deny paths from `5s_safety_policy`
- redact secrets from reports

## Phase 3: Poka-Yoke

- [x] `poka_yoke_guard` action `scan`: identify error-prone config or workflow patterns.
- [x] `poka_yoke_guard` action `suggest`: recommend prevention mechanisms.
- [x] `poka_yoke_guard` action `validate`: verify prevention measures.

Requirements:

- suggested fixes must produce plans, not direct edits
- high-risk suggestions require approval matrix mapping

## Phase 4: Additional Lean Tools

- [x] `lean_ops` action `muda_detect`: detect waste in disk/temp/workflow signals.
- [x] `lean_ops` action `jidoka_check`: detect conditions that should stop automation.
- [x] `lean_ops` action `andon_status`: produce a status board for health and maintenance readiness.

## Acceptance Criteria For Implemented Tools

- MCP schema generated in `docs/04-TOOLS-REFERENCE.md`.
- Tests cover success, policy block, and invalid input.
- No stdout diagnostic logging.
- No destructive shell pipeline.
- Changelog format supports the new procedure type or maps it to a current 5S category.
