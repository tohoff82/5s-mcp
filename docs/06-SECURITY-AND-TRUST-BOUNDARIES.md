---
document_id: 5S-DOC-SECURITY-MODEL
authority: canonical
status: current
source_of_truth: src/safety-policy.js, src/maintenance-engine.js, and destructive-capable tool handlers
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [operator, maintainer, agent]
---

# Security and trust boundaries

5S MCP assumes the local account, MCP client, target paths, host utilities, SSH configuration, and remote account are administered deliberately. It reduces accidental maintenance risk; it does not turn an untrusted caller, path, command, host, identity file, policy, or privileged runtime into a safe one.

## Assets and actors

Assets include the policy file, plan/manifests, dry-run artifacts, backup lists/archives, audit/metric/report files, Kaizen backlog, cron files, changelog records, SSH identity paths, remote session evidence, and MCP results. Actors are the MCP client/agent, local operator, 5S MCP process, host utilities/services, SSH client, and remote account.

## Enforced boundaries

- The ordered registry exposes conservative read-only, destructive, and idempotence hints; mixed tools are classified by their most powerful action.
- Seiso persists plans, evaluates every operation, requires stage plus `approved=true`, rejects a failed required backup, re-evaluates policy at apply, and records before/after verification.
- Default deny rules protect selected service/config/data paths and dangerous command patterns. A deny match remains blocked even when approval is supplied.
- Cron content rejects destructive command classes. Install and remove default to dry-run and evaluate the selected path through safety policy before mutation.
- Remote cleanup accepts only concrete descendants of configured safe roots, rejects broad roots and denied roots, builds manifest-only removal commands, defaults to dry-run, and requires approval for execution.
- Gemba context redacts secret-like values, Poka-Yoke detects risky patterns, and platform helpers report unsupported capabilities instead of treating every host as Linux.
- MCP stdout is reserved for protocol data; operational diagnostics use stderr.

## Boundaries not provided

- The server has no built-in user authentication, privilege separation, central rate limiter, universal audit wrapper, transaction manager, or automatic rollback coordinator.
- JSON Schemas and annotations describe the surface; they are not permission checks. Individual handlers remain responsible for action validation and policy calls.
- Redaction is scoped. Do not assume every tool result, host command output, changelog record, or error is secret-safe.
- A successful file backup does not reverse package-manager, journal, service, cron, policy, or arbitrary host command effects.
- Remote cleanup does not persist an immutable remote plan id and does not perform a complete post-clean remote audit. The caller must verify and record.
- Running as root broadens impact. Policy cannot compensate for an untrusted MCP client or a malicious local/remote account.

## Operator authorization

Read-only annotations are hints, not authorization. Local cleanup apply, policy add/remove/reset, cron install/remove/reload, remote cleanup, Kaizen backlog writes, and Shitsuke evidence writes require operator-approved scope. Never expose private keys, identity-file contents, credentials, tokens, unredacted environment data, or sensitive host output in MCP responses, documentation, procedure records, or handoffs.

Stop on a deny verdict, missing evidence, failed required backup, unsupported platform gate, unknown target, or verification regression. Correct scope/configuration or escalate; do not weaken a failed safety boundary as remediation. Report vulnerabilities through root [`SECURITY.md`](../SECURITY.md).
