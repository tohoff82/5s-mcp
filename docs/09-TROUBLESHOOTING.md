---
document_id: 5S-DOC-TROUBLESHOOTING
authority: canonical
status: current
source_of_truth: src, test, and package.json
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [user, operator, agent]
---

# Troubleshooting

Use bounded/redacted MCP results, stderr, plan metadata, policy verdicts, and test output. Do not paste credentials, identity-file contents, environment secrets, complete host configs, or unbounded command output.

| Symptom | Likely cause | Safe checks | Safe remediation | Do not |
|---|---|---|---|---|
| Server does not start | Node/dependency/client path | `node --version`, `npm run check`, absolute entrypoint | clean `npm ci`; correct client config | write diagnostics to stdout |
| Tool missing or schema unexpected | stale checkout/docs or registry drift | `npm run docs:check`; inspect generated reference | regenerate docs after source review | hand-edit generated `04` |
| Platform result is unsupported | Linux-only utility/service absent | Shitsuke health, platform helper tests | choose a supported observation or host | treat unsupported as healthy success |
| Target denied | deny rule or unsafe scope | policy `list` and `evaluate` | correct target or obtain separate policy-change authorization | weaken policy inside cleanup |
| Seiso plan has blocked operations | deny match, risk, missing approval | inspect every verdict/reason | narrow targets and re-plan | edit saved plan JSON |
| Stage fails | backup directory/tool/permissions or archive error | inspect `stage_failed` and `stage_attempt.backup` | repair backup prerequisite and re-plan/stage | apply without successful required backup |
| Apply partially succeeds | policy changed or operation error | results plus before/after verification | stop, assess residual state, use approved recovery | assume envelope success means every item ran |
| Cron mutation blocked | destructive content, denied path, or permissions | render, validate, dry-run verdict | correct approved path/content/privilege | edit managed cron directly |
| Remote candidate missing | broad root, denied root, weak evidence, age filter | analyze with accurate session evidence | supply concrete attributable descendant path | invent evidence or broaden safe roots |
| Remote cleanup error | SSH trust/access, state drift, remote permission | approved SSH diagnostics; repeat analyze/plan | repair trust/access and perform fresh dry-run | expose key material or bypass host trust |
| Poka-Yoke produces noisy findings | wrong profile or mixed docs/tests | compare `repo`, `docs`, `tests`, `production` intent | select the correct profile and fix live findings | ignore strict production findings wholesale |
| Documentation verification fails | unclassified doc, stale generated file, broken link, metadata drift | run `docs:check`, `docs:links`, then `docs:verify` | fix source/manifest/link and regenerate | lower the gate to fit stale docs |
| Production audit fails | vulnerable dependency tree | `npm run audit:prod`; inspect dependency ownership | update through a reviewed dependency change | describe a failing gate as passed |

Escalate maintenance-state incidents to the relevant [lifecycle contract](07-MAINTENANCE-LIFECYCLE/README.md). Preserve the plan id and bounded evidence before changing state.
