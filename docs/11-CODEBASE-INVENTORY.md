---
document_id: 5S-DOC-CODEBASE
authority: canonical
status: current
source_of_truth: repository tree
last_verified_commit: 9c8356ab10310197091d4b683cc06a3c917db84f
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
| `changelog.config.js`, `create_todays_changelog.js` | optional ESM defaults and a fail-closed route away from the retired unverifiable record generator |
| `src/utils/` | workspace-tree and memory helpers |
| `config/` | versioned runtime defaults, including safety policy |
| `test/` | Node test contracts for registration, safety controls, tools, platform behavior |
| `scripts/` | generated tool reference, Poka-Yoke repo validation, link gate, documentation authority/verifier gates |
| `docs/00..14` | canonical documentation membrane; `04` is generated |
| `docs/07-MAINTENANCE-LIFECYCLE/` | state-changing maintenance contracts |
| `docs/changes/5s-procedures/` | supporting formats and historical procedure records |
| `skills/5s-mcp/` | concise agent routing into canonical docs |
| `README.md`, `SECURITY.md` | root onboarding and vulnerability reporting |
| `mcp-config.json`, `install.sh` | portable client-config template and repository-local bootstrap/verification helper; no system mutation |
| lowercase legacy docs | deprecated compatibility routes only |
| `package.json`/lock | package allowlist, scripts, dependency, engine, and entrypoint contract; historical procedure records are not shipped |

`node_modules/`, local plan/backup/audit/metric/report/backlog state, cron files, credentials, SSH keys, host logs, coverage, and temporary outputs are generated/operator data and must not enter a source-only handoff.
