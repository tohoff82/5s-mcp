---
document_id: 5S-DOC-SCHEDULED-MAINTENANCE
authority: canonical
status: current
source_of_truth: src/mcp-server/tools/cron-manager.js
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [operator, maintainer, agent]
---

# Scheduled maintenance contract

Use `5s_cron_manager` for cron content and file lifecycle. Default jobs run read-only Shitsuke health and audit actions. Destructive cleanup must never be embedded in cron; create and approve a Seiso plan in a separate maintenance window.

## Safe workflow

1. `render` using the intended project directory, Node binary, cron user, and jobs.
2. `validate` the same content. The renderer rejects destructive command patterns.
3. Review schedule, absolute paths, output destinations, permissions, and service name.
4. Use `install` with default `dry_run=true`; inspect the policy verdict and rendered content.
5. Set `dry_run=false` only for the exact approved cron path. Install evaluates policy before writing.
6. Read back the file and verify cron service status. `reload_service=true` is an additional host mutation.
7. For removal, dry-run first. Non-dry-run removal also evaluates the exact cron path through policy before deleting and optionally reloading.

The legacy `5s-shitsuke` action `schedule` renders content only. It does not own cron file mutation. Do not edit a managed cron file directly or schedule Seiso compatibility aliases as unattended cleanup.
