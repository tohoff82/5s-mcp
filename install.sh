#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_dir"

run_local_gates() {
  npm run check
  npm test
  npm run docs:verify
  node demo.js test
}

print_config() {
  cat <<EOF
{
  "mcpServers": {
    "5s": {
      "command": "node",
      "args": ["$repo_dir/src/mcp-server/index.js"]
    }
  }
}
EOF
}

case "${1:-verify}" in
  install)
    npm ci
    run_local_gates
    print_config
    ;;
  verify)
    run_local_gates
    ;;
  release-verify)
    npm run verify
    ;;
  config)
    print_config
    ;;
  *)
    echo "Usage: $0 {install|verify|release-verify|config}" >&2
    echo "System packages, services, policy, cron, and cleanup are intentionally not mutated by this helper." >&2
    exit 2
    ;;
esac
