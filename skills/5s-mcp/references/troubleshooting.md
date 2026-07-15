# Troubleshooting

Start with the canonical [troubleshooting guide](../../../docs/09-TROUBLESHOOTING.md). Gather only bounded/redacted MCP results, stderr, versions, policy verdicts, plan/stage metadata, result lists, and verification snapshots.

Check in this order: server/dependency/client path; generated registry drift; platform support; actual target state; policy verdict; plan and manifest; stage and required backup; approval; per-operation result; before/after verification; cron path/content; SSH trust and remote evidence.

Apply only documented remediation. Do not edit saved plans, weaken policy inside cleanup, bypass a failed backup, directly edit managed cron, invent remote evidence, expose credentials, or describe partial success as complete.
