---
document_id: 5S-DOC-DEVELOPMENT
authority: canonical
status: current
source_of_truth: src/mcp-server/tool-registry.js, src/mcp-server/server.js, and scripts
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [maintainer]
---

# Development and extension

## Add or change a tool

1. Create or update one factory under `src/mcp-server/tools/` returning exact `name`, `description`, `inputSchema`, and `execute` members.
2. Add one ordered entry to `TOOL_REGISTRATIONS` with source, group, lifecycle, policy path, and conservative boolean annotations. Classify a mixed tool by its most powerful action.
3. Keep list-tools and docs on `createRegisteredTools`; do not add a second registry in `server.js`, README, or a skill.
4. Validate each action in the handler. Use `execFile`/argv where possible, bound output/time, and keep secrets out of inputs, errors, logs, and results.
5. For paths, writes, destructive actions, policy relaxation, cron, or remote behavior, add explicit policy/dry-run/approval/fail-closed gates and tests.
6. Add tests for registration, schema, read/write behavior, denied paths, approval, state persistence, partial failure, platform fallback, and recovery.
7. Run `npm run docs:generate`; update canonical operator/security/lifecycle/examples only when behavior changed. Never hand-edit generated `04`.
8. Run `npm run check`, `npm test`, `npm run docs:links`, `npm run docs:verify`, `npm run poka:validate`, production audit, and pack dry run. The script uses `profile=repo`; use `profile=production` only for the deployable content placed in scope.

## Documentation changes

Classify every maintained Markdown file in `docs/documentation-manifest.json`. Canonical/current files require complete frontmatter and an entry in the documentation map. Supporting material cannot redefine runtime or safety contracts. A compatibility route should point to one canonical destination rather than duplicate content.

## Architecture boundary

A finite read-only action using existing helpers can follow the normal workflow. A new destructive action, privilege model, persistent lifecycle, remote transport, credential type, schema/state version, automatic scheduler, policy bypass/relaxation, package entrypoint, or rollback claim requires explicit architecture and security review. Update tests and canonical docs only after the runtime boundary is implemented and verified.
