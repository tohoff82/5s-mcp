---
document_id: 5S-DOC-CAPABILITY-MATRIX
authority: canonical
status: current
source_of_truth: src/mcp-server/tool-registry.js, tool inputSchema objects, and src/safeops/server.js
last_verified_commit: worktree-based-on-87a810c1969825b52c4d9f8c554b04d827c978a7
audience: [user, operator, maintainer, agent]
---

# Capability and mode matrix

The class below is conservative at tool level. Use the [generated reference](04-TOOLS-REFERENCE.md) for exact selectors, schemas, annotations, and sources.

| Group | Count | Tool-level class | State/lifecycle | Fail-closed boundary | Guide |
|---|---:|---|---|---|---|
| 5S core | 5 | 3 read-only, 1 mixed writer, 1 destructive-capable | finite reads plus persisted Seiso plans/evidence | denied path, unsupported capability, missing staged plan or approval | [Local Seiso](07-MAINTENANCE-LIFECYCLE/LOCAL-SEISO.md) |
| Safety controls | 3 | 3 destructive-capable | policy file, cron file, finite remote SSH | policy verdict, dry-run, concrete safe-root descendant, approval | [Policy](07-MAINTENANCE-LIFECYCLE/POLICY-AND-APPROVALS.md) |
| Lean extensions | 4 | 3 read-only, 1 mixed writer | finite observations plus Kaizen backlog | denied path, validation result, safe follow-up routing | [Operator guide](05-OPERATOR-GUIDE.md) |

## Tool mode summary

| Tool | Selector modes | Mutation boundary |
|---|---|---|
| `seiri_sort_analyze` | `files`, `processes`, `packages`, `logs`, `all` | observation/classification only |
| `seiton_organize_system` | `analyze`, `organize`, `standardize`, `validate`, `workspace_tree` | organize/standardize are plan-only |
| `seiso_clean_system` | `observe`, `analyze`, `plan`, `stage`, `apply`, compatibility plan aliases | only approved apply can remove manifest items |
| `seiketsu_standardize_procedures` | audit, standards, compliance, checklist, drift, policy generation | generated standards/automation are output, not installed |
| `5s-shitsuke` | audit, metrics, health, schedule, report | audit/metrics/report can write evidence; schedule only renders legacy content |
| `5s_safety_policy` | list, add/remove rule, evaluate, reset | rule removal/reset can reduce protection |
| `5s_cron_manager` | render, install, read, remove, validate | install/remove can mutate cron state; dry-run is default |
| `5s_remote_clean` | analyze, plan, cleanup | approved non-dry-run cleanup removes remote manifest items |
| `kaizen_improve` | suggest, track, report | track writes the Kaizen backlog only |
| `gemba_inspect` | walk, observe, context | read-only; context preview redaction is scoped to this tool |
| `poka_yoke_guard` | scan, suggest, validate | read-only; returns findings and safe follow-up routes |
| `lean_ops` | muda detect, jidoka check, andon status | read-only; cleanup remains a Seiso follow-up |

## Select by need

| Need | Select | Do not substitute |
|---|---|---|
| Understand actual state | Gemba, Seiri, Lean status, Shitsuke health | Seiso apply |
| Classify cleanup potential | Seiri or Seiso analyze | a direct delete pipeline |
| Apply local cleanup | persisted Seiso plan, stage, approved apply | Seiton, Kaizen, or shell deletion |
| Change maintenance policy | `5s_safety_policy` with explicit operator scope | editing policy during an unrelated cleanup call |
| Change cron state | `5s_cron_manager` render/validate then scoped mutation | direct cron file editing |
| Clean remote session artifacts | `5s_remote_clean` with evidence and dry-run first | broad safe-root deletion or a free-form remote shell |


## Separate SafeOps C0 candidate surface

The legacy counts above remain **12 tools**. SafeOps does not extend that registry; it owns a separate three-tool MCP server.

| SafeOps tool | Class | Authority boundary |
|---|---|---|
| `safeops_inspect_workspace` | read/plan workflow | authenticated actor + registered target; no target effect |
| `safeops_apply_safe_actions` | destructive-capable | exact current plan digest + SAFE subset + fresh approval + current 5S policy + staged prerequisites |
| `safeops_explain_workflow` | read-only | same actor/target workflow binding; reads persisted evidence only |

A model-supplied `actor_id` or `approved=true` is not part of these schemas. Runtime actor identity comes from validated auth context, and effect approval comes from an injected approval carrier rather than tool arguments.
