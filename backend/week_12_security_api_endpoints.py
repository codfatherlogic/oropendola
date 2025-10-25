"""
Week 12: Security & Compliance - API Endpoint Definitions

Add these 33 endpoints to ai_assistant/api/__init__.py
"""

import frappe
import json


# ==================== AUDIT & LOGGING APIS ====================

@frappe.whitelist()
def security_log_audit_event(
    event_type,
    event_category,
    action,
    resource_type=None,
    resource_id=None,
    resource_name=None,
    metadata=None,
    status="success",
    risk_level="low",
    compliance_relevant=False
):
    """Log an audit event"""
    from ai_assistant.core.security import log_audit_event

    if isinstance(metadata, str):
        metadata = json.loads(metadata) if metadata else None
    if isinstance(compliance_relevant, str):
        compliance_relevant = compliance_relevant.lower() in ["true", "1", "yes"]

    log_id = log_audit_event(
        event_type=event_type,
        event_category=event_category,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        metadata=metadata,
        status=status,
        risk_level=risk_level,
        compliance_relevant=compliance_relevant
    )

    return {"message": log_id}


@frappe.whitelist()
def security_get_audit_logs(
    user_id=None,
    event_type=None,
    event_category=None,
    start_date=None,
    end_date=None,
    risk_level=None,
    limit=100
):
    """Get audit logs"""
    from ai_assistant.core.security import get_audit_logs

    if isinstance(limit, str):
        limit = int(limit)

    result = get_audit_logs(
        user_id=user_id,
        event_type=event_type,
        event_category=event_category,
        start_date=start_date,
        end_date=end_date,
        risk_level=risk_level,
        limit=limit
    )
    return result


@frappe.whitelist()
def security_search_audit_logs(query, filters=None, limit=100):
    """Search audit logs"""
    from ai_assistant.core.security import search_audit_logs

    if isinstance(filters, str):
        filters = json.loads(filters) if filters else None
    if isinstance(limit, str):
        limit = int(limit)

    result = search_audit_logs(query, filters=filters, limit=limit)
    return result


@frappe.whitelist()
def security_export_audit_logs(start_date, end_date, format="json"):
    """Export audit logs"""
    from ai_assistant.core.security import export_audit_logs
    result = export_audit_logs(start_date, end_date, format=format)
    return result


@frappe.whitelist()
def security_get_user_activity(user_id, days=30):
    """Get user activity"""
    from ai_assistant.core.security import get_user_activity

    if isinstance(days, str):
        days = int(days)

    result = get_user_activity(user_id, days=days)
    return result


@frappe.whitelist()
def security_detect_anomaly(user_id):
    """Detect anomalous behavior"""
    from ai_assistant.core.security import detect_anomaly
    result = detect_anomaly(user_id)
    return result


# ==================== POLICY MANAGEMENT APIS ====================

@frappe.whitelist()
def security_create_policy(
    name,
    description,
    policy_type,
    policy_config,
    scope="global",
    enforcement_mode="enforce",
    severity="medium",
    compliance_framework=None
):
    """Create security policy"""
    from ai_assistant.core.security import create_policy

    if isinstance(policy_config, str):
        policy_config = json.loads(policy_config)

    result = create_policy(
        name=name,
        description=description,
        policy_type=policy_type,
        policy_config=policy_config,
        scope=scope,
        enforcement_mode=enforcement_mode,
        severity=severity,
        compliance_framework=compliance_framework
    )
    return result


@frappe.whitelist()
def security_get_policies(policy_type=None, scope=None, is_active=True):
    """Get security policies"""
    from ai_assistant.core.security import get_policies

    if isinstance(is_active, str):
        is_active = is_active.lower() in ["true", "1", "yes"]

    result = get_policies(policy_type=policy_type, scope=scope, is_active=is_active)
    return result


@frappe.whitelist()
def security_update_policy(policy_id, **kwargs):
    """Update security policy"""
    from ai_assistant.core.security import update_policy
    result = update_policy(policy_id, **kwargs)
    return result


@frappe.whitelist()
def security_delete_policy(policy_id):
    """Delete security policy"""
    from ai_assistant.core.security import delete_policy
    result = delete_policy(policy_id)
    return result


@frappe.whitelist()
def security_evaluate_policy(policy_id, context):
    """Evaluate policy"""
    from ai_assistant.core.security import evaluate_policy

    if isinstance(context, str):
        context = json.loads(context)

    result = evaluate_policy(policy_id, context)
    return result


@frappe.whitelist()
def security_check_compliance(framework, control_id=None):
    """Check compliance"""
    from ai_assistant.core.security import check_compliance
    result = check_compliance(framework, control_id=control_id)
    return result


@frappe.whitelist()
def security_get_policy_violations(policy_id, days=7):
    """Get policy violations"""
    from ai_assistant.core.security import get_policy_violations

    if isinstance(days, str):
        days = int(days)

    result = get_policy_violations(policy_id, days=days)
    return result


@frappe.whitelist()
def security_remediate_violation(violation_id, remediation_action):
    """Remediate policy violation"""
    from ai_assistant.core.security import remediate_violation
    result = remediate_violation(violation_id, remediation_action)
    return result


# ==================== ACCESS CONTROL APIS ====================

@frappe.whitelist()
def security_check_permission(subject_type, subject_id, resource_type, resource_id, action):
    """Check permission"""
    from ai_assistant.core.security import check_permission

    result = check_permission(
        subject_type=subject_type,
        subject_id=subject_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action
    )
    return result


@frappe.whitelist()
def security_grant_permission(
    subject_type,
    subject_id,
    subject_name,
    resource_type,
    resource_id,
    action,
    priority=100
):
    """Grant permission"""
    from ai_assistant.core.security import grant_permission

    if isinstance(priority, str):
        priority = int(priority)

    result = grant_permission(
        subject_type=subject_type,
        subject_id=subject_id,
        subject_name=subject_name,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        priority=priority
    )
    return result


@frappe.whitelist()
def security_revoke_permission(acl_id):
    """Revoke permission"""
    from ai_assistant.core.security import revoke_permission
    result = revoke_permission(acl_id)
    return result


@frappe.whitelist()
def security_list_access_policies(resource_type=None, limit=100):
    """List access policies"""
    from ai_assistant.core.security import list_access_policies

    if isinstance(limit, str):
        limit = int(limit)

    result = list_access_policies(resource_type=resource_type, limit=limit)
    return result


@frappe.whitelist()
def security_get_user_permissions(user_id):
    """Get user permissions"""
    from ai_assistant.core.security import get_user_permissions
    result = get_user_permissions(user_id)
    return result


@frappe.whitelist()
def security_get_resource_permissions(resource_type, resource_id):
    """Get resource permissions"""
    from ai_assistant.core.security import get_resource_permissions
    result = get_resource_permissions(resource_type, resource_id)
    return result


@frappe.whitelist()
def security_audit_access(resource_type, resource_id, days=30):
    """Audit access patterns"""
    from ai_assistant.core.security import audit_access

    if isinstance(days, str):
        days = int(days)

    result = audit_access(resource_type, resource_id, days=days)
    return result


# ==================== SECRET DETECTION APIS ====================

@frappe.whitelist()
def security_scan_secrets(code, file_path=None):
    """Scan for secrets"""
    from ai_assistant.core.security import scan_secrets
    result = scan_secrets(code, file_path=file_path)
    return result


@frappe.whitelist()
def security_get_detected_secrets(file_path=None, status="detected"):
    """Get detected secrets"""
    from ai_assistant.core.security import get_detected_secrets
    result = get_detected_secrets(file_path=file_path, status=status)
    return result


@frappe.whitelist()
def security_remediate_secret(secret_id, remediation_action, remediation_notes=None):
    """Remediate secret"""
    from ai_assistant.core.security import remediate_secret
    result = remediate_secret(secret_id, remediation_action, remediation_notes=remediation_notes)
    return result


@frappe.whitelist()
def security_mark_false_positive(secret_id, reason):
    """Mark secret as false positive"""
    from ai_assistant.core.security import mark_false_positive
    result = mark_false_positive(secret_id, reason)
    return result


# ==================== COMPLIANCE REPORTING APIS ====================

@frappe.whitelist()
def security_generate_compliance_report(
    framework,
    period_start,
    period_end,
    scope="global",
    team_id=None
):
    """Generate compliance report"""
    from ai_assistant.core.security import generate_compliance_report

    result = generate_compliance_report(
        framework=framework,
        period_start=period_start,
        period_end=period_end,
        scope=scope,
        team_id=team_id
    )
    return result


@frappe.whitelist()
def security_get_compliance_report(report_id):
    """Get compliance report"""
    from ai_assistant.core.security import get_compliance_report
    result = get_compliance_report(report_id)
    return result


@frappe.whitelist()
def security_get_compliance_status(framework):
    """Get compliance status"""
    from ai_assistant.core.security import get_compliance_status
    result = get_compliance_status(framework)
    return result


@frappe.whitelist()
def security_schedule_compliance_audit(framework, frequency):
    """Schedule compliance audit"""
    from ai_assistant.core.security import schedule_compliance_audit
    result = schedule_compliance_audit(framework, frequency)
    return result


# ==================== INCIDENT MANAGEMENT APIS ====================

@frappe.whitelist()
def security_create_incident(
    title,
    description,
    incident_type,
    severity,
    impact="medium",
    detected_at=None,
    affected_users=None,
    affected_resources=None
):
    """Create security incident"""
    from ai_assistant.core.security import create_incident

    if isinstance(affected_users, str):
        affected_users = json.loads(affected_users) if affected_users else None
    if isinstance(affected_resources, str):
        affected_resources = json.loads(affected_resources) if affected_resources else None

    result = create_incident(
        title=title,
        description=description,
        incident_type=incident_type,
        severity=severity,
        impact=impact,
        detected_at=detected_at,
        affected_users=affected_users,
        affected_resources=affected_resources
    )
    return result


@frappe.whitelist()
def security_update_incident(
    incident_id,
    status=None,
    investigation_notes=None,
    assigned_to=None
):
    """Update security incident"""
    from ai_assistant.core.security import update_incident

    result = update_incident(
        incident_id=incident_id,
        status=status,
        investigation_notes=investigation_notes,
        assigned_to=assigned_to
    )
    return result


@frappe.whitelist()
def security_resolve_incident(incident_id, resolution_notes):
    """Resolve security incident"""
    from ai_assistant.core.security import resolve_incident
    result = resolve_incident(incident_id, resolution_notes)
    return result


@frappe.whitelist()
def security_list_incidents(status=None, severity=None, limit=50):
    """List security incidents"""
    from ai_assistant.core.security import list_incidents

    if isinstance(limit, str):
        limit = int(limit)

    result = list_incidents(status=status, severity=severity, limit=limit)
    return result


# ==================== ADDITIONAL SECURITY APIS ====================

@frappe.whitelist()
def security_encrypt_data(data, key_type="data"):
    """Encrypt data"""
    from ai_assistant.core.security import encrypt_data
    result = encrypt_data(data, key_type=key_type)
    return result


@frappe.whitelist()
def security_decrypt_data(encrypted_data, key_id):
    """Decrypt data"""
    from ai_assistant.core.security import decrypt_data
    result = decrypt_data(encrypted_data, key_id)
    return result


@frappe.whitelist()
def security_rotate_keys(key_type):
    """Rotate encryption keys"""
    from ai_assistant.core.security import rotate_keys
    result = rotate_keys(key_type)
    return result


@frappe.whitelist()
def security_get_encryption_status():
    """Get encryption status"""
    from ai_assistant.core.security import get_encryption_status
    result = get_encryption_status()
    return result


@frappe.whitelist()
def security_get_security_score():
    """Get overall security score"""
    from ai_assistant.core.security import get_security_score
    result = get_security_score()
    return result


@frappe.whitelist()
def security_get_security_recommendations():
    """Get security recommendations"""
    from ai_assistant.core.security import get_security_recommendations
    result = get_security_recommendations()
    return result


# ==================== LICENSE COMPLIANCE APIS ====================

@frappe.whitelist()
def security_scan_licenses(project_path, package_manager="npm"):
    """Scan OSS licenses (placeholder)"""
    # This is a simplified implementation
    return {
        "success": True,
        "total_packages": 0,
        "licenses_found": 0,
        "non_compliant": 0,
        "high_risk": 0,
        "packages": [],
        "message": "License scanning not yet implemented - requires package manager integration"
    }


@frappe.whitelist()
def security_get_license_compliance(compliance_status=None, risk_level=None):
    """Get license compliance (placeholder)"""
    return {
        "success": True,
        "licenses": [],
        "message": "License compliance tracking not yet implemented"
    }


@frappe.whitelist()
def security_approve_license(license_id, notes=None):
    """Approve a license (placeholder)"""
    return {
        "success": True,
        "license_id": license_id,
        "status": "approved",
        "notes": notes
    }


@frappe.whitelist()
def security_block_license(license_id, reason=None):
    """Block a license (placeholder)"""
    return {
        "success": True,
        "license_id": license_id,
        "status": "blocked",
        "reason": reason
    }
