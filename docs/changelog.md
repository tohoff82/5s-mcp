---
document_id: 5S-DOC-PROCEDURE-CHANGELOG
authority: supporting
status: current
source_of_truth: src/changelog and docs/changes/5s-procedures
last_verified_commit: 9c8356ab10310197091d4b683cc06a3c917db84f
audience: [operator, maintainer]
---

# Changelog system

The changelog records 5S maintenance work with file storage by default and optional MongoDB sync.

This is supporting storage guidance. The canonical [maintenance lifecycle](07-MAINTENANCE-LIFECYCLE/README.md) defines required cleanup evidence and wins if a procedure example conflicts.

## Location

```text
docs/changes/5s-procedures/
  README.md
  CHANGELOG-FORMAT.md
  MONGODB-INTEGRATION.md
  schemas/
  templates/
```

Runtime entries are created under year/quarter directories.

## CLI

```bash
node src/changelog/cli.js create --template seiso
node src/changelog/cli.js search --type seiso
node src/changelog/cli.js show <entry-id>
node src/changelog/cli.js stats --quarter 2026-Q2
```

## Programmatic Usage

```javascript
import FiveSChangelogManager from './src/changelog/changelog-manager.js';

const manager = new FiveSChangelogManager({
  baseDir: 'docs/changes/5s-procedures',
  autoSync: false
});

await manager.initialize();
await manager.createEntry({
  procedure: {
    type: 'seiso',
    name: 'Staged cleanup plan',
    category: 'maintenance'
  },
  changes: {
    type: 'optimize',
    what: 'Created and staged cleanup manifest',
    why: 'Production maintenance',
    how: 'Seiso plan/stage/apply workflow'
  },
  impact: {
    scope: 'system',
    severity: 'medium'
  },
  human_resources: {
    executor: 'agent'
  }
});
```

## MongoDB

MongoDB is optional. If the `mongodb` package is unavailable or sync is disabled, the changelog falls back to files.

Environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=5s_procedure_changelog
CHANGELOG_BASE_DIR=docs/changes/5s-procedures
```
