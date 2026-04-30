# Remote Clean

`5s_remote_clean` helps agents clean up after their work on remote servers. It is evidence-driven: the agent supplies paths visited and commands executed, then the tool infers candidates and builds a plan.

## Safe Roots

Remote cleanup candidates are limited to:

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
