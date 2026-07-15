---
document_id: 5S-DOC-OPERATOR
authority: canonical
status: current
source_of_truth: package.json, src/mcp-server/server.js, and config/safety-policy.json
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [operator]
---

# Operator guide

Run 5S MCP as the least-privileged account that can inspect the intended scope. Grant elevated filesystem, cron, package, journal, or remote permissions only for an approved maintenance window. Start with observation and retain plan/policy evidence before any mutation.

## Install and start

Prerequisites are Node.js >=18 and the host utilities needed by the selected actions. From a clean checkout:

```sh
npm ci
npm run check
npm test
npm run docs:verify
npm start
```

Configure an MCP client with `node` plus the absolute path to `src/mcp-server/index.js`. The server owns stdout for MCP; diagnostics go to stderr.

`install.sh install` is a repository-local dependency/bootstrap helper; it does not install host packages, services, policy, cron, or cleanup. `install.sh config` prints an absolute-path MCP snippet without writing client configuration. Use the dedicated lifecycle tools for system state.

## Preflight

1. Read policy with `5s_safety_policy` action `list`.
2. Inspect the target using `gemba_inspect`, `seiri_sort_analyze`, or `lean_ops`.
3. Run `poka_yoke_guard` with a deliberate profile: `repo`, `docs`, `tests`, or strict `production`.
4. Check host readiness using `5s-shitsuke` action `health` or `lean_ops` action `andon_status`.
5. Stop when Jidoka reports a critical condition, policy returns `P4_FORBIDDEN`, required platform capabilities are unavailable, or evidence is incomplete.

## State and environment

| Variable/default | Purpose |
|---|---|
| `config/safety-policy.json` | deny/allow rules, protected services, remote-clean roots |
| `FIVE_S_PLANS_DIR` / `/tmp/5s-plans` | persisted Seiso plans and dry-run artifacts |
| `FIVE_S_BACKUP_DIR` / `/backup/5s` | staged file lists and backup archives |
| `FIVE_S_KAIZEN_BACKLOG` / `/tmp/5s-kaizen-backlog.json` | Kaizen initiatives |
| `FIVE_S_AUDIT_LOG` / `/tmp/5s-audit.log` | Shitsuke audit evidence |
| `FIVE_S_METRICS_PATH` / `/tmp/5s-metrics.json` | performance history |
| `FIVE_S_COMPLIANCE_PATH` / `/tmp/5s-compliance.json` | compliance state |
| `FIVE_S_REPORTS_DIR` / `/tmp/5s-reports` | generated reports |

Protect these paths as operator data. Environment overrides change where state is written; they do not grant permission or make a target safe.

## Lifecycle operations

- Local cleanup: follow [local Seiso](07-MAINTENANCE-LIFECYCLE/LOCAL-SEISO.md). Review the saved plan, policy verdicts, manifest, artifact path, and backup result before `approved=true` apply.
- Policy: use [policy and approvals](07-MAINTENANCE-LIFECYCLE/POLICY-AND-APPROVALS.md). Back up the policy before remove/reset operations.
- Cron: render and validate first, then use the exact operator-approved cron path. Both install and remove are policy-evaluated mutation paths.
- Remote cleanup: follow [remote clean](07-MAINTENANCE-LIFECYCLE/REMOTE-CLEAN.md). Prepare SSH trust outside this server, supply session evidence, keep dry-run enabled, and verify the remote host afterward.
- Shutdown: stop new calls, wait for the current finite handler to return, then terminate the MCP process. The server does not own persistent remote sessions.

## Upgrade and recovery

Record the current commit/package, policy hash or backup, state-root overrides, active cron file, and unresolved plans. Upgrade from a clean extraction, run the [release gates](12-RELEASE-AND-VERIFICATION.md), restart with the same least privilege, and repeat read-only preflight. Restore policy or cron only from known-good operator backups. A Seiso file archive may support rollback for file-manifest items; it does not guarantee reversal of package or command operations.

## Operational checklist

- [ ] Least-privileged runtime user and intended scope confirmed.
- [ ] Policy and state roots recorded; sensitive state permissions checked.
- [ ] First calls are read-only and platform support is known.
- [ ] Jidoka/Andon state and Poka-Yoke profile reviewed.
- [ ] Destructive-capable tool, exact action, target, and approval owner named.
- [ ] Plan, manifest, policy verdict, staged artifact, and required backup reviewed.
- [ ] Post-action verification and procedure record owner assigned.
