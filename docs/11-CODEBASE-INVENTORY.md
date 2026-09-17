---
document_id: 5S-DOC-CODEBASE
authority: canonical
status: current
source_of_truth: repository tree
last_verified_commit: worktree-based-on-87a810c1969825b52c4d9f8c554b04d827c978a7
audience: [maintainer, agent]
---

# Codebase inventory

| Surface | Ownership and source of truth |
|---|---|
| `src/mcp-server/index.js` | stdio entrypoint and signal handling |
| `src/mcp-server/server.js` | MCP server, list-tools/call-tools dispatch, error conversion |
| `src/mcp-server/tool-registry.js` | ordered 12-tool registry, groups, annotations, lifecycle/documentation metadata |
| `src/mcp-server/tools/` | per-tool schemas and action handlers |
| `src/maintenance-engine.js` | local Seiso plan, stage, backup, apply, and verification state machine |
| `src/safety-policy.js` | policy storage, matching, risk, and verdicts |
| `src/platform-capabilities.js` | platform-aware host capability normalization |
| `src/changelog/` | filesystem procedure records and optional MongoDB sync |
| `src/safeops/server.js`, `src/safeops/tools/` | separate three-tool SafeOps workflow MCP surface; legacy registry is not imported |
| `src/safeops/http.js`, `src/safeops/auth/` | Streamable HTTP resource-server boundary, PRM, token validation, service/user context split |
| `src/safeops/targets/`, `src/safeops/workflow/` | actor-target registry, workflow/evidence store, plan digest, approval, classification, verification, explanation |
| `src/safeops/five-s/bridge.js` | sole SafeOps adapter to inherited 5S execution primitives |
| `changelog.config.js`, `create_todays_changelog.js` | optional ESM defaults and a fail-closed route away from the retired unverifiable record generator |
| `src/utils/` | workspace-tree and memory helpers |
| `config/` | versioned runtime defaults plus non-secret `safeops-targets.example.json`; real actor-target bindings remain deployment data |
| `test/` | Node test contracts for registration, safety controls, tools, platform behavior |
| `scripts/` | generated tool reference, Poka-Yoke repo validation, link/documentation gates, and marker-bound SafeOps fixture helper |
| `docs/00..14` | canonical documentation membrane; `04` is generated |
| `docs/07-MAINTENANCE-LIFECYCLE/` | state-changing maintenance contracts |
| `docs/changes/5s-procedures/` | supporting formats and historical procedure records |
| `skills/5s-mcp/` | concise agent routing into canonical docs |
| `README.md`, `SECURITY.md` | root onboarding and vulnerability reporting |
| `mcp-config.json`, `install.sh` | portable client-config template and repository-local bootstrap/verification helper; no system mutation |
| lowercase legacy docs | deprecated compatibility routes only |
| `package.json`/lock | package allowlist, scripts, dependency, engine, and entrypoint contract; historical procedure records are not shipped |

`node_modules/`, local plan/backup/audit/metric/report/backlog state, cron files, credentials, SSH keys, host logs, coverage, and temporary outputs are generated/operator data and must not enter a source-only handoff.
