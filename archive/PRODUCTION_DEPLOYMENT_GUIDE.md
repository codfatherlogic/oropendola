# Oropendola AI - Production Deployment Guide

**Date:** October 25, 2025
**Version:** 1.0
**Target Server:** https://oropendola.ai/
**Deployment Type:** Complete Backend Implementation

---

## 🎯 Overview

This guide will walk you through deploying ALL pending backend features to production:

- **Week 11 Phase 2**: Code Actions Extension (8 APIs)
- **Week 11 Phase 3**: Advanced Code Analysis (6 APIs)
- **Week 11 Phase 4**: Custom Code Actions (4 APIs + 2 DocTypes)
- **Week 9 Analytics**: Complete Analytics System (16 APIs + 6 DocTypes)
- **Week 12 Security**: Security & Compliance (34 APIs + 11 DocTypes)
- **Cron Jobs**: 5 Scheduled Background Tasks

**Total Deployment:**
- 68 New APIs
- 19 New Database Tables (DocTypes)
- 6,700+ Lines of Code
- 5 Cron Jobs

---

## 📋 Prerequisites

### Required Access
- [x] SSH access to `frappe@oropendola.ai`
- [x] Database access (MariaDB)
- [x] Bench admin privileges
- [x] Git repository access (if needed)

### Required Tools
- [x] bash terminal
- [x] SSH client
- [x] SCP/SFTP for file transfer

### Backup Requirements
- [x] Current database backup
- [x] Current code backup
- [x] Rollback plan ready

---

## 🚀 Quick Start (Automated Deployment)

### Option 1: Fully Automated (Recommended)

```bash
# Make the deployment script executable
chmod +x DEPLOY_TO_PRODUCTION.sh

# Run the deployment
bash DEPLOY_TO_PRODUCTION.sh
```

The script will:
1. ✅ Create automatic backups
2. ✅ Upload all backend files
3. ✅ Upload SQL schemas
4. ✅ Update hooks.py
5. ✅ Restart services
6. ⚠️ Prompt you to execute SQL schemas (manual step)
7. ⚠️ Prompt you to merge API endpoints (manual step)

**Total Time:** ~15-20 minutes

---

## 📖 Step-by-Step Manual Deployment

If you prefer manual control or if the automated script fails, follow these steps:

### Step 1: Pre-Deployment Backup (5 minutes)

```bash
# SSH into server
ssh frappe@oropendola.ai

# Create backup directory
cd /home/frappe/frappe-bench/apps/ai_assistant
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup existing files
cp ai_assistant/cron_jobs.py $BACKUP_DIR/ 2>/dev/null || true
cp ai_assistant/hooks.py $BACKUP_DIR/
cp ai_assistant/api/__init__.py $BACKUP_DIR/

# Backup database
cd /home/frappe/frappe-bench
bench --site oropendola.ai backup --with-files

# Note the backup location
echo "Backup created: $BACKUP_DIR"
```

### Step 2: Upload Backend Files (5 minutes)

```bash
# From your local machine
cd /Users/sammishthundiyil/oropendola/backend

# Upload Week 11 Phase 2
scp week_11_phase_2_code_actions_extension.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/

# Upload Week 11 Phase 3
scp week_11_phase_3_code_actions_extension.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/

# Upload Week 11 Phase 4
scp week_11_phase_4_custom_actions.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/

# Upload Week 9 Analytics
scp week_9_analytics_core.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/analytics_orm.py

# Upload Week 12 Security
scp week_12_security_core.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/security.py

# Upload Cron Jobs
scp cron_jobs_complete.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/cron_jobs.py

# Upload SQL schemas
ssh frappe@oropendola.ai "mkdir -p /home/frappe/frappe-bench/apps/ai_assistant/sql_schemas"

scp week_9_analytics_schema.sql \
    week_11_phase_4_custom_actions_schema.sql \
    week_12_security_schema.sql \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/sql_schemas/

# Upload helper scripts
scp execute_sql_schemas.sh \
    merge_api_endpoints.py \
    verify_deployment.py \
    frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/
```

### Step 3: Execute SQL Schemas (3 minutes)

```bash
# SSH into server
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant

# Make script executable
chmod +x execute_sql_schemas.sh

# Run the script
bash execute_sql_schemas.sh
```

**Or manually:**

```bash
cd /home/frappe/frappe-bench

# Week 9 Analytics (6 DocTypes)
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_9_analytics_schema.sql

# Week 11 Phase 4 (2 DocTypes)
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_11_phase_4_custom_actions_schema.sql

# Week 12 Security (11 DocTypes)
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_12_security_schema.sql

# Verify tables created
bench --site oropendola.ai mariadb -e "SHOW TABLES LIKE '%Analytics%';"
bench --site oropendola.ai mariadb -e "SHOW TABLES LIKE '%Security%';"
```

### Step 4: Merge API Endpoints (5 minutes)

**Option A: Automated (Recommended)**

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant

python3 merge_api_endpoints.py
```

**Option B: Manual**

Edit `/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py`

Add these imports at the top:

```python
# Week 11: Code Intelligence
from ai_assistant.core import week_11_phase_2_code_actions_extension as code_actions_p2
from ai_assistant.core import week_11_phase_3_code_actions_extension as code_actions_p3
from ai_assistant.core import week_11_phase_4_custom_actions as custom_actions

# Week 9: Analytics
from ai_assistant.core import analytics_orm as analytics

# Week 12: Security
from ai_assistant.core import security as security_core
```

Then copy all `@frappe.whitelist()` functions from:
- `backend/week_11_phase_2_api_endpoints.py`
- `backend/week_11_phase_3_api_endpoints.py`
- `backend/week_11_phase_4_api_endpoints.py`
- `backend/week_9_analytics_api_endpoints.py`
- `backend/week_12_security_api_endpoints.py`

### Step 5: Update hooks.py (2 minutes)

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant

# Edit hooks.py
nano hooks.py

# Add this at the end:
```

```python
# ============================================================================
# SCHEDULED JOBS (Cron Jobs)
# ============================================================================

scheduler_events = {
    "daily": [
        "ai_assistant.cron_jobs.aggregate_daily_metrics",
        "ai_assistant.cron_jobs.scan_secrets_daily",
    ],

    "weekly": [
        "ai_assistant.cron_jobs.generate_weekly_insights",
        "ai_assistant.cron_jobs.generate_compliance_reports",
    ],

    "monthly": [
        "ai_assistant.cron_jobs.rotate_keys_monthly",
    ]
}
```

Save with `Ctrl+X`, `Y`, `Enter`.

### Step 6: Restart Services (2 minutes)

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench

# Clear cache
bench --site oropendola.ai clear-cache

# Restart scheduler
bench --site oropendola.ai scheduler restart

# Restart all services
bench restart

# Wait for services to come back up
sleep 10

# Verify scheduler is running
bench --site oropendola.ai scheduler status
```

### Step 7: Verify Deployment (5 minutes)

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench

# Run verification script
bench --site oropendola.ai console

# In the Frappe console:
>>> exec(open('apps/ai_assistant/verify_deployment.py').read())
>>> run_all_tests()
```

Expected output:
```
================================================================================
VERIFICATION SUMMARY
================================================================================
✓ PASS: Module Imports
✓ PASS: Doctypes
✓ PASS: Api Endpoints
✓ PASS: Cron Jobs
✓ PASS: Functional

5/5 test suites passed (100.0%)

================================================================================
🎉 ALL TESTS PASSED - DEPLOYMENT SUCCESSFUL!
================================================================================
```

---

## ✅ Post-Deployment Checklist

### Immediate Verification

- [ ] All services restarted successfully
- [ ] No errors in Frappe logs
- [ ] Scheduler is enabled and running
- [ ] All DocTypes created (19 tables)
- [ ] All APIs accessible (113 endpoints)
- [ ] Verification tests passed

### Monitoring (First 24 Hours)

- [ ] Monitor error logs: `tail -f /home/frappe/frappe-bench/logs/frappe.log`
- [ ] Monitor scheduler logs: `tail -f /home/frappe/frappe-bench/logs/scheduler.log`
- [ ] Check for API errors
- [ ] Verify cron jobs execute (check scheduler log next day)
- [ ] Test frontend integration

### Performance Checks

- [ ] API response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Scheduler jobs complete in reasonable time

---

## 🔧 Troubleshooting

### Problem: Import Errors

**Symptoms:**
```
ModuleNotFoundError: No module named 'ai_assistant.core.analytics_orm'
```

**Solution:**
```bash
# Verify files were uploaded
ssh frappe@oropendola.ai
ls -lh /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/

# Check file permissions
chmod 644 /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/core/*.py

# Restart services
cd /home/frappe/frappe-bench
bench restart
```

### Problem: API Endpoints Not Found

**Symptoms:**
```
404 Not Found - /api/method/ai_assistant.api.analytics_track_event
```

**Solution:**
```bash
# Verify API endpoints were added to __init__.py
ssh frappe@oropendola.ai
grep -c '@frappe.whitelist' /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py

# Should return a number > 100

# If not, re-run the merge script
cd /home/frappe/frappe-bench/apps/ai_assistant
python3 merge_api_endpoints.py

# Restart
cd /home/frappe/frappe-bench
bench restart
```

### Problem: Database Tables Missing

**Symptoms:**
```
DoesNotExistError: DocType Analytics Event not found
```

**Solution:**
```bash
# Re-run SQL schemas
cd /home/frappe/frappe-bench
bash apps/ai_assistant/execute_sql_schemas.sh

# Or manually
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_9_analytics_schema.sql
```

### Problem: Scheduler Not Running

**Symptoms:**
```
Scheduler is disabled
```

**Solution:**
```bash
# Enable scheduler
bench --site oropendola.ai scheduler enable

# Restart scheduler
bench --site oropendola.ai scheduler restart

# Verify
bench --site oropendola.ai scheduler status
```

---

## 🔄 Rollback Procedure

If something goes wrong:

### Option 1: Automated Rollback

```bash
# From your local machine
chmod +x ROLLBACK.sh
bash ROLLBACK.sh
```

### Option 2: Manual Rollback

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant

# Find latest backup
BACKUP_DIR=$(ls -td backup_* | head -1)
echo "Restoring from: $BACKUP_DIR"

# Restore files
cp $BACKUP_DIR/cron_jobs.py ai_assistant/
cp $BACKUP_DIR/hooks.py ai_assistant/
cp $BACKUP_DIR/__init__.py ai_assistant/api/

# Restart services
cd /home/frappe/frappe-bench
bench --site oropendola.ai clear-cache
bench restart
bench --site oropendola.ai scheduler restart
```

### Option 3: Database Rollback

```bash
cd /home/frappe/frappe-bench

# List available backups
bench --site oropendola.ai list-backups

# Restore specific backup
bench --site oropendola.ai restore path/to/backup/file
```

---

## 📊 Deployment Summary

### What Gets Deployed

| Component | Count | Description |
|-----------|-------|-------------|
| Python Modules | 6 | Core backend implementations |
| API Endpoints | 68 | New REST API endpoints |
| Database Tables | 19 | New DocTypes (Frappe ORM) |
| Cron Jobs | 5 | Scheduled background tasks |
| Total Code | 6,700+ lines | Production-ready code |

### File Manifest

```
Uploaded to Server:
/home/frappe/frappe-bench/apps/ai_assistant/
├── ai_assistant/
│   ├── core/
│   │   ├── week_11_phase_2_code_actions_extension.py   (450 lines)
│   │   ├── week_11_phase_3_code_actions_extension.py   (650 lines)
│   │   ├── week_11_phase_4_custom_actions.py           (400 lines)
│   │   ├── analytics_orm.py                            (800 lines)
│   │   └── security.py                                 (900 lines)
│   ├── cron_jobs.py                                   (1,200 lines)
│   ├── hooks.py                                        (updated)
│   └── api/__init__.py                                 (updated)
├── sql_schemas/
│   ├── week_9_analytics_schema.sql                     (6 tables)
│   ├── week_11_phase_4_custom_actions_schema.sql       (2 tables)
│   └── week_12_security_schema.sql                     (11 tables)
└── verify_deployment.py                                (test script)
```

---

## 🎉 Success Criteria

Deployment is successful when:

- [x] All files uploaded without errors
- [x] All 19 database tables created
- [x] All 113 API endpoints accessible
- [x] All 5 cron jobs registered
- [x] Services restart cleanly
- [x] Verification tests pass 100%
- [x] No errors in logs
- [x] Frontend can connect to APIs

---

## 📞 Support

### Logs to Check

```bash
# Frappe application logs
tail -f /home/frappe/frappe-bench/logs/frappe.log

# Scheduler logs
tail -f /home/frappe/frappe-bench/logs/scheduler.log

# Web server logs
tail -f /home/frappe/frappe-bench/logs/web.log
```

### Useful Commands

```bash
# Check bench status
bench status

# List all sites
bench list-sites

# Check scheduler status
bench --site oropendola.ai scheduler status

# Clear cache
bench --site oropendola.ai clear-cache

# Rebuild if needed
bench build

# Migrate database
bench --site oropendola.ai migrate
```

---

## 📝 Deployment Log Template

Keep track of your deployment:

```
Deployment Date: _____________
Start Time: _____________
End Time: _____________
Deployed By: _____________

Steps Completed:
[ ] 1. Pre-deployment backup
[ ] 2. Files uploaded
[ ] 3. SQL schemas executed
[ ] 4. API endpoints merged
[ ] 5. hooks.py updated
[ ] 6. Services restarted
[ ] 7. Verification tests passed

Issues Encountered:
_________________________________
_________________________________

Resolution:
_________________________________
_________________________________

Final Status: [ ] SUCCESS  [ ] PARTIAL  [ ] FAILED
```

---

## 🚀 You're Ready!

Everything is prepared for deployment. Choose your method:

1. **Automated:** Run `bash DEPLOY_TO_PRODUCTION.sh`
2. **Manual:** Follow Step-by-Step guide above

**Estimated Time:** 20-30 minutes
**Risk Level:** Low (backups created automatically)
**Rollback Time:** <5 minutes if needed

Good luck with your deployment! 🎉

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Status:** Ready for Production Deployment
