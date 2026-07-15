---
document_id: 5S-DOC-SECURITY-REPORTING
authority: canonical
status: current
source_of_truth: docs/06-SECURITY-AND-TRUST-BOUNDARIES.md
last_verified_commit: 04d75cabcef5da03a21c22982dbe45dacfa6844c
audience: [user, operator, maintainer, security-researcher]
---

# Security policy

Report suspected vulnerabilities privately through a [GitHub security advisory](https://github.com/tohoff82/5s-mcp/security/advisories/new). Do not open a public issue containing exploit details, credentials, keys, tokens, private host data, or sensitive logs.

Include the affected version/commit, tool and action, prerequisite permissions, bounded reproduction steps using synthetic data, observed impact, and any safe mitigation. Redact filesystem identities, remote hosts, SSH material, environment values, plan contents, backups, cron contents, and procedure records unless they are essential and can be shared safely.

Security-relevant surfaces include MCP stdio framing, path/command handling, plan/stage/apply gates, backup enforcement, policy matching/mutation, cron install/removal, remote SSH cleanup, secret redaction, state permissions, package/dependency vulnerabilities, and documentation claims that could cause unsafe operation.

Operational maintenance incidents without a product vulnerability should follow the [troubleshooting guide](docs/09-TROUBLESHOOTING.md) and [security boundaries](docs/06-SECURITY-AND-TRUST-BOUNDARIES.md). Preserve bounded evidence and stop state-changing actions until ownership and scope are established.
