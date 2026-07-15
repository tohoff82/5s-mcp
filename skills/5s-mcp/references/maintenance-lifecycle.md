# Maintenance lifecycle

Read the complete canonical [maintenance lifecycle](../../../docs/07-MAINTENANCE-LIFECYCLE/README.md).

For local cleanup: observe, create and review a persisted plan, stage the exact plan, require a successful mandatory backup, obtain approval, apply, inspect every result and before/after verification, then record. Compatibility cleanup actions create plans only.

For remote cleanup: provide accurate session evidence, analyze, plan, dry-run cleanup, obtain exact host/account/path approval, run the fresh manifest cleanup, then independently re-inspect and record. Remote clean has no reusable immutable `plan_id`; do not imply otherwise.

For policy and cron mutations: list/render/validate and dry-run first, preserve a recovery copy, obtain separate scope, apply the narrow mutation, read back/verify, and record.
