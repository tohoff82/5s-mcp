---
name: 5s-mcp
description: Operate and reason about this repository's 5S MCP server through its canonical documentation, generated 12-tool catalog, plan-first maintenance lifecycle, and fail-closed policy/backup/approval gates. Use for 5S tool selection, local or remote maintenance, policy and cron control, Lean inspection/improvement, troubleshooting, or repository/documentation maintenance.
---

# 5S MCP

## Purpose

Select the narrowest 5S MCP capability that satisfies the operator's request, observe actual state first, preserve maintenance evidence, and route every behavior or safety claim to source-backed canonical documentation.

## When to use

Use this workflow for 5S/Lean tool choice, local cleanup, policy and cron operations, remote session cleanup, inspection, prevention, health/status, troubleshooting, and repository maintenance. Read only the references needed for the task.

## When not to use

Do not use it as authority for a general shell, privilege escalation, arbitrary remote administration, direct deletion, direct cron editing, universal backup/rollback, unsupported platform behavior, or MongoDB as a safety boundary.

## Canonical reading order

1. Read the [documentation map](../../docs/00-DOCUMENTATION-MAP.md).
2. Read the [project overview](../../docs/01-PROJECT-OVERVIEW.md) and [capability matrix](../../docs/03-CAPABILITY-AND-MODE-MATRIX.md).
3. Select exact tools and schemas from the [generated reference](../../docs/04-TOOLS-REFERENCE.md); do not infer names, actions, inputs, or annotations.
4. Read the [operator guide](../../docs/05-OPERATOR-GUIDE.md) and [security boundaries](../../docs/06-SECURITY-AND-TRUST-BOUNDARIES.md) before any write, destructive, policy, cron, persistent-state, or remote action.
5. For any mutation, read the complete [maintenance lifecycle index](../../docs/07-MAINTENANCE-LIFECYCLE/README.md) and the operation-specific contract.

## Tool-selection rules

Read [tool selection](references/tool-selection.md). Prefer Gemba/Seiri/Lean/Shitsuke observation first. Route local cleanup only through Seiso, policy changes through `5s_safety_policy`, cron changes through `5s_cron_manager`, and attributable remote artifact cleanup through `5s_remote_clean`.

## Safety gates

Read [safety boundaries](references/safety-boundaries.md). Treat annotations as risk hints, not authorization. Stop on deny verdicts, Jidoka critical state, incomplete evidence, unsupported capability, failed required backup, missing staged plan, absent approval, or verification regression.

Never replace a blocked workflow with direct delete commands, policy weakening, direct cron edits, broad remote-root cleanup, fabricated evidence, exposed credentials/keys, or an unverified rollback claim.

## Maintenance lifecycle

Read [maintenance workflow](references/maintenance-lifecycle.md). Local Seiso uses a persisted `plan_id`, stage artifact, required-backup gate, approved apply, and before/after verification. Remote clean rebuilds fresh evidence-based plans and requires caller-owned post-clean verification; do not claim it has the same persisted state machine.

## Output and escalation

Return bounded/redacted evidence: selected tool/action, scope, policy verdict, plan id, artifact/backup status, approval state, result/skips/failures, verification, and residual risk. Use [troubleshooting](references/troubleshooting.md), then escalate when recovery requires operator authority or an external trust/configuration change.

Current surface: 12 tools in 1 ordered registry—6 read-only, 2 mixed non-destructive, and 4 destructive-capable—with package/handshake version `1.0.1`.
