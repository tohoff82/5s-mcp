# Router MCP v2.0 Implementation

**Date:** 2026-01-15  
**Author:** AI Agent  
**Status:** ✅ Deployed

## Summary

Implemented claude-router-mcp v2.0 - a Facade pattern that reduces Claude API token overhead by 97.5%.

## Changes

### New Service: claude-router-mcp

- Location: `/root/ui-agent/services/claude-router-mcp/`
- Exposes 8 meta-tools instead of 326 direct tools
- Connects to ubuntu-mcp (305 tools) + local tools (10)

### Modified: tools-executor

- Removed direct local tool imports
- Added `router-mcp-bridge.js` for meta-tool registration
- Added `getRouterMCP()` to `mcp-client.js`

### Modified: claude-service

- `loadToolDefinitions()` now loads only 8 router meta-tools
- Removed direct ubuntu-mcp and local tool loading

## Metrics

| Before | After |
|--------|-------|
| 326 tools | 8 meta-tools |
| ~25,000 tokens/call | ~800 tokens/call |
| ~$0.075/call | ~$0.003/call |

## Git Commits

```
614de64 refactor: pure router-mcp mode - only 8 meta-tools
13714b9 feat: integrate router-mcp into ui-agent services
1045b24 feat: claude-router-mcp v2.0 - Facade pattern
```

## Rollback

```bash
# Return to 326 tools mode:
git checkout 3ac4888 -- services/tools-executor/src/index.js
git checkout 3ac4888 -- services/claude-service/src/index.js
systemctl restart ui-agent-tools ui-agent-claude
```
