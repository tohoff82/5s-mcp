---
document_id: 5S-DOC-UPSTREAM
authority: canonical
status: current
source_of_truth: package.json, package-lock.json, and host command adapters
last_verified_commit: 9c8356ab10310197091d4b683cc06a3c917db84f
audience: [maintainer, release-owner]
---

# Upstream watch

Review at every dependency/runtime upgrade and release. Record evidence in the change or closure record; this table does not authorize automatic upgrades.

| Upstream | Expected boundary | Risk surface | Verification | Review trigger |
|---|---|---|---|---|
| Node.js | package supports >=18 and ESM | stdio, signals, filesystem, child process behavior | supported-version tests and syntax checks | minimum/EOL or runtime change |
| MCP SDK | list-tools/call-tools over stdio with annotations | schema/annotation/result compatibility | MCP registry test and client smoke test | SDK minor/major/security advisory |
| npm dependency tree | no unaccepted moderate-or-higher production advisory | transitive HTTP/schema/runtime packages | `npm run audit:prod`, registry-signature verification, lock review | advisory or lock update |
| Linux/macOS host tools | unsupported capabilities remain explicit | `systemctl`, `journalctl`, apt, `df`, `free`, `tar`, cron differences | platform tests and read-only smoke checks | OS/tool major change |
| OpenSSH client | batch finite remote inspection/cleanup | host trust, quoting, identity path, exit/output behavior | remote-clean unit tests plus approved host smoke test | OpenSSH or policy change |
| Filesystem/archive tools | plan and backup roots preserve identity and content | permissions, symlinks, inode drift, tar failure | Seiso engine tests and staged fixture | filesystem/tar/platform change |
| Optional MongoDB driver/server | filesystem remains default changelog storage | URI credentials, schema/upsert behavior, data retention | isolated optional integration test | driver/server/schema change |

Any upstream change that alters privilege, remote execution, deletion, policy matching, backup, cron, stdio framing, or state format requires architecture/security review rather than documentation-only normalization.
