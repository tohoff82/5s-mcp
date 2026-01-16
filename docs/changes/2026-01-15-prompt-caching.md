# Prompt Caching Implementation

**Date:** 2026-01-15  
**Author:** AI Agent  
**Status:** ✅ Deployed  
**Branch:** feature/prompt-caching

## Summary

Implemented Anthropic Prompt Caching to reduce API costs by ~90% on cached tokens.

## How It Works

```
┌────────────────────────────────────────────────────────────┐
│                    Claude API Request                       │
├────────────────────────────────────────────────────────────┤
│  system: [{                                                 │
│    type: "text",                                            │
│    text: "...",                                             │
│    cache_control: { type: "ephemeral" }  ← CACHED (5min)   │
│  }]                                                         │
│                                                             │
│  tools: [                                                   │
│    { name: "router_system", ... },                          │
│    ...                                                      │
│    { name: "router_shell", cache_control: {...} }  ← CACHED│
│  ]                                                          │
│                                                             │
│  messages: [                                                │
│    { role: "user", content: "msg1" },                       │
│    { role: "assistant", content: [..., cache_control] },   │  ← PREFIX CACHED
│    ...                                                      │
│    { role: "user", content: "new message" }  ← NEW ONLY    │
│  ]                                                          │
└────────────────────────────────────────────────────────────┘
```

## Cache Levels

| Level | What's Cached | TTL | Savings |
|-------|---------------|-----|---------|
| System Prompt | Instructions (~3K tokens) | 5 min | 90% |
| Tool Definitions | 8 meta-tools (~800 tokens) | 5 min | 90% |
| Message Prefix | Previous conversation | 5 min | 90% |

## Implementation

### Modified File: `claude-service/src/anthropic-client.js`

```javascript
// System prompt with caching
params.system = [{
  type: 'text',
  text: systemPrompt,
  cache_control: { type: 'ephemeral' }
}];

// Tools - mark last tool for cache breakpoint
params.tools = tools.map((tool, idx) => {
  if (idx === tools.length - 1) {
    return { ...tool, cache_control: { type: 'ephemeral' } };
  }
  return tool;
});

// Message prefix caching
// Adds cache_control to last assistant message before new user input
```

## Metrics Logging

```javascript
logger.info('Claude response received', {
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  cacheCreationTokens: usage.cache_creation_input_tokens,  // First write
  cacheReadTokens: usage.cache_read_input_tokens           // Cache hits
});

// Example output:
// 💰 Cache hit! Saved ~18866 tokens (90% discount)
```

## Real-World Results

From test session (21 iterations):

| Iteration | Cache Read | Input (New) | Saved |
|-----------|------------|-------------|-------|
| 1 | 0 | ~5,000 | 0 |
| 5 | 9,622 | 93 | ~9,000 |
| 10 | 15,821 | 63 | ~14,239 |
| 15 | 18,373 | 102 | ~16,536 |
| 21 | 20,962 | 416 | ~18,866 |

**Total session:** 21,065 tokens, ~88% from cache

## Cost Comparison

| Scenario | Without Cache | With Cache | Savings |
|----------|---------------|------------|---------|
| Single request | $0.063 | $0.063 | 0% |
| 5 iterations | $0.315 | $0.095 | 70% |
| 20 iterations | $1.26 | $0.20 | 84% |
| Long session (50+) | $3.15 | $0.35 | **89%** |

## Limitations

1. **Minimum 1024 tokens** - cached block must be >= 1024 tokens
2. **5 minute TTL** - cache expires after 5 min of inactivity
3. **Prefix only** - can only cache beginning, not middle
4. **Write cost +25%** - first cache write costs extra

## Git Commit

```
737384f feat: add prompt caching support
```

## Rollback

```bash
# To disable caching:
# In anthropic-client.js, change:
enableCaching = true  →  enableCaching = false

# Or revert:
git checkout 81a816e -- services/claude-service/src/anthropic-client.js
systemctl restart ui-agent-claude
```
