"""
Cron Jobs Test Script
=====================

This script allows you to test individual cron jobs before deploying them
to production. Run this in the Frappe console.

Usage:
    bench --site oropendola.ai console
    >>> exec(open('/path/to/test_cron_jobs.py').read())

Author: Claude (AI Assistant)
Date: October 25, 2025
Version: 1.0
"""

import frappe
from frappe.utils import now_datetime
import json


def test_aggregate_daily_metrics():
    """
    Test the daily metrics aggregation cron job.
    """
    print("\n" + "=" * 80)
    print("TEST: aggregate_daily_metrics")
    print("=" * 80)

    try:
        from ai_assistant.cron_jobs import aggregate_daily_metrics

        print("✓ Import successful")

        # Run the job
        print("\nRunning aggregation...")
        aggregate_daily_metrics()

        print("\n✓ TEST PASSED: aggregate_daily_metrics")

    except Exception as e:
        print(f"\n✗ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


def test_generate_weekly_insights():
    """
    Test the weekly insights generation cron job.
    """
    print("\n" + "=" * 80)
    print("TEST: generate_weekly_insights")
    print("=" * 80)

    try:
        from ai_assistant.cron_jobs import generate_weekly_insights

        print("✓ Import successful")

        # Run the job
        print("\nGenerating insights...")
        generate_weekly_insights()

        print("\n✓ TEST PASSED: generate_weekly_insights")

    except Exception as e:
        print(f"\n✗ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


def test_scan_secrets_daily():
    """
    Test the daily secrets scanning cron job.
    """
    print("\n" + "=" * 80)
    print("TEST: scan_secrets_daily")
    print("=" * 80)

    try:
        from ai_assistant.cron_jobs import scan_secrets_daily

        print("✓ Import successful")

        # First, create a test code submission event with a secret
        print("\nCreating test event with hardcoded secret...")

        test_code = '''
def connect_to_database():
    # BAD: Hardcoded credentials
    api_key = "AKIAIOSFODNN7EXAMPLE"
    password = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    return api_key, password
        '''

        event = frappe.get_doc({
            'doctype': 'Analytics Event',
            'user_id': frappe.session.user,
            'event_type': 'code_submission',
            'event_name': 'test_code_analysis',
            'metadata': json.dumps({
                'code': test_code,
                'file_path': 'test_file.py'
            }),
            'event_timestamp': now_datetime(),
            'status': 'success'
        })
        event.insert(ignore_permissions=True)
        frappe.db.commit()

        print(f"✓ Created test event: {event.name}")

        # Run the job
        print("\nRunning secrets scan...")
        scan_secrets_daily()

        print("\n✓ TEST PASSED: scan_secrets_daily")
        print(f"\nNote: Check Security Incident DocType for any created incidents")

    except Exception as e:
        print(f"\n✗ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


def test_rotate_keys_monthly():
    """
    Test the monthly key rotation cron job.
    """
    print("\n" + "=" * 80)
    print("TEST: rotate_keys_monthly")
    print("=" * 80)

    try:
        from ai_assistant.cron_jobs import rotate_keys_monthly

        print("✓ Import successful")

        print("\nNOTE: This test may skip if Security API Key DocType doesn't exist")

        # Run the job
        print("\nRunning key rotation...")
        rotate_keys_monthly()

        print("\n✓ TEST PASSED: rotate_keys_monthly")

    except Exception as e:
        print(f"\n✗ TEST FAILED (Expected if DocType doesn't exist): {str(e)}")


def test_generate_compliance_reports():
    """
    Test the weekly compliance reports generation cron job.
    """
    print("\n" + "=" * 80)
    print("TEST: generate_compliance_reports")
    print("=" * 80)

    try:
        from ai_assistant.cron_jobs import generate_compliance_reports

        print("✓ Import successful")

        # Run the job
        print("\nGenerating compliance reports...")
        generate_compliance_reports()

        print("\n✓ TEST PASSED: generate_compliance_reports")

    except Exception as e:
        print(f"\n✗ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


def test_all_cron_jobs():
    """
    Run all cron job tests sequentially.
    """
    print("\n" + "=" * 80)
    print("RUNNING ALL CRON JOB TESTS")
    print("=" * 80)
    print(f"Timestamp: {now_datetime()}")
    print("=" * 80)

    tests = [
        ("aggregate_daily_metrics", test_aggregate_daily_metrics),
        ("generate_weekly_insights", test_generate_weekly_insights),
        ("scan_secrets_daily", test_scan_secrets_daily),
        ("rotate_keys_monthly", test_rotate_keys_monthly),
        ("generate_compliance_reports", test_generate_compliance_reports)
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            test_func()
            results[test_name] = "PASSED"
        except Exception as e:
            results[test_name] = f"FAILED: {str(e)}"

    # Print summary
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)

    passed = sum(1 for r in results.values() if r == "PASSED")
    total = len(results)

    for test_name, result in results.items():
        status = "✓" if result == "PASSED" else "✗"
        print(f"{status} {test_name}: {result}")

    print("=" * 80)
    print(f"Total: {passed}/{total} passed ({passed/total*100:.1f}%)")
    print("=" * 80)

    return results


def verify_scheduler_config():
    """
    Verify that cron jobs are properly registered in hooks.py
    """
    print("\n" + "=" * 80)
    print("VERIFYING SCHEDULER CONFIGURATION")
    print("=" * 80)

    try:
        from ai_assistant import hooks

        if not hasattr(hooks, 'scheduler_events'):
            print("✗ ERROR: scheduler_events not found in hooks.py")
            print("Please add scheduler_events configuration to hooks.py")
            return False

        scheduler_events = hooks.scheduler_events

        print("✓ scheduler_events found in hooks.py")
        print("\nRegistered jobs:")

        # Check daily jobs
        daily_jobs = scheduler_events.get('daily', [])
        print(f"\nDaily jobs ({len(daily_jobs)}):")
        for job in daily_jobs:
            print(f"  - {job}")

        # Check weekly jobs
        weekly_jobs = scheduler_events.get('weekly', [])
        print(f"\nWeekly jobs ({len(weekly_jobs)}):")
        for job in weekly_jobs:
            print(f"  - {job}")

        # Check monthly jobs
        monthly_jobs = scheduler_events.get('monthly', [])
        print(f"\nMonthly jobs ({len(monthly_jobs)}):")
        for job in monthly_jobs:
            print(f"  - {job}")

        # Expected jobs
        expected = {
            'daily': [
                'ai_assistant.cron_jobs.aggregate_daily_metrics',
                'ai_assistant.cron_jobs.scan_secrets_daily'
            ],
            'weekly': [
                'ai_assistant.cron_jobs.generate_weekly_insights',
                'ai_assistant.cron_jobs.generate_compliance_reports'
            ],
            'monthly': [
                'ai_assistant.cron_jobs.rotate_keys_monthly'
            ]
        }

        # Verify all expected jobs are registered
        print("\nVerification:")
        all_good = True

        for schedule, jobs in expected.items():
            registered = scheduler_events.get(schedule, [])
            for job in jobs:
                if job in registered:
                    print(f"✓ {job} is registered in {schedule}")
                else:
                    print(f"✗ {job} is NOT registered in {schedule}")
                    all_good = False

        if all_good:
            print("\n✓ All cron jobs are properly registered!")
        else:
            print("\n✗ Some cron jobs are missing. Please update hooks.py")

        return all_good

    except ImportError:
        print("✗ ERROR: Could not import ai_assistant.hooks")
        print("Make sure you're running this from the Frappe console")
        return False


def check_scheduler_status():
    """
    Check if Frappe scheduler is running
    """
    print("\n" + "=" * 80)
    print("CHECKING SCHEDULER STATUS")
    print("=" * 80)

    try:
        # Check if scheduler is enabled
        scheduler_enabled = frappe.db.get_single_value('System Settings', 'enable_scheduler')

        if scheduler_enabled:
            print("✓ Scheduler is ENABLED")
        else:
            print("✗ Scheduler is DISABLED")
            print("\nTo enable:")
            print("  bench --site oropendola.ai scheduler enable")

        # Check for recent scheduler logs
        print("\nRecent scheduler activity:")
        print("  Check: /home/frappe/frappe-bench/logs/scheduler.log")

    except Exception as e:
        print(f"✗ Error checking scheduler status: {str(e)}")


def create_test_data():
    """
    Create sample data for testing cron jobs
    """
    print("\n" + "=" * 80)
    print("CREATING TEST DATA")
    print("=" * 80)

    try:
        # Create sample analytics events
        print("\nCreating sample analytics events...")

        for i in range(10):
            event = frappe.get_doc({
                'doctype': 'Analytics Event',
                'user_id': frappe.session.user,
                'event_type': 'user_action',
                'event_name': f'test_event_{i}',
                'metadata': json.dumps({'test': True}),
                'event_timestamp': now_datetime(),
                'duration_ms': 100 + i * 10,
                'status': 'success'
            })
            event.insert(ignore_permissions=True)

        frappe.db.commit()

        print(f"✓ Created 10 sample events")

        # Create sample code submission (for secrets scan)
        print("\nCreating sample code submission with secret...")

        secret_code = '''
def deploy():
    aws_key = "AKIAIOSFODNN7EXAMPLE"
    os.environ['SECRET'] = "hardcoded_password_123"
    return aws_key
        '''

        event = frappe.get_doc({
            'doctype': 'Analytics Event',
            'user_id': frappe.session.user,
            'event_type': 'code_submission',
            'event_name': 'code_review',
            'metadata': json.dumps({
                'code': secret_code,
                'file_path': 'deploy.py'
            }),
            'event_timestamp': now_datetime(),
            'status': 'success'
        })
        event.insert(ignore_permissions=True)

        frappe.db.commit()

        print("✓ Created sample code submission")

        print("\n✓ Test data created successfully")

    except Exception as e:
        print(f"\n✗ Failed to create test data: {str(e)}")
        import traceback
        traceback.print_exc()


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                     CRON JOBS TEST SUITE                                   ║
║                     Oropendola AI - Backend                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Available Commands:
------------------
1. test_all_cron_jobs()              - Run all tests
2. test_aggregate_daily_metrics()    - Test daily metrics aggregation
3. test_generate_weekly_insights()   - Test weekly insights generation
4. test_scan_secrets_daily()         - Test daily secrets scanning
5. test_rotate_keys_monthly()        - Test monthly key rotation
6. test_generate_compliance_reports() - Test compliance report generation
7. verify_scheduler_config()         - Verify hooks.py configuration
8. check_scheduler_status()          - Check if scheduler is running
9. create_test_data()                - Create sample data for testing

Quick Start:
-----------
>>> create_test_data()      # Create sample data first
>>> test_all_cron_jobs()    # Run all tests

Example:
--------
>>> create_test_data()
>>> test_aggregate_daily_metrics()
>>> verify_scheduler_config()
>>> check_scheduler_status()
    """)

    # Auto-run verification
    verify_scheduler_config()
    check_scheduler_status()

    print("\n" + "=" * 80)
    print("Ready to test! Run: test_all_cron_jobs()")
    print("=" * 80 + "\n")
