---
document_id: 5S-DOC-CONTRIBUTING
authority: supporting
status: current
source_of_truth: docs/10-DEVELOPMENT-AND-EXTENSION.md
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [maintainer, contributor]
---

# Contributing

This guide supports the canonical [development workflow](docs/10-DEVELOPMENT-AND-EXTENSION.md), which wins if the two conflict.

## Development Setup

```bash
npm install
npm run check
npm test
npm run docs:verify
node demo.js test
```

## Safety Requirements

Changes to cleanup behavior must preserve the production safety contract:

```text
observe -> plan -> evaluate -> stage -> apply -> verify -> record
```

Do not add direct delete pipelines or destructive cron jobs. Cleanup behavior belongs in `src/maintenance-engine.js` and must be covered by tests.

## Project Layout

```text
src/
  maintenance-engine.js
  safety-policy.js
  mcp-server/
    index.js
    server.js
    tool-registry.js
    tools/
  changelog/
config/
docs/
test/
```

## Pull Request Checklist

- Code uses ES modules.
- MCP stdio logs do not write to stdout.
- New tools are registered once in `src/mcp-server/tool-registry.js`.
- Safety policy changes update `config/safety-policy.json` and tests.
- Documentation changes preserve the manifest, generated reference, authority order, and internal links.
- `npm run check`, `npm test`, `npm run docs:verify`, `npm run audit:prod`, and `npm run pack:dry-run` pass.
