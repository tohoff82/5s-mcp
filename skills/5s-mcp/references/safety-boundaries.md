# Safety boundaries

Read the canonical [security model](../../../docs/06-SECURITY-AND-TRUST-BOUNDARIES.md) and [policy/approval contract](../../../docs/07-MAINTENANCE-LIFECYCLE/POLICY-AND-APPROVALS.md).

- Run as the least-privileged operator account for the intended scope.
- Treat annotations and JSON Schemas as hints/contracts, not authentication or permission.
- Require exact operator-approved paths, targets, host/account, cron path, policy rule, plan id, and time window.
- Preserve deny rules, dry-run defaults, stage, required-backup, approval, re-evaluation, and verification gates.
- Keep credentials, private keys, identity contents, tokens, environment secrets, sensitive host output, plan contents, and backup contents out of chat and artifacts.
- Treat partial result lists as partial outcomes; inspect skipped/failed items and before/after verification.
- On a failed gate, correct scope/trust/configuration or stop. Never broaden policy or privilege merely to make a call succeed.
