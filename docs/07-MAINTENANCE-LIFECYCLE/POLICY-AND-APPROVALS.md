---
document_id: 5S-DOC-POLICY-APPROVALS
authority: canonical
status: current
source_of_truth: src/safety-policy.js and config/safety-policy.json
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [operator, maintainer, agent]
---

# Policy and approvals

`5s_safety_policy` lists and changes deny/allow rules and evaluates proposed operations. The policy file is live operator configuration. Back it up and review diffs before `add_rule`, `remove_rule`, or `reset`.

| Level | Runtime meaning | Handling |
|---|---|---|
| `P0_SAFE` | low-risk observational operation | scope still required |
| `P1_LOW` | medium risk without a rotated-log allow classification | approval may be required by the calling workflow |
| `P2_MEDIUM` | medium risk matched to the rotated-log allowance | explicit cleanup approval |
| `P3_HIGH` | high-risk path/command or unallowed destructive operation | blocked without approval; stage/backup where applicable |
| `P4_FORBIDDEN` | deny rule matched | blocked even with approval until policy is deliberately changed |

An allow match contributes context; it does not override a deny match. Approval permits eligible high-risk operations but does not neutralize deny rules. Rule types are `path_prefix`, `path_glob`, and `command_regex`; stable unique ids are required.

## Mutation controls

- `list` and `evaluate` are observational.
- Adding an allow rule can broaden future cleanup scope.
- Removing a deny rule or resetting policy can materially change protections.
- Review the exact rule kind, id, value, reason, affected tools, and rollback before mutation.
- Do not change policy inside an unrelated cleanup request merely to make a blocked plan pass. Stop and obtain separate operator authorization.

MCP destructive annotations mark minimum risk. They never replace the action-level verdict, staged-plan gate, dry-run, or human authorization.
