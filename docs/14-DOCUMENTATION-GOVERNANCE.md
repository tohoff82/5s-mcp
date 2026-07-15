---
document_id: 5S-DOC-GOVERNANCE
authority: canonical
status: current
source_of_truth: docs/documentation-manifest.json
last_verified_commit: worktree-based-on-a9b90ff198610dfd560057a321c3e0ce4bd3fba5
audience: [maintainer, agent]
---

# Documentation governance

`canonical` defines current behavior/contracts; `generated` is mechanically derived; `supporting` explains without redefining; `historical` preserves prior evidence/plans. Lifecycle is `current`, `deprecated`, or `archived`. Runtime source wins over generated output; otherwise current canonical documents resolve conflicts.

Every maintained Markdown file is classified by [`documentation-manifest.json`](documentation-manifest.json). Canonical/current files use unique `document_id`, authority, status, source of truth, verified commit, and audience metadata. Numbered names establish stable reading order. Compatibility routes and skills may not duplicate schemas, tool catalogs, lifecycle contracts, or readiness claims.

Internal links must be relative and pass the offline checker. Generated documents carry a warning and change only through their generator. Examples use synthetic identifiers and contain no credentials, private filesystem identifiers, destructive shortcuts, or bypass flags.

| Change category | Required documentation action |
|---|---|
| Tool/schema/annotation/registry | regenerate `04`; update matrix/examples/operator/security; run all doc gates |
| Cleanup/policy/cron/remote safety | update `06` and complete `07` contract; add fail-closed tests |
| State, package, platform, dependency | update inventory/release/upstream and pack verification |
| Agent workflow | update the skill as a route into canonical docs, not an independent source |
| Documentation only | update manifest/map/links and prove runtime source diff is empty |

Review requires source fact validation, generator/verifier/link tests, sensitive-data scan, and bounded claims. Historical procedure records preserve the event as recorded; later corrections belong in a new record or explicit erratum rather than silently rewriting accepted evidence.
