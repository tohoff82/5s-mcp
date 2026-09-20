---
document_id: 5S-DOC-RELEASE
authority: canonical
status: current
source_of_truth: package.json, package-lock.json, test, and scripts
last_verified_commit: worktree-based-on-87a810c1969825b52c4d9f8c554b04d827c978a7
audience: [maintainer, release-owner]
---

# Release and verification contract

Verify from a clean source extraction whose root is the repository root. Do not reuse local plans, backups, cron files, audit/metric/report state, Kaizen backlog, credentials, or host-specific configuration.

Canonical metadata must name the actual verified commit for a release. A `worktree-based-on-...` value is honest development-state evidence, not a releasable commit identifier.

```sh
npm ci
npm run check
npm test
node demo.js test
./install.sh verify
npm run docs:check
npm run docs:links
npm run docs:verify
npm run poka:validate
npm run audit:prod
npm run pack:dry-run
```

The moderate-and-higher production audit is a release gate. A failing advisory result must be reported and resolved through a reviewed dependency change; documentation cannot waive it. `npm run check` syntax-checks every shipped/runtime, test, and maintenance JavaScript module plus the bootstrap shell. Pack output must contain the runtime source, canonical docs, manifest, generator/verifier scripts, skill membrane, active changelog schemas/templates, root onboarding/security files, configuration defaults, and license without local operator state. Historical procedure records remain repository evidence and are excluded from the npm allowlist.

## Documentation membrane gate

Documentation closure requires:

- 12 registered and unique tools in one runtime registry;
- group counts of 5 core, 3 safety controls, and 4 Lean extensions;
- 6 read-only tools and 4 destructive-capable tools from conservative annotations;
- package and MCP handshake version equality;
- zero generated reference drift, broken internal links, unclassified Markdown files, duplicate document ids, authority mismatches, or unindexed canonical docs;
- a portable version-matched MCP config with no duplicated tool catalog, plus a bootstrap helper with no package/service/cron/cleanup mutation;
- active procedure templates that route maintenance through MCP rather than direct destructive commands;
- no unsupported sandbox, authorization, platform, or rollback claims;
- no private-key markers in canonical material.

For a documentation-only change, prove the runtime source diff is empty. If runtime was changed to reconcile a documented safety boundary, identify the exact invariant, tests, and source diff as a mixed documentation/runtime change.


## SafeOps hackathon verification gates

The SafeOps hackathon branch adds repository and controlled-fixture checks without changing the inherited 12-tool documentation membrane:

```sh
npm run safeops:test
node --test demo/safeops-participant/test/*.test.mjs
node scripts/safeops-fixture.mjs create
node scripts/safeops-fixture.mjs verify
node scripts/safeops-fixture.mjs reset
node --check scripts/safeops-c0-start.mjs
```

Repository PASS demonstrates source-level contracts: exact three-tool projection, target binding, approval scoping, policy/classification behavior, verification, OAuth/client carrier contracts, and the thin participant-surface boundary.

The controlled live-demo receipts add a different class of evidence: user OAuth authorization-code + PKCE, authenticated MCP initialize/list, inspect, bounded SAFE-only apply, a real controlled effect, post-effect verification, and explanation of the same effectful workflow.

Neither class of evidence should be inflated into a production-readiness claim. They do not prove Amazon-hosted Alexa+ UI access, unrestricted agent authority, customer production deployment, production identity-provider readiness, or mainline adoption.

The hackathon OAuth lab keeps its dependency boundary under `lab/oauth/`. Any dependency or lockfile delta remains subject to the normal repository audit and verification gates; documentation does not waive those checks.
