---
document_id: 5S-DOC-PROCEDURE-FORMAT
authority: supporting
status: current
source_of_truth: docs/changelog.md and docs/07-MAINTENANCE-LIFECYCLE/LOCAL-SEISO.md
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [operator, maintainer]
---

# 5S changelog format

Every entry should capture what changed, why it changed, how it was validated, and how it can be rolled back.

## Required Cleanup Evidence

For `seiso` procedures:

- `plan_id`
- dry-run artifact path
- backup reference
- policy verdict summary
- approval source
- verification snapshot before and after apply
- manifest item count
- bytes removed from apply results

## Minimal JSON Shape

```json
{
  "procedure": {
    "type": "seiso",
    "name": "Staged cleanup plan",
    "category": "maintenance"
  },
  "changes": {
    "type": "optimize",
    "what": "Created and applied a staged cleanup manifest",
    "why": "Free safe reclaimable space",
    "how": "seiso_clean_system observe -> plan -> stage -> apply"
  },
  "impact": {
    "scope": "system",
    "severity": "medium",
    "performance_metrics": {
      "space_freed_bytes": 0
    }
  },
  "technical": {
    "files_modified": [],
    "commands_executed": [
      "seiso_clean_system action=plan",
      "seiso_clean_system action=stage",
      "seiso_clean_system action=apply approved=true"
    ],
    "services_affected": [],
    "backup_location": "/backup/5s/<plan-id>.tar.gz",
    "rollback_procedure": "restore from the staged backup archive",
    "validation_steps": [
      "npm test",
      "post-apply service health check"
    ]
  },
  "human_resources": {
    "executor": "agent",
    "skill_level_required": "intermediate"
  },
  "status": {
    "current": "completed",
    "completion_percentage": 100,
    "maintenance_frequency": "weekly"
  },
  "tags": ["seiso", "staged-cleanup", "manifest"]
}
```
