---
document_id: 5S-DOC-REMOTE-CLEAN
authority: canonical
status: current
source_of_truth: src/mcp-server/tools/remote-clean.js and config/safety-policy.json
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [operator, maintainer, agent]
---

# Remote clean contract

`5s_remote_clean` performs finite SSH calls for artifacts attributable to an agent session. SSH trust, firewall access, host-key verification, key permissions, and remote account scope are external operator prerequisites.

## Evidence and candidates

Supply `session_id` when available, plus accurate `paths_visited` and `commands_executed`. Home-relative evidence is resolved against the selected remote user (`/home/<user>` for non-root users); root home is not an allowed cleanup root. The tool infers paths, then accepts only concrete descendants of configured safe roots such as `/tmp`, `/var/tmp`, and `/home`. The roots themselves and denied system roots are not cleanup candidates.

| Action | Effect |
|---|---|
| `analyze` | infers and inspects evidence-backed candidate paths |
| `plan` | builds current remote manifests and local policy verdicts; does not persist a reusable `plan_id` |
| `cleanup` with default `dry_run=true` | rebuilds a fresh plan and reports what would run |
| `cleanup` with `dry_run=false`, `approved=true` | rebuilds a fresh plan, re-evaluates each manifest, and executes allowed manifest removal commands |

## Required sequence

1. Inspect the actual session evidence and use `analyze`.
2. Use `plan` and review host, session, inferred paths, manifests, risk, and estimated bytes.
3. Call cleanup in dry-run mode with the same evidence. Because cleanup rebuilds the plan, compare the fresh result rather than assuming the earlier plan is immutable.
4. Obtain approval for the exact host, account, evidence, paths, and time window.
5. Use non-dry-run cleanup only once the remote state is still attributable and bounded.
6. Re-inspect the remote target and critical services using approved SSH/host tooling, then record results. Post-clean verification is caller-owned.

Never submit a broad root, invent session evidence, reuse another agent's identity path, expose key material, or treat successful SSH exit as complete host verification.
