# 5S MCP Server

Production-safe MCP server for applying the 5S methodology to server maintenance. The service is designed for agents: it analyzes system state, builds cleanup plans, enforces safety policy, manages cron schedules, and supports remote cleanup after agent work.

## Current Status

- Runtime: Node.js 18+
- Transport: MCP stdio
- Branch model: `main` for production, `dev` for development
- Safety model: plan-first, deny/allow policy, staged apply
- Verification:

```bash
npm run check
npm test
npm audit --audit-level=high
```

## Install

```bash
git clone https://github.com/tohoff82/5s-mcp.git
cd 5s-mcp
npm install
```

## Run

```bash
npm start
```

MCP client config:

```json
{
  "mcpServers": {
    "5s": {
      "command": "node",
      "args": ["/absolute/path/to/5s-mcp/src/mcp-server/index.js"]
    }
  }
}
```

The server writes operational logs to stderr so stdout remains reserved for MCP protocol messages.

## Tools

| Tool | Purpose |
| --- | --- |
| `seiri_sort_analyze` | Classify files/processes/packages/logs as necessary, conditional, cleanup candidates, or forbidden. |
| `seiton_organize_system` | Inventory, index, workspace tree, and organization plans. Production actions are plan-only. |
| `seiso_clean_system` | Safe cleanup workflow: `observe -> plan -> stage -> apply`. |
| `seiketsu_standardize_procedures` | Audit standards and generate formal safety/retention/backup policies. |
| `5s-shitsuke` | Health checks, audits, metrics, reports, and schedule rendering. |
| `5s_safety_policy` | Agent-managed deny/allow rules and operation risk evaluation. |
| `5s_cron_manager` | Render, validate, install, read, and remove cron files without hardcoded server paths. |
| `5s_remote_clean` | Evidence-driven remote cleanup after agent sessions. |

See [docs/tools.md](docs/tools.md) for schemas and examples.

## Safety Contract

Cleanup is never a direct shell delete pipeline. The required flow is:

```text
observe -> plan -> policy evaluation -> stage -> approved apply -> verify -> record
```

Key rules:

- `Seiso` creates manifests before deleting anything.
- `stage` writes a dry-run artifact and backup metadata.
- `apply` requires `approved=true` and a staged `plan_id`.
- deny/allow policy is stored in [config/safety-policy.json](config/safety-policy.json).
- cron defaults are read-only health/audit jobs.
- remote cleanup is limited to safe roots and is dry-run first.

See [docs/operations.md](docs/operations.md) and [docs/safety.md](docs/safety.md).

## Demo

```bash
node demo.js test
node demo.js seiso
```

The demo uses current MCP tool schemas and only creates cleanup plans; it does not apply destructive changes.

## Documentation

- [docs/README.md](docs/README.md) - documentation map
- [docs/architecture.md](docs/architecture.md) - runtime architecture
- [docs/tools.md](docs/tools.md) - MCP tool reference
- [docs/operations.md](docs/operations.md) - production workflows
- [docs/safety.md](docs/safety.md) - safety policy and risk levels
- [docs/remote-clean.md](docs/remote-clean.md) - remote cleanup mode
- [docs/changelog.md](docs/changelog.md) - changelog storage and CLI
- [docs/PRODUCTION-HARDENING.md](docs/PRODUCTION-HARDENING.md) - hardening checklist
- [TODO-LEAN-EXTENSIONS.md](TODO-LEAN-EXTENSIONS.md) - roadmap

## Repository Layout

```text
src/
  maintenance-engine.js        # plan/stage/apply engine
  safety-policy.js             # deny/allow policy manager
  mcp-server/
    index.js                   # stdio entrypoint
    server.js                  # MCP tool registration
    tools/                     # MCP tools
  changelog/                   # file/Mongo changelog support
config/
  safety-policy.json           # production safety defaults
docs/
test/
```

## Development

```bash
npm install
npm run check
npm test
node demo.js test
```

Before changing cleanup behavior, add or update tests for policy evaluation, plan generation, staging, and approval gates.
