# Documentation

This directory contains the current operational documentation for the 5S MCP server. Historical server-specific notes and unsafe legacy procedures were removed from the working docs; git history remains the source for old records.

## Read First

1. [Safety](safety.md)
2. [Operations](operations.md)
3. [Tools](tools.md)

## Reference

- [Architecture](architecture.md)
- [Remote Clean](remote-clean.md)
- [Changelog](changelog.md)
- [Production Hardening](PRODUCTION-HARDENING.md)

## Current Documentation Rules

- Do not document direct cleanup commands as recommended actions.
- Destructive maintenance must be represented as `Seiso` plans, staged artifacts, and approved applies.
- Cron documentation must go through `5s_cron_manager`.
- Remote cleanup documentation must go through `5s_remote_clean`.
- Server-specific IPs, hostnames, SSH keys, and deployment paths do not belong in this repository documentation.
