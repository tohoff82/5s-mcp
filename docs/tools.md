# MCP Tools

The production MCP surface currently exposes 12 tools. Cleanup-capable workflows are plan-first; Lean extension tools are read-only, backlog-only, or linked back to safe Seiso/Cron follow-up tools.

## `seiri_sort_analyze`

Classifies files, processes, packages, and logs. It does not remove anything.

```json
{
  "target": "files",
  "path": "/tmp",
  "criteria": {
    "age_days": 30,
    "size_mb": 10,
    "include_hidden": false
  }
}
```

File analysis returns classification buckets:

- `necessary`
- `conditional`
- `delete_candidate`
- `forbidden`

## `seiton_organize_system`

Inventory and organization planning. Production organization actions are plan-only.

```json
{
  "action": "analyze",
  "scope": "scripts",
  "target_path": "/opt/5s-mcp"
}
```

Workspace tree:

```json
{
  "action": "workspace_tree",
  "target_path": "/opt/5s-mcp",
  "max_depth": 3,
  "max_files": 200
}
```

## `seiso_clean_system`

Safe cleanup workflow.

```json
{
  "action": "plan",
  "targets": ["logs"],
  "preserve_days": 30,
  "aggressive_level": 2
}
```

Actions:

- `observe`
- `analyze`
- `plan`
- `stage`
- `apply`
- `clean`, `deep_clean`, `optimize` as compatibility aliases that create plans only

## `seiketsu_standardize_procedures`

Audit and generate standards.

```json
{
  "action": "generate_policy",
  "domain": "all",
  "standard_level": "basic"
}
```

Actions:

- `audit`
- `create_standards`
- `validate_compliance`
- `generate_checklist`
- `monitor_drift`
- `generate_policy`

## `5s-shitsuke`

Discipline and recurring checks.

```json
{
  "action": "health"
}
```

Actions:

- `audit`
- `metrics`
- `health`
- `schedule` as read-only legacy rendering
- `report`

## `5s_safety_policy`

Read and manage safety rules.

```json
{
  "action": "list",
  "kind": "all"
}
```

## `5s_cron_manager`

Manage cron files.

```json
{
  "action": "validate",
  "project_dir": "/opt/5s-mcp"
}
```

Actions:

- `render`
- `install`
- `read`
- `remove`
- `validate`

## `5s_remote_clean`

Evidence-driven cleanup for remote servers.

```json
{
  "action": "plan",
  "host": "server.example",
  "user": "root",
  "paths_visited": ["/tmp/agent-session"],
  "commands_executed": ["cd /tmp/agent-session && npm test"],
  "dry_run": true
}
```

Actions:

- `analyze`
- `plan`
- `cleanup`

## `kaizen_improve`

Continuous improvement backlog and recommendations. Read-only by default; cleanup recommendations link to `seiso_clean_system` plans.

```json
{
  "action": "suggest",
  "scope": "all",
  "target_path": "."
}
```

Actions:

- `suggest`: inspect repo/docs/tests/cleanup opportunities.
- `track`: add an improvement initiative to the backlog.
- `report`: summarize tracked initiatives.

Backlog storage defaults to `/tmp/5s-kaizen-backlog.json` and can be overridden with `FIVE_S_KAIZEN_BACKLOG`.

Track example:

```json
{
  "action": "track",
  "initiative": {
    "title": "Add weekly Poka-Yoke validation to release checks",
    "description": "Run poka_yoke_guard validate before merging cleanup changes.",
    "priority": "medium",
    "status": "open",
    "source": "agent"
  }
}
```

## `gemba_inspect`

Read-only source inspection. It respects safety policy for target paths and redacts secret-like values from context output.

```json
{
  "action": "context",
  "target_path": ".",
  "max_files": 20
}
```

Actions:

- `walk`: list file metadata.
- `observe`: read disk/process/service state.
- `context`: gather redacted previews from docs/config/source files.

Use `observe` for runtime context:

```json
{
  "action": "observe",
  "target_path": ".",
  "service": "ssh"
}
```

## `poka_yoke_guard`

Error-prevention scan/suggest/validate. It does not edit files; suggested fixes point to safe tools and approval levels.

```json
{
  "action": "scan",
  "target_path": ".",
  "max_files": 100
}
```

Actions:

- `scan`: identify risky command, secret, path, or cron patterns.
- `suggest`: group findings into prevention recommendations.
- `validate`: pass/fail based on high-risk findings.

Current prevention rules detect direct delete pipelines, possible secret literals, hardcoded root deployment paths, and cron edits that should go through `5s_cron_manager`.

## `lean_ops`

Additional Lean operations: waste detection, automation stop checks, and visual status.

```json
{
  "action": "andon_status",
  "target_path": ".",
  "thresholds": {
    "disk_warning": 80,
    "disk_critical": 90,
    "memory_warning": 85,
    "memory_critical": 95
  }
}
```

Actions:

- `muda_detect`: detect waste signals and link cleanup to Seiso plans.
- `jidoka_check`: decide whether automation should stop based on critical thresholds.
- `andon_status`: return `green`, `yellow`, or `red` status with summary details.

`lean_ops` only reports state. If `muda_detect` finds cleanup potential, the follow-up remains `seiso_clean_system` `plan -> stage -> apply`.
