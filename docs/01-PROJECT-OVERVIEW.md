---
document_id: 5S-DOC-OVERVIEW
authority: canonical
status: current
source_of_truth: src/mcp-server/tool-registry.js and package.json
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [user, operator, maintainer, agent]
---

# Project overview

5S MCP is a local Node.js Model Context Protocol server for evidence-driven system and repository maintenance. It combines the five 5S stages with policy, cron, remote-clean, and Lean inspection/improvement tools while keeping cleanup behind explicit plans and approvals.

## Current runtime facts

- Package and handshake version: `5s-mcp@1.0.0`.
- 12 tools: 5 core 5S tools, 3 safety controls, and 4 Lean extensions.
- 6 read-only tools, 2 mixed non-destructive tools, and 4 destructive-capable tools.
- 1 stdio entrypoint: `src/mcp-server/index.js`; protocol messages use stdout and diagnostics use stderr.
- Node.js >=18 is required. Host checks are platform-aware, but Linux-specific capabilities may return `unsupported` on other systems.
- MCP annotations are conservative risk hints, not authorization.

## Capability groups

| Group | Count | Purpose |
|---|---:|---|
| 5S core | 5 | Classify, organize, clean, standardize, and sustain maintenance practice |
| Safety controls | 3 | Manage policy, cron state, and evidence-driven remote cleanup |
| Lean extensions | 4 | Track improvement, inspect Gemba context, prevent errors, and expose Muda/Jidoka/Andon signals |

## Lifecycle shapes

| Shape | Examples | Completion and state |
|---|---|---|
| Finite observation | Seiri, Seiton, Seiketsu, Gemba, Poka-Yoke, Lean status | One bounded MCP result; no cleanup apply |
| Local persisted maintenance | Seiso | Plan and staged artifacts persist under the configured plan root; apply requires the staged `plan_id` and approval |
| Local control mutation | safety policy, cron, Kaizen/Shitsuke evidence | Finite write to an operator-selected or configured local file |
| Remote finite maintenance | remote clean | SSH analysis/plan or manifest-based approved cleanup; no persistent remote session owner |

## Non-goals

The server is not a general shell sandbox, privilege broker, remote-session manager, backup system, package manager, or universal cross-platform abstraction. A JSON Schema or MCP annotation does not make an untrusted argument safe. The server does not automatically authorize cleanup, policy relaxation, cron mutation, remote access, or restoration. Optional MongoDB changelog sync is supporting storage, not a cleanup safety boundary.
