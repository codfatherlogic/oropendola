"""
Week 9: Analytics & Insights - Core Module
Comprehensive analytics and reporting system

File: ai_assistant/core/analytics.py

Functions:
- track_event: Track user events
- track_usage: Track feature usage
- track_performance: Track performance metrics
- get_events: Retrieve events
- get_usage: Get usage metrics
- get_performance: Get performance metrics
- generate_report: Generate analytics report
- get_report: Retrieve generated report
- list_reports: List all reports
- export_report: Export report to CSV/PDF
- get_insights: Get AI-generated insights
- get_dashboard: Get dashboard data
- create_widget: Create dashboard widget
- update_widget: Update widget
- delete_widget: Delete widget
- get_trends: Get trend analysis
"""

import frappe
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import hashlib


def track_event(
    event_type: str,
    event_action: str,
    event_category: Optional[str] = None,
    event_label: Optional[str] = None,
    event_value: Optional[float] = None,
    metadata: Optional[Dict] = None
) -> Dict[str, Any]:
    """Track a user event"""
    user_id = frappe.session.user
    session_id = frappe.session.sid

    try:
        now = datetime.now()
        event_id = f"EVT-{now.strftime('%Y%m%d%H%M%S')}-{frappe.generate_hash(length=6)}"

        doc = frappe.get_doc({
            "doctype": "Oropendola Analytics Event",
            "event_id": event_id,
            "user_id": user_id,
            "event_type": event_type,
            "event_category": event_category,
            "event_action": event_action,
            "event_label": event_label,
            "event_value": event_value,
            "session_id": session_id,
            "metadata": json.dumps(metadata or {}),
            "timestamp": now,
            "date": now.date(),
            "hour": now.hour
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"success": True, "event_id": event_id}
    except Exception as e:
        frappe.log_error(f"Failed to track event: {str(e)}")
        return {"success": False, "message": str(e)}


def track_usage(
    metric_type: str,
    metric_name: str,
    metric_value: float,
    unit: str = "count",
    period_type: str = "daily"
) -> Dict[str, Any]:
    """Track usage metric"""
    user_id = frappe.session.user

    try:
        now = datetime.now()

        # Calculate period boundaries
        if period_type == "hourly":
            period_start = now.replace(minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(hours=1)
        elif period_type == "daily":
            period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=1)
        elif period_type == "weekly":
            period_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
            period_end = period_start + timedelta(days=7)
        elif period_type == "monthly":
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = period_start + timedelta(days=32)
            period_end = next_month.replace(day=1)
        else:
            return {"success": False, "message": f"Invalid period_type: {period_type}"}

        # Check if metric already exists for this period
        existing = frappe.db.get_value(
            "Oropendola Usage Metric",
            {
                "user_id": user_id,
                "metric_type": metric_type,
                "metric_name": metric_name,
                "period_type": period_type,
                "period_start": period_start
            },
            "name"
        )

        if existing:
            # Update existing metric
            frappe.db.sql("""
                UPDATE `oropendola_usage_metric`
                SET metric_value = metric_value + %s
                WHERE name = %s
            """, (metric_value, existing))
            frappe.db.commit()
            return {"success": True, "metric_id": existing, "action": "updated"}
        else:
            # Create new metric
            metric_id = f"MTR-{now.strftime('%Y%m%d')}-{frappe.generate_hash(length=6)}"
            doc = frappe.get_doc({
                "doctype": "Oropendola Usage Metric",
                "metric_id": metric_id,
                "user_id": user_id,
                "metric_type": metric_type,
                "metric_name": metric_name,
                "metric_value": metric_value,
                "unit": unit,
                "period_type": period_type,
                "period_start": period_start,
                "period_end": period_end,
                "created_at": now
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            return {"success": True, "metric_id": metric_id, "action": "created"}

    except Exception as e:
        frappe.log_error(f"Failed to track usage: {str(e)}")
        return {"success": False, "message": str(e)}


def track_performance(
    metric_name: str,
    value: float,
    unit: str,
    metric_category: str = "general",
    endpoint: Optional[str] = None,
    feature: Optional[str] = None,
    threshold_warning: Optional[float] = None,
    threshold_critical: Optional[float] = None
) -> Dict[str, Any]:
    """Track performance metric"""
    try:
        now = datetime.now()

        # Determine status based on thresholds
        status = "normal"
        if threshold_critical and value >= threshold_critical:
            status = "critical"
        elif threshold_warning and value >= threshold_warning:
            status = "warning"

        metric_id = f"PERF-{now.strftime('%Y%m%d%H%M%S')}-{frappe.generate_hash(length=6)}"

        doc = frappe.get_doc({
            "doctype": "Oropendola Performance Metric",
            "metric_id": metric_id,
            "metric_name": metric_name,
            "metric_category": metric_category,
            "value": value,
            "unit": unit,
            "threshold_warning": threshold_warning,
            "threshold_critical": threshold_critical,
            "status": status,
            "endpoint": endpoint,
            "feature": feature,
            "measured_at": now,
            "period_type": "realtime"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"success": True, "metric_id": metric_id, "status": status}

    except Exception as e:
        frappe.log_error(f"Failed to track performance: {str(e)}")
        return {"success": False, "message": str(e)}


def get_events(
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """Retrieve events"""
    user_id = frappe.session.user

    try:
        filters = {"user_id": user_id}
        if event_type:
            filters["event_type"] = event_type
        if start_date:
            filters["date"] = [">=", start_date]
        if end_date:
            if "date" in filters:
                filters["date"] = ["between", [start_date, end_date]]
            else:
                filters["date"] = ["<=", end_date]

        events = frappe.db.get_all(
            "Oropendola Analytics Event",
            filters=filters,
            fields=["*"],
            order_by="timestamp desc",
            limit=limit
        )

        for event in events:
            if event.metadata:
                event.metadata = json.loads(event.metadata)

        return {"success": True, "events": events, "total": len(events)}

    except Exception as e:
        frappe.log_error(f"Failed to get events: {str(e)}")
        return {"success": False, "message": str(e)}


def get_usage(
    metric_type: Optional[str] = None,
    period_type: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """Get usage metrics"""
    user_id = frappe.session.user

    try:
        filters = {"user_id": user_id, "period_type": period_type}
        if metric_type:
            filters["metric_type"] = metric_type

        date_filters = []
        if start_date:
            date_filters.append(f"period_start >= '{start_date}'")
        if end_date:
            date_filters.append(f"period_end <= '{end_date}'")

        where_clause = " AND ".join([f"{k} = '{v}'" for k, v in filters.items()])
        if date_filters:
            where_clause += " AND " + " AND ".join(date_filters)

        metrics = frappe.db.sql(f"""
            SELECT *
            FROM `oropendola_usage_metric`
            WHERE {where_clause}
            ORDER BY period_start DESC
        """, as_dict=True)

        return {"success": True, "metrics": metrics, "total": len(metrics)}

    except Exception as e:
        frappe.log_error(f"Failed to get usage: {str(e)}")
        return {"success": False, "message": str(e)}


def get_performance(
    metric_category: Optional[str] = None,
    feature: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """Get performance metrics"""
    try:
        filters = []
        params = []

        if metric_category:
            filters.append("metric_category = %s")
            params.append(metric_category)
        if feature:
            filters.append("feature = %s")
            params.append(feature)
        if start_time:
            filters.append("measured_at >= %s")
            params.append(start_time)
        if end_time:
            filters.append("measured_at <= %s")
            params.append(end_time)

        where_clause = " AND ".join(filters) if filters else "1=1"

        metrics = frappe.db.sql(f"""
            SELECT *
            FROM `oropendola_performance_metric`
            WHERE {where_clause}
            ORDER BY measured_at DESC
            LIMIT %s
        """, tuple(params + [limit]), as_dict=True)

        return {"success": True, "metrics": metrics, "total": len(metrics)}

    except Exception as e:
        frappe.log_error(f"Failed to get performance: {str(e)}")
        return {"success": False, "message": str(e)}


def generate_report(
    report_name: str,
    report_type: str,
    period_start: str,
    period_end: str,
    scope: str = "user",
    scope_id: Optional[str] = None
) -> Dict[str, Any]:
    """Generate analytics report"""
    user_id = frappe.session.user

    try:
        # Generate report data based on type
        if report_type == "usage":
            report_data = _generate_usage_report(period_start, period_end, scope, scope_id)
        elif report_type == "performance":
            report_data = _generate_performance_report(period_start, period_end, scope, scope_id)
        elif report_type == "user_engagement":
            report_data = _generate_engagement_report(period_start, period_end, scope, scope_id)
        elif report_type == "feature_adoption":
            report_data = _generate_adoption_report(period_start, period_end, scope, scope_id)
        else:
            return {"success": False, "message": f"Invalid report_type: {report_type}"}

        report_id = f"RPT-{datetime.now().strftime('%Y%m%d')}-{frappe.generate_hash(length=6)}"

        doc = frappe.get_doc({
            "doctype": "Oropendola Analytics Report",
            "report_id": report_id,
            "report_name": report_name,
            "report_type": report_type,
            "period_start": period_start,
            "period_end": period_end,
            "scope": scope,
            "scope_id": scope_id or user_id,
            "report_data": json.dumps(report_data),
            "summary": json.dumps(report_data.get("summary", {})),
            "status": "generated",
            "generated_by": user_id,
            "generated_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"success": True, "report_id": report_id}

    except Exception as e:
        frappe.log_error(f"Failed to generate report: {str(e)}")
        return {"success": False, "message": str(e)}


def _generate_usage_report(period_start, period_end, scope, scope_id):
    """Helper to generate usage report"""
    user_filter = f"user_id = '{scope_id}'" if scope == "user" else "1=1"

    metrics = frappe.db.sql(f"""
        SELECT metric_type, metric_name, SUM(metric_value) as total, unit
        FROM `oropendola_usage_metric`
        WHERE {user_filter}
          AND period_start >= '{period_start}'
          AND period_end <= '{period_end}'
        GROUP BY metric_type, metric_name, unit
    """, as_dict=True)

    return {
        "metrics": metrics,
        "summary": {
            "total_metrics": len(metrics),
            "period": f"{period_start} to {period_end}"
        }
    }


def _generate_performance_report(period_start, period_end, scope, scope_id):
    """Helper to generate performance report"""
    metrics = frappe.db.sql(f"""
        SELECT
            metric_category,
            metric_name,
            AVG(value) as avg_value,
            MIN(value) as min_value,
            MAX(value) as max_value,
            unit,
            COUNT(*) as measurement_count
        FROM `oropendola_performance_metric`
        WHERE measured_at >= '{period_start}'
          AND measured_at <= '{period_end}'
        GROUP BY metric_category, metric_name, unit
    """, as_dict=True)

    return {
        "metrics": metrics,
        "summary": {
            "total_categories": len(set(m["metric_category"] for m in metrics)),
            "total_measurements": sum(m["measurement_count"] for m in metrics)
        }
    }


def _generate_engagement_report(period_start, period_end, scope, scope_id):
    """Helper to generate engagement report"""
    user_filter = f"user_id = '{scope_id}'" if scope == "user" else "1=1"

    events = frappe.db.sql(f"""
        SELECT
            event_type,
            COUNT(*) as event_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT session_id) as unique_sessions
        FROM `oropendola_analytics_event`
        WHERE {user_filter}
          AND timestamp >= '{period_start}'
          AND timestamp <= '{period_end}'
        GROUP BY event_type
    """, as_dict=True)

    return {
        "events": events,
        "summary": {
            "total_events": sum(e["event_count"] for e in events),
            "event_types": len(events)
        }
    }


def _generate_adoption_report(period_start, period_end, scope, scope_id):
    """Helper to generate feature adoption report"""
    user_filter = f"user_id = '{scope_id}'" if scope == "user" else "1=1"

    features = frappe.db.sql(f"""
        SELECT
            event_category as feature,
            COUNT(*) as usage_count,
            COUNT(DISTINCT user_id) as users,
            MIN(timestamp) as first_used,
            MAX(timestamp) as last_used
        FROM `oropendola_analytics_event`
        WHERE {user_filter}
          AND timestamp >= '{period_start}'
          AND timestamp <= '{period_end}'
          AND event_category IS NOT NULL
        GROUP BY event_category
        ORDER BY usage_count DESC
    """, as_dict=True)

    return {
        "features": features,
        "summary": {
            "total_features": len(features),
            "most_used": features[0]["feature"] if features else None
        }
    }


def get_report(report_id: str) -> Dict[str, Any]:
    """Retrieve generated report"""
    try:
        report = frappe.db.get_value(
            "Oropendola Analytics Report",
            {"report_id": report_id},
            ["*"],
            as_dict=True
        )

        if not report:
            return {"success": False, "message": "Report not found"}

        report["report_data"] = json.loads(report.report_data) if report.report_data else {}
        report["summary"] = json.loads(report.summary) if report.summary else {}

        return {"success": True, "report": report}

    except Exception as e:
        return {"success": False, "message": str(e)}


def list_reports(report_type: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
    """List all reports"""
    user_id = frappe.session.user

    try:
        filters = {"generated_by": user_id}
        if report_type:
            filters["report_type"] = report_type

        reports = frappe.db.get_all(
            "Oropendola Analytics Report",
            filters=filters,
            fields=["report_id", "report_name", "report_type", "period_start", "period_end", "status", "generated_at"],
            order_by="generated_at desc",
            limit=limit
        )

        return {"success": True, "reports": reports, "total": len(reports)}

    except Exception as e:
        return {"success": False, "message": str(e)}


def export_report(report_id: str, format: str = "json") -> Dict[str, Any]:
    """Export report to CSV/PDF/JSON"""
    try:
        report_result = get_report(report_id)
        if not report_result.get("success"):
            return report_result

        report = report_result["report"]

        if format == "json":
            return {
                "success": True,
                "format": "json",
                "data": report["report_data"]
            }
        elif format == "csv":
            # Convert to CSV (simplified)
            import csv
            import io

            output = io.StringIO()
            writer = csv.writer(output)

            # Write headers and data (this is simplified)
            writer.writerow(["Report", report["report_name"]])
            writer.writerow(["Type", report["report_type"]])
            writer.writerow(["Period", f"{report['period_start']} to {report['period_end']}"])

            return {
                "success": True,
                "format": "csv",
                "data": output.getvalue()
            }
        else:
            return {"success": False, "message": f"Unsupported format: {format}"}

    except Exception as e:
        return {"success": False, "message": str(e)}


def get_insights(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status: str = "new",
    limit: int = 10
) -> Dict[str, Any]:
    """Get AI-generated insights"""
    user_id = frappe.session.user

    try:
        filters = {"user_id": user_id, "status": status}
        if category:
            filters["category"] = category
        if severity:
            filters["severity"] = severity

        insights = frappe.db.get_all(
            "Oropendola Analytics Insight",
            filters=filters,
            fields=["*"],
            order_by="generated_at desc",
            limit=limit
        )

        for insight in insights:
            if insight.action_suggestions:
                insight.action_suggestions = json.loads(insight.action_suggestions)
            if insight.supporting_data:
                insight.supporting_data = json.loads(insight.supporting_data)

        return {"success": True, "insights": insights, "total": len(insights)}

    except Exception as e:
        return {"success": False, "message": str(e)}


def get_dashboard(workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """Get dashboard data with all widgets"""
    user_id = frappe.session.user

    try:
        filters = {"created_by": user_id}
        if workspace_id:
            filters["workspace_id"] = workspace_id

        widgets = frappe.db.get_all(
            "Oropendola Dashboard Widget",
            filters=filters,
            fields=["*"],
            order_by="position_y, position_x"
        )

        # Load widget data
        for widget in widgets:
            widget["query_config"] = json.loads(widget.query_config) if widget.query_config else {}
            widget["display_config"] = json.loads(widget.display_config) if widget.display_config else {}

        return {"success": True, "widgets": widgets, "total": len(widgets)}

    except Exception as e:
        return {"success": False, "message": str(e)}


def create_widget(
    widget_name: str,
    widget_type: str,
    data_source: str,
    query_config: Dict,
    display_config: Optional[Dict] = None,
    chart_type: Optional[str] = None,
    position_x: int = 0,
    position_y: int = 0,
    width: int = 4,
    height: int = 3
) -> Dict[str, Any]:
    """Create dashboard widget"""
    user_id = frappe.session.user

    try:
        widget_id = f"WDG-{datetime.now().strftime('%Y%m%d')}-{frappe.generate_hash(length=6)}"

        doc = frappe.get_doc({
            "doctype": "Oropendola Dashboard Widget",
            "widget_id": widget_id,
            "widget_name": widget_name,
            "widget_type": widget_type,
            "chart_type": chart_type,
            "data_source": data_source,
            "query_config": json.dumps(query_config),
            "display_config": json.dumps(display_config or {}),
            "position_x": position_x,
            "position_y": position_y,
            "width": width,
            "height": height,
            "created_by": user_id,
            "created_at": datetime.now(),
            "modified_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"success": True, "widget_id": widget_id}

    except Exception as e:
        return {"success": False, "message": str(e)}


def update_widget(widget_id: str, updates: Dict) -> Dict[str, Any]:
    """Update dashboard widget"""
    try:
        widget_name = frappe.db.get_value(
            "Oropendola Dashboard Widget",
            {"widget_id": widget_id},
            "name"
        )

        if not widget_name:
            return {"success": False, "message": "Widget not found"}

        # Convert complex fields to JSON
        if "query_config" in updates and isinstance(updates["query_config"], dict):
            updates["query_config"] = json.dumps(updates["query_config"])
        if "display_config" in updates and isinstance(updates["display_config"], dict):
            updates["display_config"] = json.dumps(updates["display_config"])

        updates["modified_at"] = datetime.now()

        frappe.db.set_value("Oropendola Dashboard Widget", widget_name, updates)
        frappe.db.commit()

        return {"success": True, "widget_id": widget_id}

    except Exception as e:
        return {"success": False, "message": str(e)}


def delete_widget(widget_id: str) -> Dict[str, Any]:
    """Delete dashboard widget"""
    try:
        widget_name = frappe.db.get_value(
            "Oropendola Dashboard Widget",
            {"widget_id": widget_id},
            "name"
        )

        if not widget_name:
            return {"success": False, "message": "Widget not found"}

        frappe.delete_doc("Oropendola Dashboard Widget", widget_name)
        frappe.db.commit()

        return {"success": True, "message": "Widget deleted"}

    except Exception as e:
        return {"success": False, "message": str(e)}


def get_trends(
    metric_type: str,
    metric_name: str,
    period_type: str = "daily",
    periods: int = 30
) -> Dict[str, Any]:
    """Get trend analysis"""
    user_id = frappe.session.user

    try:
        end_date = datetime.now()

        if period_type == "daily":
            start_date = end_date - timedelta(days=periods)
        elif period_type == "weekly":
            start_date = end_date - timedelta(weeks=periods)
        elif period_type == "monthly":
            start_date = end_date - timedelta(days=periods * 30)
        else:
            return {"success": False, "message": f"Invalid period_type: {period_type}"}

        metrics = frappe.db.sql("""
            SELECT period_start, metric_value, unit
            FROM `oropendola_usage_metric`
            WHERE user_id = %s
              AND metric_type = %s
              AND metric_name = %s
              AND period_type = %s
              AND period_start >= %s
            ORDER BY period_start ASC
        """, (user_id, metric_type, metric_name, period_type, start_date), as_dict=True)

        if not metrics:
            return {"success": True, "trend": "no_data", "data": []}

        # Calculate trend
        values = [m["metric_value"] for m in metrics]
        if len(values) >= 2:
            first_half_avg = sum(values[:len(values)//2]) / (len(values)//2)
            second_half_avg = sum(values[len(values)//2:]) / (len(values) - len(values)//2)

            if second_half_avg > first_half_avg * 1.1:
                trend = "increasing"
            elif second_half_avg < first_half_avg * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"

        return {
            "success": True,
            "trend": trend,
            "data": metrics,
            "summary": {
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "current": values[-1] if values else 0
            }
        }

    except Exception as e:
        return {"success": False, "message": str(e)}
