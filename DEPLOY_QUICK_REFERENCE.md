# 🚀 DEPLOYMENT QUICK REFERENCE

**Keep this open during deployment!**

---

## One-Command Deployment

```bash
cd /Users/sammishthundiyil/oropendola
bash DEPLOY_TO_PRODUCTION.sh
```

---

## If Deployment Script Pauses

### 1. Execute SQL Schemas

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant
bash execute_sql_schemas.sh
```

### 2. Merge API Endpoints

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench/apps/ai_assistant
python3 merge_api_endpoints.py
```

---

## Verify Deployment

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench
bench --site oropendola.ai console

>>> exec(open('apps/ai_assistant/verify_deployment.py').read())
>>> run_all_tests()
```

**Expected:** All tests PASS ✅

---

## Monitor Logs

```bash
ssh frappe@oropendola.ai

# Application logs
tail -f /home/frappe/frappe-bench/logs/frappe.log

# Scheduler logs
tail -f /home/frappe/frappe-bench/logs/scheduler.log
```

---

## If Something Goes Wrong

### Rollback

```bash
cd /Users/sammishthundiyil/oropendola
bash ROLLBACK.sh
```

### Manual Restart

```bash
ssh frappe@oropendola.ai
cd /home/frappe/frappe-bench
bench restart
bench --site oropendola.ai clear-cache
bench --site oropendola.ai scheduler restart
```

---

## Success Indicators

✅ "All tests passed" message
✅ APIs Available: 113
✅ DocTypes Created: 21
✅ Cron Jobs Configured: 5
✅ No errors in logs

---

## Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Backup | 2 min | Auto |
| 2. Upload | 3 min | Auto |
| 3. SQL Schemas | 3 min | Manual |
| 4. API Merge | 2 min | Manual |
| 5. Restart | 2 min | Auto |
| 6. Verify | 3 min | Manual |
| **Total** | **15-20 min** | |

---

## Help Commands

```bash
# Check bench status
bench status

# List sites
bench list-sites

# Scheduler status
bench --site oropendola.ai scheduler status

# Clear cache
bench --site oropendola.ai clear-cache

# View recent logs
bench --site oropendola.ai logs | tail -50
```

---

## Emergency Contacts

- **Deployment Guide:** PRODUCTION_DEPLOYMENT_GUIDE.md
- **Rollback:** ROLLBACK.sh
- **Logs:** /home/frappe/frappe-bench/logs/

---

**Quick Start:** `bash DEPLOY_TO_PRODUCTION.sh` 🚀
