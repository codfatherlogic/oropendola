"""
Frappe Hooks Configuration - Cron Jobs Registration
====================================================

This file shows the required configuration to add to your hooks.py file
to register all cron jobs.

Deployment Path: /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/hooks.py

Instructions:
1. Locate your existing hooks.py file
2. Add the scheduler_events configuration below
3. Restart the scheduler: bench --site oropendola.ai scheduler restart

Author: Claude (AI Assistant)
Date: October 25, 2025
Version: 1.0
"""

# ============================================================================
# SCHEDULER EVENTS CONFIGURATION
# ============================================================================

# Add this to your hooks.py file:

scheduler_events = {
    # ========================================================================
    # DAILY JOBS
    # ========================================================================
    "daily": [
        # Week 9 Analytics: Aggregate previous day's events
        # Runs at: 2:00 AM (default daily time)
        "ai_assistant.cron_jobs.aggregate_daily_metrics",

        # Week 12 Security: Scan for hardcoded secrets
        # Runs at: 1:00 AM (default daily time)
        "ai_assistant.cron_jobs.scan_secrets_daily",
    ],

    # ========================================================================
    # WEEKLY JOBS
    # ========================================================================
    "weekly": [
        # Week 9 Analytics: Generate AI insights
        # Runs on: Monday at 3:00 AM (default weekly time)
        "ai_assistant.cron_jobs.generate_weekly_insights",

        # Week 12 Security: Generate compliance reports
        # Runs on: Sunday at 5:00 AM (default weekly time)
        "ai_assistant.cron_jobs.generate_compliance_reports",
    ],

    # ========================================================================
    # MONTHLY JOBS
    # ========================================================================
    "monthly": [
        # Week 12 Security: Rotate API keys and encryption keys
        # Runs on: 1st of month at 4:00 AM (default monthly time)
        "ai_assistant.cron_jobs.rotate_keys_monthly",
    ],

    # ========================================================================
    # CUSTOM SCHEDULE JOBS (optional - advanced usage)
    # ========================================================================
    # If you need more granular control over scheduling:

    # "cron": {
    #     # Aggregate metrics every day at exactly 2:00 AM
    #     "0 2 * * *": [
    #         "ai_assistant.cron_jobs.aggregate_daily_metrics"
    #     ],
    #
    #     # Secret scan every day at exactly 1:00 AM
    #     "0 1 * * *": [
    #         "ai_assistant.cron_jobs.scan_secrets_daily"
    #     ],
    #
    #     # Weekly insights every Monday at 3:00 AM
    #     "0 3 * * 1": [
    #         "ai_assistant.cron_jobs.generate_weekly_insights"
    #     ],
    #
    #     # Compliance reports every Sunday at 5:00 AM
    #     "0 5 * * 0": [
    #         "ai_assistant.cron_jobs.generate_compliance_reports"
    #     ],
    #
    #     # Key rotation on 1st of month at 4:00 AM
    #     "0 4 1 * *": [
    #         "ai_assistant.cron_jobs.rotate_keys_monthly"
    #     ]
    # }
}

# ============================================================================
# FULL EXAMPLE hooks.py
# ============================================================================

"""
Example of complete hooks.py with cron jobs:

from frappe import _

app_name = "ai_assistant"
app_title = "Oropendola AI"
app_publisher = "Oropendola AI Team"
app_description = "AI Assistant for VS Code"
app_email = "dev@oropendola.ai"
app_license = "proprietary"

# ============================================================================
# Scheduled Jobs
# ============================================================================

scheduler_events = {
    # All jobs run at default times unless specified in cron dict

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

# ============================================================================
# Other hooks (API endpoints, etc.)
# ============================================================================

# API endpoints
doc_events = {
    # Your existing doc events
}

# REST API whitelisted methods
# (Your existing API methods are already registered via @frappe.whitelist())

"""

# ============================================================================
# DEPLOYMENT INSTRUCTIONS
# ============================================================================

"""
STEP-BY-STEP DEPLOYMENT:

1. Upload cron_jobs.py to server:
   scp backend/cron_jobs_complete.py frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/cron_jobs.py

2. SSH into server:
   ssh frappe@oropendola.ai

3. Backup existing hooks.py:
   cd /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant
   cp hooks.py hooks.py.backup

4. Edit hooks.py:
   nano hooks.py

   Add the scheduler_events configuration from above

5. Restart Frappe services:
   cd /home/frappe/frappe-bench
   bench --site oropendola.ai clear-cache
   bench --site oropendola.ai scheduler restart
   bench restart

6. Verify scheduler is running:
   bench --site oropendola.ai scheduler status

7. View scheduler logs:
   bench --site oropendola.ai scheduler logs

8. Manually test a cron job (optional):
   bench --site oropendola.ai console

   >>> from ai_assistant.cron_jobs import aggregate_daily_metrics
   >>> aggregate_daily_metrics()

9. Monitor cron job execution:
   tail -f /home/frappe/frappe-bench/logs/scheduler.log

"""

# ============================================================================
# CRON SCHEDULE REFERENCE
# ============================================================================

"""
Cron Expression Format: "minute hour day month day_of_week"

Examples:
- "0 2 * * *"   = Every day at 2:00 AM
- "0 1 * * *"   = Every day at 1:00 AM
- "0 3 * * 1"   = Every Monday at 3:00 AM
- "0 5 * * 0"   = Every Sunday at 5:00 AM
- "0 4 1 * *"   = 1st of every month at 4:00 AM
- "*/15 * * * *" = Every 15 minutes
- "0 */6 * * *" = Every 6 hours

Default Frappe Times:
- daily: 2:00 AM
- weekly: Monday 3:00 AM
- monthly: 1st of month 4:00 AM

"""

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

"""
If cron jobs are not running:

1. Check scheduler status:
   bench --site oropendola.ai scheduler status

2. Enable scheduler if disabled:
   bench --site oropendola.ai scheduler enable

3. Check for errors in logs:
   bench --site oropendola.ai logs

4. Verify hooks.py syntax:
   python -m py_compile hooks.py

5. Check scheduler log:
   tail -f /home/frappe/frappe-bench/logs/scheduler.log

6. Manually trigger a job:
   bench --site oropendola.ai console
   >>> from ai_assistant.cron_jobs import aggregate_daily_metrics
   >>> aggregate_daily_metrics()

7. Check Frappe version compatibility:
   bench version

8. Restart everything:
   bench restart
   bench --site oropendola.ai scheduler restart

Common Issues:
- Import errors: Check module paths are correct
- Permission errors: Check DocType permissions
- Database errors: Check DocTypes exist
- Timeout errors: Reduce batch sizes in cron jobs
"""
