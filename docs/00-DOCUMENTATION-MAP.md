---
document_id: 5S-DOC-MAP
authority: canonical
status: current
source_of_truth: docs/documentation-manifest.json
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [user, operator, maintainer, agent]
---

# 5S MCP documentation map

This is the single entrypoint for current 5S MCP documentation. Current canonical documents define behavior and contracts; generated documents reflect runtime source; supporting documents explain without redefining; historical documents preserve evidence. If documents conflict, current canonical material wins, except that runtime source always wins over generated output.

## Current baseline

- Worktree base: `a9b90ff198610dfd560057a321c3e0ce4bd3fba5`.
- Verification state: code, dependency, safety, package, and membrane gates verified against `04d75cabcef5da03a21c22982dbe45dacfa6844c`; this attestation commit changes documentation metadata only.
- Package and MCP handshake: `5s-mcp@1.0.1`.
- Runtime surface: 12 tools in one ordered registry and 1 stdio entrypoint.
- Capability split: 5 core 5S tools, 3 safety controls, and 4 Lean extensions.
- Annotation split: 6 read-only tools, 2 mixed non-destructive tools, and 4 destructive-capable tools.
- Local cleanup contract: `observe -> plan -> policy evaluation -> stage -> approved apply -> verify -> record`.

## Start by audience

| Audience | Start | Then |
|---|---|---|
| User | [Project overview](01-PROJECT-OVERVIEW.md) | [Generated tools](04-TOOLS-REFERENCE.md), [examples](08-USAGE-EXAMPLES.md) |
| Operator | [Operator guide](05-OPERATOR-GUIDE.md) | [Security boundaries](06-SECURITY-AND-TRUST-BOUNDARIES.md), [maintenance lifecycle](07-MAINTENANCE-LIFECYCLE/README.md) |
| Maintainer | [Architecture](02-ARCHITECTURE.md) | [Development](10-DEVELOPMENT-AND-EXTENSION.md), [inventory](11-CODEBASE-INVENTORY.md) |
| Release owner | [Release contract](12-RELEASE-AND-VERIFICATION.md) | [Upstream watch](13-UPSTREAM-WATCH.md), [governance](14-DOCUMENTATION-GOVERNANCE.md) |
| Agent | [`5s-mcp` skill](../skills/5s-mcp/SKILL.md) | Follow its canonical reading order |

## Canonical sequence

1. [Project overview](01-PROJECT-OVERVIEW.md)
2. [Architecture](02-ARCHITECTURE.md)
3. [Capability and mode matrix](03-CAPABILITY-AND-MODE-MATRIX.md)
4. [Generated tools reference](04-TOOLS-REFERENCE.md) — generated; do not hand-edit
5. [Operator guide](05-OPERATOR-GUIDE.md)
6. [Security and trust boundaries](06-SECURITY-AND-TRUST-BOUNDARIES.md)
7. [Maintenance lifecycle](07-MAINTENANCE-LIFECYCLE/README.md): [local Seiso](07-MAINTENANCE-LIFECYCLE/LOCAL-SEISO.md), [remote clean](07-MAINTENANCE-LIFECYCLE/REMOTE-CLEAN.md), [policy and approvals](07-MAINTENANCE-LIFECYCLE/POLICY-AND-APPROVALS.md), [scheduled maintenance](07-MAINTENANCE-LIFECYCLE/SCHEDULED-MAINTENANCE.md)
8. [Usage examples](08-USAGE-EXAMPLES.md)
9. [Troubleshooting](09-TROUBLESHOOTING.md)
10. [Development and extension](10-DEVELOPMENT-AND-EXTENSION.md)
11. [Codebase inventory](11-CODEBASE-INVENTORY.md)
12. [Release and verification](12-RELEASE-AND-VERIFICATION.md)
13. [Upstream watch](13-UPSTREAM-WATCH.md)
14. [Documentation governance](14-DOCUMENTATION-GOVERNANCE.md)

Root [onboarding](../README.md) and [security reporting](../SECURITY.md) are canonical entrypoints. The legacy lowercase documents under `docs/` are deprecated compatibility routes only. [Procedure changelog guidance](changelog.md) is supporting material and cannot override the maintenance or security contracts. The complete machine-readable classification is [`documentation-manifest.json`](documentation-manifest.json).
