---
document_id: 5S-DOC-LOCAL-SEISO
authority: canonical
status: current
source_of_truth: src/maintenance-engine.js and src/mcp-server/tools/seiso.js
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [operator, maintainer, agent]
---

# Local Seiso contract

`seiso_clean_system` is the only local cleanup apply path. Its compatibility actions `clean`, `deep_clean`, and `optimize` create plans only.

| State/action | Runtime effect | Required review |
|---|---|---|
| `observe` | reads selected host state; no plan saved | scope and platform support |
| `analyze` | observes and creates a saved candidate plan | summary, candidate operations, next step |
| `plan` | builds manifests, policy verdicts, before snapshot, and saves `plan_id` | operations, paths, ages, risk, blocked/runnable counts |
| `stage` | writes a dry-run artifact and creates a file archive when manifest files require backup | artifact path and backup result |
| `stage_failed` | saved when a required backup fails; no valid stage exists | fix backup root/tooling; do not apply |
| `apply` | requires `approved=true`, valid stage, and successful required backup; re-evaluates each operation | result list, skipped/failed items, bytes removed, before/after snapshot |

## Review gates

1. Use a narrow target and retention period.
2. Confirm every manifest path and policy verdict. A plan can contain blocked or no-op operations.
3. Stage the exact `plan_id`. Do not edit the saved JSON or dry-run artifact as a substitute for re-planning.
4. If a required archive was not created, staging fails closed. Correct backup storage or tooling and create/stage a fresh reviewed plan.
5. Apply only after an operator approves the exact staged plan. Policy is evaluated again, and newly blocked operations are skipped.
6. Inspect before/after verification and individual operation results. A returned apply envelope can contain partial failures.
7. Record plan id, artifact, backup, approval, results, and residual risk in the supporting procedure changelog when required.

## Rollback boundary

The stage archive covers file-manifest items only. Command operations and external service/package effects may need a separate operator rollback. Preserve the file list and archive permissions; do not place archive contents or sensitive host paths into ordinary chat output.
