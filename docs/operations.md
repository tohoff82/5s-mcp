# Operations

This document describes how agents should operate the service in production.

## Cleanup With Seiso

1. Observe:

```json
{
  "action": "observe",
  "targets": ["temp", "logs"]
}
```

2. Create a plan:

```json
{
  "action": "plan",
  "targets": ["temp"],
  "preserve_days": 7,
  "aggressive_level": 2
}
```

3. Stage the plan:

```json
{
  "action": "stage",
  "plan_id": "5s-plan-..."
}
```

4. Apply after review:

```json
{
  "action": "apply",
  "plan_id": "5s-plan-...",
  "approved": true
}
```

## What a Plan Contains

- operation list
- manifest entries with path, size, mtime, owner uid/gid, inode, symlink flag, file usage status
- policy verdicts and risk levels
- estimated bytes from manifest
- verification snapshot before cleanup

## Cron Management

Cron is controlled by `5s_cron_manager`. The default jobs are read-only health and audit checks.

Render a cron file:

```json
{
  "action": "render",
  "project_dir": "/opt/5s-mcp",
  "node_bin": "/usr/bin/node"
}
```

Install after review:

```json
{
  "action": "install",
  "project_dir": "/opt/5s-mcp",
  "cron_path": "/etc/cron.d/5s-methodology",
  "dry_run": false,
  "reload_service": true
}
```

The cron manager refuses destructive maintenance commands. Use staged `Seiso` plans instead.

## Audits and Metrics

Use `5s-shitsuke`:

```json
{ "action": "health" }
```

```json
{ "action": "audit" }
```

```json
{ "action": "report" }
```

The legacy `schedule` action is read-only and returns cron content. Use `5s_cron_manager` to write or remove cron files.

## Lean Operating Loop

Use the Lean extension tools before or after maintenance when an agent needs improvement tracking, source inspection, risk prevention, or operational status.

1. Find improvement opportunities with `kaizen_improve`:

```json
{
  "action": "suggest",
  "scope": "all",
  "target_path": "."
}
```

2. Inspect the real working context without mutation with `gemba_inspect`:

```json
{
  "action": "context",
  "target_path": ".",
  "max_files": 20
}
```

3. Check for risky workflow patterns with `poka_yoke_guard`:

```json
{
  "action": "validate",
  "target_path": ".",
  "max_files": 100
}
```

4. Check maintenance readiness with `lean_ops`:

```json
{
  "action": "andon_status",
  "target_path": "."
}
```

Cleanup recommendations from these tools must still go through `seiso_clean_system` plan, stage, and approved apply. Cron recommendations must go through `5s_cron_manager`. Improvement records are tracked through `kaizen_improve`.

## Verification

Before committing operational changes:

```bash
npm run check
npm test
npm audit --audit-level=high
node demo.js test
```
