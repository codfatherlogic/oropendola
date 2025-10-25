# Complete Backend Deployment Guide
## All Pending Features - Weeks 9, 11, 12

**Created:** 2025-10-25
**Server:** https://oropendola.ai/
**Total New Features:** 68 APIs, 19 DocTypes

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Summary](#deployment-summary)
4. [Week 11 Phase 2: Advanced Code Actions](#week-11-phase-2)
5. [Week 11 Phase 3: Performance & Quality](#week-11-phase-3)
6. [Week 11 Phase 4: Custom Actions](#week-11-phase-4)
7. [Week 9: Analytics & Insights](#week-9-analytics)
8. [Week 12: Security & Compliance](#week-12-security)
9. [Verification](#verification)
10. [Rollback Procedures](#rollback-procedures)

---

## 1. Overview

This guide covers the deployment of ALL pending backend features:

### What's Being Deployed

| Feature | APIs | DocTypes | Status |
|---------|------|----------|--------|
| Week 11 Phase 2 | 8 | 0 | ✅ Code ready |
| Week 11 Phase 3 | 6 | 0 | ✅ Code ready |
| Week 11 Phase 4 | 4 | 2 | ✅ Code + schema ready |
| Week 9 Analytics | 16 | 6 | ✅ Full implementation |
| Week 12 Security | 34 | 11 | ✅ Full implementation |
| **TOTAL** | **68** | **19** | **All ready to deploy** |

### Current vs. Post-Deployment

- **Current:** 50 APIs, 13 DocTypes
- **After Deployment:** 118 APIs, 32 DocTypes
- **Increase:** +136% APIs, +146% DocTypes

---

## 2. Prerequisites

### Required Access
```bash
# SSH access to server
ssh frappe@oropendola.ai

# Verify Frappe bench location
cd ~/frappe-bench
bench --version
```

### Backup First!
```bash
# CRITICAL: Always backup before deployment

# 1. Backup database
cd ~/frappe-bench
bench backup --with-files

# 2. Verify backup created
ls -lh sites/*/private/backups/

# 3. Note the backup filename for rollback if needed
```

### File Locations

All implementation files are in `/Users/sammishthundiyil/oropendola/backend/`:

```
backend/
├── week_11_phase_2_code_actions_extension.py (450 lines)
├── week_11_phase_2_api_endpoints.py (200 lines)
├── week_11_phase_3_code_actions_extension.py (650 lines)
├── week_11_phase_3_api_endpoints.py (150 lines)
├── week_11_phase_4_custom_actions_schema.sql (50 lines)
├── week_11_phase_4_custom_actions.py (400 lines)
├── week_11_phase_4_api_endpoints.py (120 lines)
├── week_9_analytics_schema.sql (250 lines)
├── week_9_analytics_core.py (800 lines)
├── week_9_analytics_api_endpoints.py (250 lines)
├── week_12_security_schema.sql (350 lines) [ALREADY ON SERVER]
├── week_12_security_core.py (900 lines)
└── week_12_security_api_endpoints.py (450 lines)
```

---

## 3. Deployment Summary

### Recommended Deployment Order

1. **Week 11 Phase 2** (8 APIs) - 15 min
2. **Week 11 Phase 3** (6 APIs) - 10 min
3. **Week 11 Phase 4** (4 APIs + 2 DocTypes) - 20 min
4. **Week 9 Analytics** (16 APIs + 6 DocTypes) - 30 min
5. **Week 12 Security** (34 APIs + 11 DocTypes) - 35 min

**Total Time:** ~110 minutes (2 hours)

### Can Be Deployed Independently

- Each week's features can be deployed separately
- Week 11 Phases must be in order (Phase 2 → 3 → 4)
- Week 9 and Week 12 are independent

---

## 4. Week 11 Phase 2: Advanced Code Actions

### What's Included

8 new APIs for refactoring, auto-fix, and code review:
- `code_apply_refactor` - Apply refactoring suggestion
- `code_auto_fix` - Auto-fix code issues
- `code_fix_batch` - Fix multiple issues at once
- `code_extract_function` - Extract code into function
- `code_extract_variable` - Extract expression into variable
- `code_rename_symbol` - Rename symbol safely
- `code_review` - Comprehensive AI code review
- `code_review_pr` - Pull request review

### Deployment Steps

```bash
# 1. SSH to server
ssh frappe@oropendola.ai

# 2. Navigate to app directory
cd ~/frappe-bench/apps/ai_assistant

# 3. Backup current files
cp ai_assistant/core/code_actions.py ai_assistant/core/code_actions.py.bak
cp ai_assistant/api/__init__.py ai_assistant/api/__init__.py.bak

# 4. Copy files from local machine (from another terminal)
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_2_code_actions_extension.py frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_2_api_endpoints.py frappe@oropendola.ai:~/

# 5. Back on server - append Phase 2 functions to code_actions.py
cat ~/week_11_phase_2_code_actions_extension.py >> ai_assistant/core/code_actions.py

# 6. Append Phase 2 API endpoints to api/__init__.py
cat ~/week_11_phase_2_api_endpoints.py >> ai_assistant/api/__init__.py

# 7. Restart bench
cd ~/frappe-bench
bench restart

# 8. Test one endpoint
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.code_review \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{"code": "def test(): pass", "language": "python"}'

# 9. Verify success (should return review data)
```

### Verification

```bash
# Check logs for errors
tail -f ~/frappe-bench/logs/bench-start.log

# Should see no errors related to code_actions
```

---

## 5. Week 11 Phase 3: Performance & Quality

### What's Included

6 new APIs for advanced code analysis:
- `code_check_performance` - Detailed performance analysis
- `code_check_complexity` - Cyclomatic complexity analysis
- `code_check_style` - Style guide compliance
- `code_check_vulnerabilities` - Comprehensive vulnerability scan
- `code_suggest_improvements` - AI improvement suggestions
- `code_compare_quality` - Compare code quality over time

### Deployment Steps

```bash
# 1. Copy files from local machine
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_3_code_actions_extension.py frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_3_api_endpoints.py frappe@oropendola.ai:~/

# 2. On server - append Phase 3 functions
cd ~/frappe-bench/apps/ai_assistant
cat ~/week_11_phase_3_code_actions_extension.py >> ai_assistant/core/code_actions.py

# 3. Append Phase 3 API endpoints
cat ~/week_11_phase_3_api_endpoints.py >> ai_assistant/api/__init__.py

# 4. Restart bench
cd ~/frappe-bench
bench restart

# 5. Test endpoint
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.code_check_performance \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{"code": "for i in range(100):\n    for j in range(100):\n        pass", "language": "python"}'
```

---

## 6. Week 11 Phase 4: Custom Actions

### What's Included

- 2 new DocTypes (database tables)
- 4 new APIs for custom code actions

### Deployment Steps

```bash
# 1. Copy files from local machine
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_4_custom_actions_schema.sql frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_4_custom_actions.py frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_11_phase_4_api_endpoints.py frappe@oropendola.ai:~/

# 2. On server - run SQL migration
cd ~/frappe-bench
mysql -u root -p YOUR_SITE_DB < ~/week_11_phase_4_custom_actions_schema.sql

# 3. Verify tables created
mysql -u root -p YOUR_SITE_DB -e "SHOW TABLES LIKE 'oropendola_custom%';"

# Expected output:
# +-------------------------------------------+
# | Tables_in_db (oropendola_custom%)         |
# +-------------------------------------------+
# | oropendola_custom_code_action             |
# | oropendola_custom_action_execution        |
# +-------------------------------------------+

# 4. Append Phase 4 functions to code_actions.py
cd ~/frappe-bench/apps/ai_assistant
cat ~/week_11_phase_4_custom_actions.py >> ai_assistant/core/code_actions.py

# 5. Append Phase 4 API endpoints
cat ~/week_11_phase_4_api_endpoints.py >> ai_assistant/api/__init__.py

# 6. Restart bench
cd ~/frappe-bench
bench restart

# 7. Test create custom action
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.code_create_custom_action \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{
    "action_name": "Test Action",
    "description": "Test custom action",
    "action_type": "analysis",
    "prompt_template": "Analyze this code: {{code}}",
    "language": "python",
    "output_format": "json"
  }'
```

---

## 7. Week 9: Analytics & Insights

### What's Included

- 6 new DocTypes (database tables)
- 16 new APIs for analytics and reporting

### Deployment Steps

```bash
# 1. Copy files from local machine
scp /Users/sammishthundiyil/oropendola/backend/week_9_analytics_schema.sql frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_9_analytics_core.py frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_9_analytics_api_endpoints.py frappe@oropendola.ai:~/

# 2. On server - run SQL migration for 6 tables
cd ~/frappe-bench
mysql -u root -p YOUR_SITE_DB < ~/week_9_analytics_schema.sql

# 3. Verify all 6 tables created
mysql -u root -p YOUR_SITE_DB -e "SHOW TABLES LIKE 'oropendola_analytics%';"

# Expected output:
# +------------------------------------------------+
# | Tables_in_db (oropendola_analytics%)           |
# +------------------------------------------------+
# | oropendola_analytics_event                     |
# | oropendola_analytics_insight                   |
# | oropendola_analytics_report                    |
# | oropendola_dashboard_widget                    |
# | oropendola_performance_metric                  |
# | oropendola_usage_metric                        |
# +------------------------------------------------+

# 4. Create analytics.py module
cd ~/frappe-bench/apps/ai_assistant
cp ~/week_9_analytics_core.py ai_assistant/core/analytics.py

# 5. Append analytics API endpoints
cat ~/week_9_analytics_api_endpoints.py >> ai_assistant/api/__init__.py

# 6. Restart bench
cd ~/frappe-bench
bench restart

# 7. Test tracking an event
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.analytics_track_event \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{
    "event_type": "test",
    "event_action": "deployment_test",
    "event_category": "testing"
  }'

# 8. Verify event recorded
mysql -u root -p YOUR_SITE_DB -e "SELECT COUNT(*) FROM oropendola_analytics_event;"
```

---

## 8. Week 12: Security & Compliance

### What's Included

- 11 new DocTypes (8 from schema + 3 more)
- 34 new APIs for security, compliance, and incident management

### Deployment Steps

```bash
# 1. Copy files from local machine
# Note: week_12_security_schema.sql is ALREADY on server from previous session
scp /Users/sammishthundiyil/oropendola/backend/week_12_security_core.py frappe@oropendola.ai:~/
scp /Users/sammishthundiyil/oropendola/backend/week_12_security_api_endpoints.py frappe@oropendola.ai:~/

# 2. On server - check if schema was already deployed
cd ~/frappe-bench
mysql -u root -p YOUR_SITE_DB -e "SHOW TABLES LIKE 'oropendola_%audit%';"

# If NOT deployed yet, run the schema (it's in backend/ folder from previous work)
# If schema file not on server, copy it first:
scp /Users/sammishthundiyil/oropendola/backend/week_12_security_schema.sql frappe@oropendola.ai:~/
mysql -u root -p YOUR_SITE_DB < ~/week_12_security_schema.sql

# 3. Verify all 8 security tables created
mysql -u root -p YOUR_SITE_DB -e "SHOW TABLES LIKE 'oropendola_%';" | grep -E "(audit|security|access|compliance|encryption|secret|license|incident)"

# Expected tables:
# oropendola_audit_log
# oropendola_security_policy
# oropendola_access_control
# oropendola_compliance_report
# oropendola_encryption_key
# oropendola_secret_detection
# oropendola_license_compliance
# oropendola_security_incident

# 4. Create security.py module
cd ~/frappe-bench/apps/ai_assistant
cp ~/week_12_security_core.py ai_assistant/core/security.py

# 5. Append security API endpoints
cat ~/week_12_security_api_endpoints.py >> ai_assistant/api/__init__.py

# 6. Restart bench
cd ~/frappe-bench
bench restart

# 7. Test audit logging
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.security_log_audit_event \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{
    "event_type": "create",
    "event_category": "test",
    "action": "deployment_test",
    "status": "success",
    "risk_level": "low"
  }'

# 8. Verify audit log created
mysql -u root -p YOUR_SITE_DB -e "SELECT COUNT(*) FROM oropendola_audit_log;"

# 9. Test policy creation
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.security_create_policy \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -d '{
    "name": "Test Policy",
    "description": "Testing policy creation",
    "policy_type": "authentication",
    "policy_config": "{\"test\": true}",
    "scope": "global",
    "enforcement_mode": "audit"
  }'

# 10. Verify policy created
mysql -u root -p YOUR_SITE_DB -e "SELECT COUNT(*) FROM oropendola_security_policy;"
```

---

## 9. Verification

### Complete System Verification

```bash
# 1. Count all API endpoints
cd ~/frappe-bench/apps/ai_assistant
grep -c "@frappe.whitelist()" ai_assistant/api/__init__.py

# Expected: Should be around 118 (50 original + 68 new)

# 2. Verify all database tables
mysql -u root -p YOUR_SITE_DB -e "SHOW TABLES LIKE 'oropendola_%';" | wc -l

# Expected: 32 tables total

# 3. Test each feature category

# Week 11 - Code Actions
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.code_analyze \
  -H "Authorization: token KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "def test(): pass", "language": "python"}'

# Week 9 - Analytics
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.analytics_track_event \
  -H "Authorization: token KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "test", "event_action": "verify"}'

# Week 12 - Security
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.security_get_audit_logs \
  -H "Authorization: token KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# 4. Check for errors in logs
tail -100 ~/frappe-bench/logs/bench-start.log | grep -i error

# Should see no critical errors related to new features
```

### Feature-by-Feature Testing

```bash
# Create test script on server
cat > ~/test_all_features.sh << 'EOF'
#!/bin/bash

API_KEY="YOUR_API_KEY"
API_SECRET="YOUR_API_SECRET"
BASE_URL="https://oropendola.ai"

echo "Testing Week 11 Phase 2..."
curl -X POST $BASE_URL/api/method/ai_assistant.api.code_review \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "def test(): pass", "language": "python"}' \
  | jq '.message.success'

echo "Testing Week 11 Phase 3..."
curl -X POST $BASE_URL/api/method/ai_assistant.api.code_check_performance \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "def test(): pass", "language": "python"}' \
  | jq '.message.success'

echo "Testing Week 11 Phase 4..."
curl -X POST $BASE_URL/api/method/ai_assistant.api.code_list_custom_actions \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq '.message.success'

echo "Testing Week 9 Analytics..."
curl -X POST $BASE_URL/api/method/ai_assistant.api.analytics_get_events \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  | jq '.message.success'

echo "Testing Week 12 Security..."
curl -X POST $BASE_URL/api/method/ai_assistant.api.security_get_audit_logs \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  | jq '.message.success'

echo "All tests complete!"
EOF

chmod +x ~/test_all_features.sh
./test_all_features.sh
```

---

## 10. Rollback Procedures

### If Something Goes Wrong

```bash
# 1. Stop bench
cd ~/frappe-bench
bench stop

# 2. Restore backup files
cd ~/frappe-bench/apps/ai_assistant

# Restore code_actions.py
mv ai_assistant/core/code_actions.py.bak ai_assistant/core/code_actions.py

# Restore api/__init__.py
mv ai_assistant/api/__init__.py.bak ai_assistant/api/__init__.py

# Remove analytics.py if it was created
rm -f ai_assistant/core/analytics.py

# Remove security.py if it was created
rm -f ai_assistant/core/security.py

# 3. Restore database from backup
cd ~/frappe-bench
bench --site YOUR_SITE restore ~/path/to/backup/BACKUP_FILE.sql.gz

# 4. Restart bench
bench start

# 5. Verify original functionality
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.code_analyze \
  -H "Authorization: token KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code": "def test(): pass", "language": "python"}'
```

### Rollback Individual Features

**Week 11 Only:**
```bash
# Restore code_actions.py to before Week 11 changes
# Use the .bak file created before deployment
```

**Week 9 Only:**
```bash
# Drop analytics tables
mysql -u root -p YOUR_SITE_DB -e "
DROP TABLE IF EXISTS oropendola_analytics_event;
DROP TABLE IF EXISTS oropendola_usage_metric;
DROP TABLE IF EXISTS oropendola_performance_metric;
DROP TABLE IF EXISTS oropendola_analytics_report;
DROP TABLE IF EXISTS oropendola_dashboard_widget;
DROP TABLE IF EXISTS oropendola_analytics_insight;
"

# Remove analytics.py
rm ai_assistant/core/analytics.py

# Remove analytics endpoints from api/__init__.py
# (manually edit or restore from backup)
```

**Week 12 Only:**
```bash
# Drop security tables
mysql -u root -p YOUR_SITE_DB -e "
DROP TABLE IF EXISTS oropendola_audit_log;
DROP TABLE IF EXISTS oropendola_security_policy;
DROP TABLE IF EXISTS oropendola_access_control;
DROP TABLE IF EXISTS oropendola_compliance_report;
DROP TABLE IF EXISTS oropendola_encryption_key;
DROP TABLE IF EXISTS oropendola_secret_detection;
DROP TABLE IF EXISTS oropendola_license_compliance;
DROP TABLE IF EXISTS oropendola_security_incident;
"

# Remove security.py
rm ai_assistant/core/security.py

# Remove security endpoints from api/__init__.py
```

---

## 11. Post-Deployment Tasks

### Update Documentation

1. Update API documentation with new endpoints
2. Update [BACKEND_PENDING_COMPREHENSIVE.md](archive/BACKEND_PENDING_COMPREHENSIVE.md) to reflect deployed status
3. Create announcement for users about new features

### Monitoring

```bash
# Watch logs for first 24 hours
tail -f ~/frappe-bench/logs/bench-start.log

# Monitor database size
mysql -u root -p -e "
SELECT
    table_schema AS 'Database',
    SUM(data_length + index_length) / 1024 / 1024 AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'YOUR_SITE_DB'
GROUP BY table_schema;
"

# Monitor API usage
mysql -u root -p YOUR_SITE_DB -e "
SELECT event_action, COUNT(*) as count
FROM oropendola_analytics_event
GROUP BY event_action
ORDER BY count DESC
LIMIT 20;
"
```

### Performance Tuning

```bash
# Add indexes if queries are slow
mysql -u root -p YOUR_SITE_DB -e "
CREATE INDEX idx_event_timestamp ON oropendola_analytics_event(timestamp);
CREATE INDEX idx_audit_timestamp ON oropendola_audit_log(timestamp);
CREATE INDEX idx_audit_user ON oropendola_audit_log(user);
"
```

---

## 12. Summary

### Deployment Checklist

- [ ] Backup database and files
- [ ] Deploy Week 11 Phase 2 (8 APIs)
- [ ] Deploy Week 11 Phase 3 (6 APIs)
- [ ] Deploy Week 11 Phase 4 (4 APIs + 2 DocTypes)
- [ ] Deploy Week 9 Analytics (16 APIs + 6 DocTypes)
- [ ] Deploy Week 12 Security (34 APIs + 11 DocTypes)
- [ ] Run all verification tests
- [ ] Monitor logs for errors
- [ ] Update documentation
- [ ] Announce new features to users

### Final Status

After complete deployment:

- **Total APIs:** 118 (from 50)
- **Total DocTypes:** 32 (from 13)
- **New Capabilities:**
  - Advanced code analysis (performance, complexity, style)
  - Custom user-defined code actions
  - Comprehensive analytics and reporting
  - Enterprise security and compliance
  - Audit logging and incident management

### Support

For issues during deployment:
- Check logs: `tail -f ~/frappe-bench/logs/bench-start.log`
- Verify tables: `SHOW TABLES LIKE 'oropendola_%';`
- Test individual endpoints with curl
- Rollback if necessary using procedures in Section 10

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2025-10-25
**Status:** Ready for Production Deployment
