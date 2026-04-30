# 5S Procedure Records

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
