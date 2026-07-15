---
document_id: 5S-DOC-EXAMPLES
authority: canonical
status: current
source_of_truth: docs/04-TOOLS-REFERENCE.md and docs/07-MAINTENANCE-LIFECYCLE/README.md
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [user, operator, agent]
---

# Safe usage examples

All hosts, paths, ids, and commands below are synthetic. Read the [generated reference](04-TOOLS-REFERENCE.md) for the exact current schema. Do not paste credentials, private keys, tokens, or unreviewed host output.

Start with read-only context:

```json
{"tool":"gemba_inspect","arguments":{"action":"context","target_path":".","max_files":20}}
```

```json
{"tool":"lean_ops","arguments":{"action":"andon_status","target_path":"."}}
```

Classify old temporary files without deleting them:

```json
{"tool":"seiri_sort_analyze","arguments":{"target":"files","path":"/tmp/5s-demo","criteria":{"age_days":30,"size_mb":10,"include_hidden":false}}}
```

## Local Seiso

```json
{"tool":"seiso_clean_system","arguments":{"action":"observe","targets":["temp"],"preserve_days":30}}
```

```json
{"tool":"seiso_clean_system","arguments":{"action":"plan","targets":["temp"],"preserve_days":30,"aggressive_level":1}}
```

After reviewing the returned plan, use its exact synthetic-format id for staging:

```json
{"tool":"seiso_clean_system","arguments":{"action":"stage","plan_id":"5s-plan-YYYYMMDDHHMMSS-abcdef"}}
```

Only an operator-approved staged plan can be applied:

```json
{"tool":"seiso_clean_system","arguments":{"action":"apply","plan_id":"5s-plan-YYYYMMDDHHMMSS-abcdef","approved":true}}
```

## Policy, cron, and prevention

```json
{"tool":"5s_safety_policy","arguments":{"action":"list","kind":"all"}}
```

```json
{"tool":"5s_cron_manager","arguments":{"action":"render","project_dir":"/srv/5s-mcp","node_bin":"/usr/bin/node","user":"root"}}
```

```json
{"tool":"poka_yoke_guard","arguments":{"action":"validate","target_path":".","max_files":100,"profile":"repo"}}
```

Use `profile=production` only when strict deployable-content treatment is intended.

## Remote evidence

Begin with analysis on an approved SSH alias; this call does not authorize cleanup:

```json
{"tool":"5s_remote_clean","arguments":{"action":"analyze","host":"lab-host","user":"deploy","session_id":"session-example","paths_visited":["/tmp/agent-session-example"],"commands_executed":["cd /tmp/agent-session-example && npm test"],"dry_run":true}}
```

Follow the complete [remote-clean contract](07-MAINTENANCE-LIFECYCLE/REMOTE-CLEAN.md). Never use `/tmp`, `/var/tmp`, `/home`, or a home directory itself as the cleanup candidate.
