---
document_id: 5S-DOC-MAINTENANCE-INDEX
authority: canonical
status: current
source_of_truth: src/maintenance-engine.js and safety-control tool handlers
last_verified_commit: 9c8356ab10310197091d4b683cc06a3c917db84f
audience: [operator, maintainer, agent]
---

# Maintenance lifecycle

This subsystem is the canonical contract for state-changing maintenance. Local Seiso, remote cleanup, policy mutation, and cron mutation share observation-first intent but have different state and verification semantics.

## Route by operation

| Operation | Contract |
|---|---|
| Local cleanup | [Local Seiso](LOCAL-SEISO.md): persisted plan, stage, required-backup gate, approved apply, verification |
| Remote session cleanup | [Remote clean](REMOTE-CLEAN.md): evidence, fresh plan, dry-run, approved manifest cleanup, caller verification |
| Safety rule change or verdict | [Policy and approvals](POLICY-AND-APPROVALS.md) |
| Cron render/install/remove | [Scheduled maintenance](SCHEDULED-MAINTENANCE.md) |

## Common invariant

```text
observe -> plan -> policy evaluation -> stage -> approved apply -> verify -> record
```

This exact persisted state machine belongs to local Seiso. Other mutation tools must preserve the intent—observe first, evaluate policy, dry-run, require explicit scope, verify, and record—but must not claim a Seiso `plan_id` or stage artifact when their runtime does not create one.

Never replace these flows with a direct delete pipeline, direct cron edit, broad remote-root cleanup, or undocumented policy bypass.
