# Contributing

## Development Setup

```bash
npm install
npm run check
npm test
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
    tools/
  changelog/
config/
docs/
test/
```

## Pull Request Checklist

- Code uses ES modules.
- MCP stdio logs do not write to stdout.
- New tools are registered in `src/mcp-server/server.js`.
- Safety policy changes update `config/safety-policy.json` and tests.
- Documentation is updated in `docs/`.
- `npm run check`, `npm test`, and `npm audit --audit-level=high` pass.
