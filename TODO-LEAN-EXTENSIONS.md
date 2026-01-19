# 5S-MCP: Lean Methodology Extensions Roadmap

## Current State (v1.0)
5 core tools implemented:
- `sort` - Seiri (整理) - Identify unnecessary items
- `set_in_order` - Seiton (整頓) - Organize and arrange
- `shine` - Seiso (清掃) - Clean and maintain
- `standardize` - Seiketsu (清潔) - Create standards
- `sustain` - Shitsuke (躾) - Maintain discipline

## Planned Extensions

### Phase 1: Kaizen (改善) - Continuous Improvement
- [ ] `kaizen_suggest` - Analyze code/system and suggest incremental improvements
- [ ] `kaizen_track` - Track improvement initiatives over time
- [ ] `kaizen_report` - Generate improvement metrics and progress reports

### Phase 2: Gemba (現場) - Go to the Source
- [ ] `gemba_walk` - Deep inspection of actual system state (logs, metrics, errors)
- [ ] `gemba_observe` - Watch system behavior in real-time
- [ ] `gemba_interview` - Gather context from config, comments, documentation

### Phase 3: Poka-Yoke (ポカヨケ) - Error Prevention
- [ ] `poka_yoke_scan` - Identify potential error points in code/config
- [ ] `poka_yoke_suggest` - Recommend error-prevention mechanisms
- [ ] `poka_yoke_validate` - Verify error-prevention measures are in place

### Phase 4: Additional Lean Tools
- [ ] `muda_detect` - Detect waste (7 wastes: defects, overproduction, waiting, etc.)
- [ ] `jidoka_check` - Automation with human touch (quality at source)
- [ ] `andon_status` - Visual status board for system health

## Integration Notes

All new tools automatically appear in `skill_5s` meta-tool after adding to 5s-mcp.

Usage example (future):
```
skill_5s action=kaizen_suggest target=/root/ui-agent/services
skill_5s action=gemba_walk service=ui-agent-claude
skill_5s action=poka_yoke_scan path=/root/ui-agent/packages
```

## Architecture

```
5s-mcp (MCP Server)
    ↓
FiveSSkill (proxy in ui-agent)
    ↓
skill_5s (meta-tool in skills-meta-router.js)
    ↓
Claude API
```

---
Created: 2026-01-20
Last Updated: 2026-01-20
