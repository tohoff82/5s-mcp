---
document_id: 5S-DOC-MONGODB-SYNC
authority: supporting
status: current
source_of_truth: src/changelog/mongodb-connector.js
last_verified_commit: 9c8356ab10310197091d4b683cc06a3c917db84f
audience: [operator, maintainer]
---

# MongoDB integration

MongoDB sync is optional. The changelog works with filesystem storage when MongoDB is unavailable.

This integration stores supporting procedure records. It is not a cleanup policy, authorization, stage, backup, or verification boundary.

## Configuration

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=5s_procedure_changelog
CHANGELOG_BASE_DIR=docs/changes/5s-procedures
```

## Collections

| Collection | Purpose |
| --- | --- |
| `fiveS_changelog` | Active entries |
| `fiveS_changelog_archive` | Archived entries |

## Behavior

- `FiveSChangelogMongo.connect()` returns `false` when the optional `mongodb` package is not installed.
- File storage remains the default durable path.
- Search filters map to `procedure.type`, `impact.severity`, `status.current`, `human_resources.executor`, and `quarter`.

## Sync

```bash
node src/changelog/cli.js sync
```

Sync reads JSON records from `CHANGELOG_BASE_DIR` and upserts them by `id`.
