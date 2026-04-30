# Architecture

5S MCP is a stdio MCP server with a 12-tool production surface and three production safety layers:

```text
MCP client
  -> FiveSMcpServer
  -> tool handler
  -> safety policy / maintenance engine
  -> read-only analysis or staged apply
```

## Core Modules

| Module | Role |
| --- | --- |
| `src/mcp-server/index.js` | stdio entrypoint. Logs to stderr only. |
| `src/mcp-server/server.js` | MCP server and tool registration. |
| `src/safety-policy.js` | Loads, saves, and evaluates deny/allow policy. |
| `src/maintenance-engine.js` | Builds cleanup plans, manifests, backups, apply results, and verification snapshots. |
| `src/changelog/` | Optional changelog storage and MongoDB sync. |
| `src/mcp-server/tools/kaizen.js` | Continuous improvement suggestions, backlog tracking, and reports. |
| `src/mcp-server/tools/gemba.js` | Read-only inspection and redacted context collection. |
| `src/mcp-server/tools/poka-yoke.js` | Error-prevention scanning, suggestions, and validation. |
| `src/mcp-server/tools/lean-ops.js` | Muda, Jidoka, and Andon operational checks. |

## Tool Boundaries

- `Seiri` classifies state. It does not delete.
- `Seiton` inventories and produces organization plans. It does not move production files.
- `Seiso` owns cleanup, but only through `observe`, `plan`, `stage`, and `apply`.
- `Seiketsu` defines and audits standards.
- `Shitsuke` monitors discipline and health.
- `5s_safety_policy`, `5s_cron_manager`, and `5s_remote_clean` expose production controls to agents.
- `Kaizen` tracks incremental improvement work and links cleanup recommendations back to `Seiso` plans.
- `Gemba` inspects actual repository or system context using read-only checks and secret redaction.
- `Poka-Yoke` detects risky workflow patterns before they become production cleanup failures.
- `Lean Ops` exposes Muda detection, Jidoka stop checks, and Andon status without mutating the host.

## Stdio Compatibility

MCP protocol messages use stdout. Any diagnostic startup logs must go to stderr. This is enforced in the entrypoint and server registration flow.

## State Locations

| State | Default |
| --- | --- |
| Safety policy | `config/safety-policy.json` |
| Maintenance plans | `/tmp/5s-plans` |
| Backup metadata/archive root | `/backup/5s` |
| Kaizen backlog | `/tmp/5s-kaizen-backlog.json` |
| Audit fallback log | `/tmp/5s-audit.log` |

Environment variables can override plan and backup roots:

```bash
FIVE_S_PLANS_DIR=/custom/plans
FIVE_S_BACKUP_DIR=/custom/backups
FIVE_S_KAIZEN_BACKLOG=/custom/kaizen-backlog.json
```
