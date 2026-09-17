---
document_id: 5S-DOC-README
authority: canonical
status: current
source_of_truth: docs/00-DOCUMENTATION-MAP.md
last_verified_commit: worktree-based-on-87a810c1969825b52c4d9f8c554b04d827c978a7
audience: [user, operator]
---

# 5S MCP

5S MCP is a local Node.js MCP server for evidence-driven 5S and Lean maintenance: observation, classification, plan-first cleanup, policy, cron, remote session cleanup, standards, health, prevention, and continuous improvement.

Current source-backed surface: 12 tools in 1 ordered registry, 1 stdio entrypoint, Node.js >=18, 6 read-only tools, 2 mixed non-destructive tools, and 4 destructive-capable tools. Package and MCP handshake both use version `1.0.1`.

The Amazon Alexa+ SafeOps C0 construction branch adds a **separate** candidate surface without changing that legacy registry: 3 workflow tools over authenticated Streamable HTTP (`safeops_inspect_workspace`, `safeops_apply_safe_actions`, `safeops_explain_workflow`), explicit actor-to-target binding, exact SAFE-operation approval scope, append-oriented workflow evidence, and post-effect verification. This is a local Phase A implementation candidate only; real Alexa+, OAuth-provider, elicitation, deployment, and baseline acceptance remain outside the current repository-construction claim.

## Install and connect

```sh
git clone https://github.com/tohoff82/5s-mcp.git
cd 5s-mcp
npm ci
npm run check
npm test
npm run docs:verify
```

```json
{"mcpServers":{"5s":{"command":"node","args":["/absolute/path/to/5s-mcp/src/mcp-server/index.js"]}}}
```

Start with a read-only call:

```json
{"tool":"gemba_inspect","arguments":{"action":"context","target_path":".","max_files":20}}
```

## Safety boundary

Local cleanup follows:

```text
observe -> plan -> policy evaluation -> stage -> approved apply -> verify -> record
```

Tool annotations are conservative hints, not authorization. Run with least privilege, inspect policy first, keep cron and remote cleanup in dry-run until reviewed, and stop on deny verdicts, unsupported platform gates, missing evidence, failed required backups, or verification regressions. The server is not a general shell sandbox, privilege broker, universal backup system, or automatic rollback coordinator.

## Canonical documentation

- [Documentation map](docs/00-DOCUMENTATION-MAP.md)
- [Generated 12-tool reference](docs/04-TOOLS-REFERENCE.md)
- [Operator guide](docs/05-OPERATOR-GUIDE.md)
- [Security and trust boundaries](docs/06-SECURITY-AND-TRUST-BOUNDARIES.md)
- [Maintenance lifecycle](docs/07-MAINTENANCE-LIFECYCLE/README.md)
- [Troubleshooting](docs/09-TROUBLESHOOTING.md)
- [Release and verification](docs/12-RELEASE-AND-VERIFICATION.md)
- [Security reporting](SECURITY.md)

```sh
npm run docs:verify
```

## SafeOps local construction checks

```sh
npm run safeops:test
npm run safeops:fixture:create
npm run safeops:fixture:verify
npm run safeops:fixture:reset
```

The fixture commands operate only on a marker-bound `safeops-c0-fixture*` directory. Test approval and fixture policy data are laboratory evidence, not Alexa approval or production authority.
