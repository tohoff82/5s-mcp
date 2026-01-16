# Budget Monitoring System

**Date:** 2026-01-15  
**Author:** AI Agent  
**Status:** ✅ Deployed  
**Branch:** feature/prompt-caching

## Summary

Full-featured budget monitoring system with session cost tracking, monthly limits, real-time alerts, and Telegram UI for settings management.

## Features

### 1. Session Budget Limits
- Per-session spending cap (default: $5.00)
- Real-time cost tracking during agentic loops
- Alert on exceeded budget
- Optional auto-stop when budget exceeded

### 2. Monthly Budget Limits  
- Monthly spending cap (default: $50.00)
- Aggregate costs across all sessions
- Separate alert type for monthly exceeded
- Progress bar visualization

### 3. Alert Deduplication
- Single alert per session (no spam)
- Single monthly alert per calendar month
- Tracks `alreadySent` flag in responses

### 4. Real-time Cost Tracking
- Budget checked after **each iteration** (not just end of session)
- Immediate alert when threshold crossed
- `shouldStop` option to halt session

### 5. Telegram `/budget` Command
- Interactive inline keyboard UI
- Adjust session budget (+/- $0.5, $1)
- Adjust monthly budget (+/- $5, $10)
- Toggle alerts on/off
- Toggle auto-stop on/off
- Stats by period (Today/Week/Month)
- Progress bar for monthly spending

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB Collections                          │
├─────────────────────────────────────────────────────────────────┤
│  user_settings:                                                  │
│    { userId, budgetPerSession, budgetPerMonth,                  │
│      alertsEnabled, stopOnBudgetExceeded }                      │
│                                                                  │
│  session_metrics:                                                │
│    { sessionId, userId, tokens, cost, cacheHitRate, ... }       │
│                                                                  │
│  budget_alerts:                                                  │
│    { sessionId, userId, alertType, budget, actual, month }      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RabbitMQ Events                              │
├─────────────────────────────────────────────────────────────────┤
│  budget.alerts:                                                  │
│    - type: 'budget_exceeded'        (session limit)             │
│    - type: 'monthly_budget_exceeded' (monthly limit)            │
│                                                                  │
│  session.stopped:                                                │
│    - type: 'budget_limit'           (auto-stop event)           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User message
    │
    ▼
┌────────────────┐
│ Claude Service │──► Process iteration
└────────────────┘
    │
    ├──► Calculate cost after each tool execution
    │
    ▼
┌─────────────────────────────────────┐
│ budgetService.checkAndAlert()       │
│   - Get user settings               │
│   - Check if cost >= budgetPerSession│
│   - Dedup: existing alert?          │
│   - Create alert if new             │
└─────────────────────────────────────┘
    │
    ├──[exceeded && !alreadySent]──► publish('budget.alerts')
    │
    ├──[shouldStop]──► publish('session.stopped')
    │                   throw Error
    │
    ▼
Continue or end session
    │
    ▼
┌─────────────────────────────────────┐
│ budgetService.checkMonthlyBudget()  │
│   - Aggregate month's spending      │
│   - Check if >= budgetPerMonth      │
│   - Dedup by month                  │
└─────────────────────────────────────┘
    │
    └──[exceeded && !alreadySent]──► publish('budget.alerts', type: 'monthly')
```

## Telegram UI

```
💰 Budget Dashboard

⚙️ Limits:
├─ Per session: $5.00
├─ Per month: $50.00
├─ Alerts: 🔔 On
└─ Auto-stop: ▶️ Off

📅 This Month (2026-01):
🟢 ░░░░░░░░░░ 12%
$6.00 / $50.00
Sessions: 3

📊 Stats (Week):
├─ Sessions: 15
├─ Tokens: 125.4K
├─ Cached: 98.2K (78.3%)
├─ Cost: $4.25
├─ Saved: $12.80
└─ Exceeded: 1x

⚠️ Recent Alerts:
⚡ 15.01: $5.23/$5.00
```

### Inline Keyboard

```
[      📍 Session Budget      ]
[-$1] [-$0.5] [$5.00] [+$0.5] [+$1]

[      🗓️ Monthly Budget      ]
[-$10] [-$5] [$50.00] [+$5] [+$10]

[🔕 Alerts Off] [🛑 Auto-stop On]

[Today] [✓ Week] [Month]

[       🔄 Refresh       ]
```

## Files Modified

### New Files
- `shared/src/budget-service.js` - Core budget logic
- `telegram-gateway/src/commands/budget-commands.js` - /budget UI
- `telegram-gateway/src/consumers/budget-alert-consumer.js` - Alert handler

### Modified Files
- `shared/index.js` - Export budgetService
- `claude-service/src/index.js` - Real-time checks, metrics saving
- `telegram-gateway/src/index.js` - MongoDB connection, budget handlers

## Event Payloads

### budget.alerts (session)
```javascript
{
  type: 'budget_exceeded',
  sessionId: 'uuid',
  userId: 123456,
  chatId: 123456,
  alert: {
    budget: 5.00,
    actual: 5.23,
    overagePercent: 4.6,
    alertType: 'session',
    snapshot: { iterations, tokens, tools, duration }
  }
}
```

### budget.alerts (monthly)
```javascript
{
  type: 'monthly_budget_exceeded',
  sessionId: 'uuid',
  userId: 123456,
  chatId: 123456,
  alert: {
    budget: 50.00,
    actual: 52.10,
    overagePercent: 4.2,
    alertType: 'monthly',
    month: '2026-01',
    snapshot: { sessionsThisMonth: 12 }
  }
}
```

### session.stopped
```javascript
{
  type: 'budget_limit',
  sessionId: 'uuid',
  userId: 123456,
  chatId: 123456,
  cost: 5.23,
  budget: 5.00,
  iteration: 8,
  stoppedAt: '2026-01-15T20:56:31.123Z'
}
```

## MongoDB Indexes

```javascript
// user_settings
{ userId: 1 } - unique

// session_metrics
{ sessionId: 1 } - unique
{ userId: 1, startedAt: -1 }
{ startedAt: -1 }

// budget_alerts
{ sessionId: 1 }
{ userId: 1, triggeredAt: -1 }
{ alertType: 1, userId: 1, triggeredAt: -1 }
```

## Default Settings

```javascript
{
  budgetPerSession: 5.00,   // USD
  budgetPerMonth: 50.00,    // USD
  alertsEnabled: true,
  stopOnBudgetExceeded: false
}
```

## Git Commits

```
a4c0e97 feat: publish session.stopped event on auto-stop
92436a5 feat: budget monitoring improvements
df83d3d feat: budget monitoring with session cost tracking
```

## Rollback

```bash
# Disable budget checks:
# In claude-service/src/index.js, comment out:
# - Real-time budget check block (lines 454-489)
# - End-of-session budget checks (lines 554-595)

# Or revert to pre-budget state:
git checkout 737384f -- services/claude-service/src/index.js
git checkout 737384f -- services/telegram-gateway/src/index.js
systemctl restart ui-agent-claude ui-agent-telegram
```

## Future Enhancements

1. **Budget notifications via email/webhook**
2. **Team/organization budgets**
3. **Budget history charts in webapp**
4. **Predictive alerts** (approaching limit)
5. **Cost optimization suggestions**
