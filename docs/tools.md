# MCP Tools

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
