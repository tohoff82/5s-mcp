# MongoDB Integration

MongoDB sync is optional. The changelog works with filesystem storage when MongoDB is unavailable.

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
