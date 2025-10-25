"""
Week 9: Analytics & Insights - API Endpoint Definitions

Add these 16 endpoints to ai_assistant/api/__init__.py
"""

import frappe
import json


@frappe.whitelist()
def analytics_track_event(event_type, event_action, event_category=None, event_label=None, event_value=None, metadata=None):
    """Track user event"""
    from ai_assistant.core.analytics import track_event

    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    if isinstance(event_value, str):
        event_value = float(event_value) if event_value else None

    return track_event(
        event_type=event_type,
        event_action=event_action,
        event_category=event_category,
        event_label=event_label,
        event_value=event_value,
        metadata=metadata
    )


@frappe.whitelist()
def analytics_track_usage(metric_type, metric_name, metric_value, unit="count", period_type="daily"):
    """Track feature usage"""
    from ai_assistant.core.analytics import track_usage

    if isinstance(metric_value, str):
        metric_value = float(metric_value)

    return track_usage(
        metric_type=metric_type,
        metric_name=metric_name,
        metric_value=metric_value,
        unit=unit,
        period_type=period_type
    )


@frappe.whitelist()
def analytics_track_performance(
    metric_name,
    value,
    unit,
    metric_category="general",
    endpoint=None,
    feature=None,
    threshold_warning=None,
    threshold_critical=None
):
    """Track performance metric"""
    from ai_assistant.core.analytics import track_performance

    if isinstance(value, str):
        value = float(value)
    if isinstance(threshold_warning, str):
        threshold_warning = float(threshold_warning) if threshold_warning else None
    if isinstance(threshold_critical, str):
        threshold_critical = float(threshold_critical) if threshold_critical else None

    return track_performance(
        metric_name=metric_name,
        value=value,
        unit=unit,
        metric_category=metric_category,
        endpoint=endpoint,
        feature=feature,
        threshold_warning=threshold_warning,
        threshold_critical=threshold_critical
    )


@frappe.whitelist()
def analytics_get_events(event_type=None, start_date=None, end_date=None, limit=100):
    """Get events"""
    from ai_assistant.core.analytics import get_events

    if isinstance(limit, str):
        limit = int(limit)

    return get_events(
        event_type=event_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )


@frappe.whitelist()
def analytics_get_usage(metric_type=None, period_type="daily", start_date=None, end_date=None):
    """Get usage metrics"""
    from ai_assistant.core.analytics import get_usage

    return get_usage(
        metric_type=metric_type,
        period_type=period_type,
        start_date=start_date,
        end_date=end_date
    )


@frappe.whitelist()
def analytics_get_performance(metric_category=None, feature=None, start_time=None, end_time=None, limit=100):
    """Get performance metrics"""
    from ai_assistant.core.analytics import get_performance

    if isinstance(limit, str):
        limit = int(limit)

    return get_performance(
        metric_category=metric_category,
        feature=feature,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )


@frappe.whitelist()
def analytics_generate_report(report_name, report_type, period_start, period_end, scope="user", scope_id=None):
    """Generate analytics report"""
    from ai_assistant.core.analytics import generate_report

    return generate_report(
        report_name=report_name,
        report_type=report_type,
        period_start=period_start,
        period_end=period_end,
        scope=scope,
        scope_id=scope_id
    )


@frappe.whitelist()
def analytics_get_report(report_id):
    """Get cached report"""
    from ai_assistant.core.analytics import get_report
    return get_report(report_id)


@frappe.whitelist()
def analytics_list_reports(report_type=None, limit=50):
    """List all reports"""
    from ai_assistant.core.analytics import list_reports

    if isinstance(limit, str):
        limit = int(limit)

    return list_reports(report_type=report_type, limit=limit)


@frappe.whitelist()
def analytics_export_report(report_id, format="json"):
    """Export report to CSV/PDF"""
    from ai_assistant.core.analytics import export_report
    return export_report(report_id, format=format)


@frappe.whitelist()
def analytics_get_insights(category=None, severity=None, status="new", limit=10):
    """Get AI insights"""
    from ai_assistant.core.analytics import get_insights

    if isinstance(limit, str):
        limit = int(limit)

    return get_insights(
        category=category,
        severity=severity,
        status=status,
        limit=limit
    )


@frappe.whitelist()
def analytics_get_dashboard(workspace_id=None):
    """Get dashboard data"""
    from ai_assistant.core.analytics import get_dashboard
    return get_dashboard(workspace_id=workspace_id)


@frappe.whitelist()
def analytics_create_widget(
    widget_name,
    widget_type,
    data_source,
    query_config,
    display_config=None,
    chart_type=None,
    position_x=0,
    position_y=0,
    width=4,
    height=3
):
    """Create dashboard widget"""
    from ai_assistant.core.analytics import create_widget

    if isinstance(query_config, str):
        query_config = json.loads(query_config)
    if isinstance(display_config, str):
        display_config = json.loads(display_config) if display_config else None
    if isinstance(position_x, str):
        position_x = int(position_x)
    if isinstance(position_y, str):
        position_y = int(position_y)
    if isinstance(width, str):
        width = int(width)
    if isinstance(height, str):
        height = int(height)

    return create_widget(
        widget_name=widget_name,
        widget_type=widget_type,
        data_source=data_source,
        query_config=query_config,
        display_config=display_config,
        chart_type=chart_type,
        position_x=position_x,
        position_y=position_y,
        width=width,
        height=height
    )


@frappe.whitelist()
def analytics_update_widget(widget_id, updates):
    """Update dashboard widget"""
    from ai_assistant.core.analytics import update_widget

    if isinstance(updates, str):
        updates = json.loads(updates)

    return update_widget(widget_id, updates)


@frappe.whitelist()
def analytics_delete_widget(widget_id):
    """Delete dashboard widget"""
    from ai_assistant.core.analytics import delete_widget
    return delete_widget(widget_id)


@frappe.whitelist()
def analytics_get_trends(metric_type, metric_name, period_type="daily", periods=30):
    """Get trend analysis"""
    from ai_assistant.core.analytics import get_trends

    if isinstance(periods, str):
        periods = int(periods)

    return get_trends(
        metric_type=metric_type,
        metric_name=metric_name,
        period_type=period_type,
        periods=periods
    )
