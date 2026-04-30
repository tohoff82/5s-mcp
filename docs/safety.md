# Safety

Safety is a runtime contract, not a documentation recommendation.

## Required Flow

```text
observe -> plan -> evaluate -> stage -> apply -> verify -> record
```

`apply` is valid only when:

- the plan exists,
- the plan has been staged,
- `approved=true` is passed,
- policy evaluation allows every operation being executed.

## Risk Levels

| Level | Meaning | Typical handling |
| --- | --- | --- |
| `P0_SAFE` | Read-only observation. | No approval. |
| `P1_LOW` | Low-risk allowed command. | Approval recommended if destructive. |
| `P2_MEDIUM` | Allowed cleanup such as old rotated logs. | Approval required. |
| `P3_HIGH` | High-risk area or package removal. | Explicit approval and staged backup required. |
| `P4_FORBIDDEN` | Denied path/command. | Blocked until policy changes. |

## Default Deny Rules

Configured in [../config/safety-policy.json](../config/safety-policy.json):

- `/root/ui-agent`
- `/etc/systemd/system`
- `/etc/ssh`
- `/etc/nginx`
- `/var/lib/mongodb`
- `/var/lib/rabbitmq`
- recursive delete of filesystem root
- delete operations under systemd units

## Default Allow Rules

- APT cache paths
- old `/tmp` and `/var/tmp` files
- old compressed rotated logs
- journal vacuum with at least 30 days retention
- APT clean/autoclean

## Managing Policy

Use `5s_safety_policy`; do not edit policy by hand during agent workflows.

List current rules:

```json
{
  "action": "list",
  "kind": "all"
}
```

Evaluate an operation:

```json
{
  "action": "evaluate",
  "operation": {
    "command": "manifest-remove /tmp/agent-run",
    "paths": ["/tmp/agent-run"],
    "destructive": true,
    "approved": false
  }
}
```

Add a deny rule:

```json
{
  "action": "add_rule",
  "kind": "deny",
  "rule": {
    "id": "deny-custom-data",
    "type": "path_prefix",
    "value": "/srv/customer-data",
    "reason": "Application data"
  }
}
```

## Lean Extension Safety

Lean extension tools do not bypass the safety contract:

- `kaizen_improve` may record initiatives, but cleanup recommendations link to `seiso_clean_system` plans.
- `gemba_inspect` is read-only and blocks denied target paths.
- `poka_yoke_guard` reports prevention findings and approval levels, but does not edit files.
- `lean_ops` observes disk, memory, and waste signals; any cleanup follow-up still requires Seiso plan/stage/apply.

`poka_yoke_guard` supports `repo`, `production`, `docs`, and `tests` profiles. Use `production` for deployable automation; use `repo` for repository checks so fenced documentation examples and test fixtures are downgraded instead of treated as live destructive commands.
