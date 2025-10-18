# 🔐 Subscription Validation - Quick Reference

## What Happens After Login

### ✅ Active Subscription
```
Login → Subscription Check → ✅ Active → Chat Interface
```

### ❌ Expired Subscription
```
Login → Subscription Check → ❌ Expired → Blocked Screen

┌────────────────────────────┐
│          ⚠️                │
│                            │
│  Your 1 DAY TRIAL has      │
│  expired. Renew to         │
│  continue.                 │
│                            │
│  [Renew Now]               │
│  [Sign Out]                │
│                            │
│  Plan: TRIAL               │
│  Expired: Jan 1, 2025      │
└────────────────────────────┘
```

## Dynamic Messages

| Subscription Type | Message |
|------------------|---------|
| 1 Day Trial | "Your 1 DAY TRIAL has expired. Renew to continue." |
| 7 Day Trial | "Your 7 DAY TRIAL has expired. Renew to continue." |
| Monthly Plan | "Your MONTHLY subscription has expired. Renew to continue." |
| Yearly Plan | "Your YEARLY subscription has expired. Renew to continue." |

## User Actions

### Renew Now
- Opens browser to renewal page
- URL: `https://oropendola.ai/subscription/renew`
- Complete payment
- Return and login again

### Sign Out
- Clears credentials
- Returns to login screen
- Can try different account

## API Endpoint

```
GET /api/method/oropendola.api.subscription.get_status
Authorization: token {api_key}
```

## Response Format

```json
{
    "message": {
        "active": false,
        "plan": "trial",
        "expiry_date": "2025-01-01",
        "trial_expired": true,
        "trial_duration": "1 DAY"
    }
}
```

## Install

```bash
code --install-extension oropendola-ai-assistant-2.0.0.vsix
```

**Now blocks expired subscriptions with smart messages!** ✅
