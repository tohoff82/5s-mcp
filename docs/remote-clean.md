# Remote Clean

`5s_remote_clean` helps agents clean up after their work on remote servers. It is evidence-driven: the agent supplies paths visited and commands executed, then the tool infers candidates and builds a plan.

Remote cleanup is manifest-based. A plan may inspect a concrete touched directory, but apply removes only manifest file items. It does not remove broad roots such as `/tmp`, `/var/tmp`, `/home`, or `/home/user`.

## Safe Roots

Remote cleanup candidates are limited to:

- `/tmp`
- `/var/tmp`
- `/home`

The candidate must be below these roots, for example `/tmp/agent-run-123`, `/var/tmp/build-abc`, or `/home/deploy/worktree`. The root directories themselves are not valid cleanup targets.

Denied roots include:

- `/etc`
- `/usr`
- `/bin`
- `/sbin`
- `/lib`
- `/lib64`
- `/var/lib`
- `/root/.ssh`

## Flow

Analyze:

```json
{
  "action": "analyze",
  "host": "server.example",
  "user": "root",
  "paths_visited": ["/tmp/agent-run"],
  "commands_executed": ["cd /tmp/agent-run && npm test"]
}
```

Plan:

```json
{
  "action": "plan",
  "host": "server.example",
  "paths_visited": ["/tmp/agent-run"],
  "commands_executed": ["cd /tmp/agent-run && npm test"],
  "dry_run": true
}
```

Apply after review:

```json
{
  "action": "cleanup",
  "host": "server.example",
  "paths_visited": ["/tmp/agent-run"],
  "commands_executed": ["cd /tmp/agent-run && npm test"],
  "dry_run": false,
  "approved": true
}
```

## SSH

The tool uses SSH in batch mode and accepts:

- `host`
- `user`
- `port`
- `identity_file`

Use project-specific SSH/firewall tooling outside this repository when access needs to be prepared.
