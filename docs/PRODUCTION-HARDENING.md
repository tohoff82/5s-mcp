# 5S MCP Production Hardening Plan

This service is hardened around one rule: cleanup tools must produce plans first and only apply changes after policy validation.

## Runtime Safety Model

1. `observe`: read-only discovery and health checks.
2. `plan`: produce a manifest of candidate changes.
3. `evaluate`: validate paths and commands through `5s_safety_policy`.
4. `stage`: backup or dry-run the exact manifest.
5. `apply`: execute only approved operations.
6. `verify`: re-check services, disk, memory, and logs.
7. `record`: write evidence to changelog/audit history.

## New Tools

### `5s_safety_policy`

Agent-facing policy manager for deny/allow rules.

Actions:
- `list`: read current deny/allow rules.
- `add_rule`: add a `deny` or `allow` rule.
- `remove_rule`: remove a rule by id.
- `evaluate`: check a command/path set before execution.
- `reset`: restore default production policy.

Default deny examples:
- `/root/ui-agent`
- `/etc/systemd/system`
- `/etc/ssh`
- `/etc/nginx`
- `/var/lib/mongodb`
- `/var/lib/rabbitmq`

### `5s_cron_manager`

Cron management without server-specific hardcoding.

Actions:
- `render`: render cron content without writing it.
- `install`: install a cron file.
- `read`: read an existing cron file.
- `remove`: remove a cron file.
- `validate`: validate schedule and command safety.

Default jobs are read-only:
- daily health check
- weekly audit

The tool refuses destructive cron command classes: file removal, package removal, kernel cache mutation, host shutdown, and host reboot. Destructive maintenance must go through staged plans.

### `5s_remote_clean`

Remote cleanup mode for agent sessions.

Actions:
- `analyze`: infer touched paths from `paths_visited` and `commands_executed`.
- `plan`: inspect safe remote candidates and build cleanup operations.
- `cleanup`: apply approved cleanup operations.

Remote cleanup is limited to safe roots:
- `/tmp`
- `/var/tmp`
- `/home`

Denied roots include:
- `/etc`
- `/usr`
- `/bin`
- `/sbin`
- `/lib`
- `/lib64`
- `/var/lib`
- `/root/.ssh`

## Production Readiness Checklist

- Safety policy exists in code and config.
- Agents can manage deny/allow rules through MCP.
- Cron is managed through MCP without hardcoded deployment paths.
- Cron defaults avoid destructive maintenance.
- Remote cleanup is dry-run by default and evidence-driven.
- MCP SDK is updated to a non-vulnerable version.
- Changelog modules are valid ESM.
- Test suite covers safety policy, cron management, remote cleanup helpers, and MCP tool registration.

## Verification

Run:

```bash
npm run check
npm test
npm audit --audit-level=high
```
