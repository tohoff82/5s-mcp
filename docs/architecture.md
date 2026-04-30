# Architecture

5S MCP is a stdio MCP server with three production safety layers:

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

## Tool Boundaries

- `Seiri` classifies state. It does not delete.
- `Seiton` inventories and produces organization plans. It does not move production files.
- `Seiso` owns cleanup, but only through `observe`, `plan`, `stage`, and `apply`.
- `Seiketsu` defines and audits standards.
- `Shitsuke` monitors discipline and health.
- `5s_safety_policy`, `5s_cron_manager`, and `5s_remote_clean` expose production controls to agents.

## Stdio Compatibility

MCP protocol messages use stdout. Any diagnostic startup logs must go to stderr. This is enforced in the entrypoint and server registration flow.

## State Locations

| State | Default |
| --- | --- |
| Safety policy | `config/safety-policy.json` |
| Maintenance plans | `/tmp/5s-plans` |
| Backup metadata/archive root | `/backup/5s` |
| Audit fallback log | `/tmp/5s-audit.log` |

Environment variables can override plan and backup roots:

```bash
FIVE_S_PLANS_DIR=/custom/plans
FIVE_S_BACKUP_DIR=/custom/backups
```
