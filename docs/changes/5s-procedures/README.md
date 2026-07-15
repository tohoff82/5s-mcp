---
document_id: 5S-DOC-PROCEDURE-RECORDS
authority: supporting
status: current
source_of_truth: docs/changelog.md
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [operator, maintainer]
---

# 5S procedure records

This directory stores structured records for 5S maintenance procedures.

Current user-facing documentation lives in [../../changelog.md](../../changelog.md).

## Storage Model

```text
docs/changes/5s-procedures/
  README.md
  CHANGELOG-FORMAT.md
  MONGODB-INTEGRATION.md
  schemas/
  templates/
  <year>/<quarter>/<entry-id>.json
  <year>/<quarter>/<entry-id>.md
```

## Current Rule

Procedure records must describe plan-first maintenance. For cleanup work, record the `Seiso` plan id, staged artifact, backup reference, approval, verification snapshots, and apply result. Do not record raw delete pipelines as the recommended procedure.

The canonical [local Seiso contract](../../07-MAINTENANCE-LIFECYCLE/LOCAL-SEISO.md) defines the current evidence requirements.
