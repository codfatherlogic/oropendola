# Week 12 Security APIs - Frontend Integration Guide

**Version:** 1.0
**Base URL:** `https://oropendola.ai`
**Authentication:** Required (Frappe Session/API Key)
**Content-Type:** `application/json` or `application/x-www-form-urlencoded`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Audit Logging APIs](#audit-logging-apis)
3. [Security Policy APIs](#security-policy-apis)
4. [Access Control APIs](#access-control-apis)
5. [Compliance Reporting APIs](#compliance-reporting-apis)
6. [Encryption Management APIs](#encryption-management-apis)
7. [Secret Detection APIs](#secret-detection-apis)
8. [License Compliance APIs](#license-compliance-apis)
9. [Incident Management APIs](#incident-management-apis)
10. [Error Handling](#error-handling)
11. [TypeScript Types](#typescript-types)
12. [React Example Components](#react-example-components)

---

## Authentication

All API endpoints require authentication. Include credentials in requests:

```javascript
// Using fetch with credentials
fetch('https://oropendola.ai/api/method/ai_assistant.api.security_log_audit_event', {
  method: 'POST',
  credentials: 'include', // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': getCookie('csrf_token') // Get from cookie
  },
  body: JSON.stringify({
    event_type: 'create',
    event_category: 'security',
    action: 'user_login'
  })
});
```

**OR using API Key:**

```javascript
headers: {
  'Authorization': `token ${API_KEY}:${API_SECRET}`
}
```

---

## 1. Audit Logging APIs

Track all user actions and security events for compliance.

### 1.1 Log Audit Event

**Endpoint:** `POST /api/method/ai_assistant.api.security_log_audit_event`

**Purpose:** Create an audit log entry for any security-relevant action.

**Request Body:**
```json
{
  "event_type": "create",           // create, read, update, delete, login, logout, permission_change
  "event_category": "security",     // document, code, security, admin, data
  "action": "user_login",           // Specific action description
  "resource_type": "user",          // Optional: Type of resource affected
  "resource_id": "USR-001",         // Optional: Resource identifier
  "resource_name": "John Doe",      // Optional: Resource name
  "metadata": {                     // Optional: Additional context
    "ip_address": "192.168.1.100",
    "browser": "Chrome"
  },
  "status": "success",              // success, failure, blocked
  "risk_level": "low",              // low, medium, high, critical
  "compliance_relevant": true       // Boolean: Is this compliance-relevant?
}
```

**Response:**
```json
{
  "message": "AUD-20251025-00001"   // Audit log ID
}
```

**JavaScript Example:**
```javascript
async function logAuditEvent(eventData) {
  const response = await fetch('/api/method/ai_assistant.api.security_log_audit_event', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': getCookie('csrf_token')
    },
    body: JSON.stringify(eventData)
  });

  const result = await response.json();
  return result.message; // Returns audit log ID
}

// Usage
const auditId = await logAuditEvent({
  event_type: 'update',
  event_category: 'document',
  action: 'update_user_profile',
  resource_type: 'user',
  resource_id: 'USR-123',
  status: 'success',
  risk_level: 'low',
  compliance_relevant: true
});
```

---

### 1.2 Get Audit Logs

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_audit_logs`

**Purpose:** Retrieve audit logs with optional filters.

**Request Body:**
```json
{
  "user_id": "user@example.com",    // Optional: Filter by user
  "event_type": "create",            // Optional: Filter by event type
  "event_category": "security",      // Optional: Filter by category
  "start_date": "2025-10-01",       // Optional: Start date (YYYY-MM-DD)
  "end_date": "2025-10-31",         // Optional: End date
  "risk_level": "high",              // Optional: Filter by risk level
  "limit": 50                        // Optional: Max results (default: 100)
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "AUD-20251025-00001",
      "user_id": "user@example.com",
      "event_type": "create",
      "event_category": "security",
      "action": "create_policy",
      "resource_type": "policy",
      "status": "success",
      "risk_level": "medium",
      "compliance_relevant": 1,
      "creation": "2025-10-25 10:30:00",
      "metadata": {
        "policy_id": "POL-001"
      }
    }
  ]
}
```

**React Hook Example:**
```javascript
import { useState, useEffect } from 'react';

function useAuditLogs(filters) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const response = await fetch('/api/method/ai_assistant.api.security_get_audit_logs', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify(filters)
      });

      const data = await response.json();
      setLogs(data.message || []);
      setLoading(false);
    }

    fetchLogs();
  }, [filters]);

  return { logs, loading };
}

// Usage in component
function AuditLogViewer() {
  const { logs, loading } = useAuditLogs({
    risk_level: 'high',
    limit: 20
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {logs.map(log => (
        <div key={log.name}>
          <h3>{log.action}</h3>
          <p>User: {log.user_id}</p>
          <p>Time: {log.creation}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 1.3 Search Audit Logs

**Endpoint:** `POST /api/method/ai_assistant.api.security_search_audit_logs`

**Purpose:** Full-text search across audit logs.

**Request Body:**
```json
{
  "query": "login",                  // Search term
  "filters": {                       // Optional additional filters
    "user_id": "user@example.com",
    "risk_level": "high"
  },
  "limit": 100
}
```

**Response:** Same format as Get Audit Logs

---

### 1.4 Export Audit Logs

**Endpoint:** `POST /api/method/ai_assistant.api.security_export_audit_logs`

**Purpose:** Export audit logs for compliance reporting.

**Request Body:**
```json
{
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "format": "json"                   // json or csv
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "export_format": "json",
    "period_start": "2025-10-01",
    "period_end": "2025-10-31",
    "total_logs": 1543,
    "logs": [...]                    // Full log data
  }
}
```

---

## 2. Security Policy APIs

Manage security policies and enforcement rules.

### 2.1 Create Security Policy

**Endpoint:** `POST /api/method/ai_assistant.api.security_create_policy`

**Request Body:**
```json
{
  "name": "Password Complexity Policy",
  "description": "Enforce strong password requirements",
  "policy_type": "authentication",   // access_control, data_protection, authentication, compliance
  "policy_config": {                 // JSON object with policy rules
    "min_length": 12,
    "require_uppercase": true,
    "require_numbers": true,
    "require_special_chars": true
  },
  "scope": "global",                 // global, team, workspace, user
  "enforcement_mode": "enforce",     // enforce, audit, disabled
  "severity": "medium",              // low, medium, high, critical
  "compliance_framework": "SOC2"     // Optional: SOC2, GDPR, HIPAA, ISO27001
}
```

**Response:**
```json
{
  "message": "POL-2025-00001"        // Policy ID
}
```

**JavaScript Example:**
```javascript
async function createSecurityPolicy(policyData) {
  const response = await fetch('/api/method/ai_assistant.api.security_create_policy', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': getCookie('csrf_token')
    },
    body: JSON.stringify(policyData)
  });

  const result = await response.json();
  return result.message;
}

// Usage
const policyId = await createSecurityPolicy({
  name: 'MFA Required',
  description: 'Require multi-factor authentication for all users',
  policy_type: 'authentication',
  policy_config: {
    require_mfa: true,
    allowed_methods: ['totp', 'sms']
  },
  scope: 'global',
  enforcement_mode: 'enforce',
  severity: 'high'
});
```

---

### 2.2 Get Security Policies

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_policies`

**Request Body:**
```json
{
  "policy_type": "authentication",   // Optional filter
  "scope": "global",                 // Optional filter
  "is_active": true                  // Optional: only active policies
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "POL-2025-00001",
      "policy_name": "Password Complexity Policy",
      "description": "Enforce strong passwords",
      "policy_type": "authentication",
      "scope": "global",
      "enforcement_mode": "enforce",
      "severity": "medium",
      "is_active": 1,
      "policy_config": {
        "min_length": 12,
        "require_uppercase": true
      },
      "creation": "2025-10-25 10:00:00"
    }
  ]
}
```

---

### 2.3 Update Security Policy

**Endpoint:** `POST /api/method/ai_assistant.api.security_update_policy`

**Request Body:**
```json
{
  "policy_id": "POL-2025-00001",
  "severity": "high",                // Field to update
  "enforcement_mode": "audit"        // Another field to update
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "policy_id": "POL-2025-00001"
  }
}
```

---

### 2.4 Delete Security Policy

**Endpoint:** `POST /api/method/ai_assistant.api.security_delete_policy`

**Request Body:**
```json
{
  "policy_id": "POL-2025-00001"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "message": "Policy deleted successfully"
  }
}
```

---

### 2.5 Evaluate Policy

**Endpoint:** `POST /api/method/ai_assistant.api.security_evaluate_policy`

**Purpose:** Check if an action complies with a policy.

**Request Body:**
```json
{
  "policy_id": "POL-2025-00001",
  "context": {                       // Context for evaluation
    "user_id": "user@example.com",
    "action": "login",
    "password_length": 8
  }
}
```

**Response:**
```json
{
  "message": {
    "allowed": false,
    "reason": "Password does not meet minimum length requirement",
    "policy": "POL-2025-00001",
    "enforcement_mode": "enforce"
  }
}
```

---

## 3. Access Control APIs

Manage fine-grained permissions (RBAC).

### 3.1 Check Permission

**Endpoint:** `POST /api/method/ai_assistant.api.security_check_permission`

**Purpose:** Verify if a user has permission for an action.

**Request Body:**
```json
{
  "subject_type": "user",            // user, role, team, api_key
  "subject_id": "user@example.com",
  "resource_type": "document",       // document, conversation, code, workspace, api
  "resource_id": "DOC-001",
  "action": "read"                   // read, write, delete, execute, admin
}
```

**Response:**
```json
{
  "message": {
    "allowed": true,
    "reason": "Access granted by ACL rule",
    "acl_id": "ACL-2025-00001",
    "permission": "allow"
  }
}
```

**React Permission Hook:**
```javascript
function usePermission(resourceType, resourceId, action) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPerm() {
      const response = await fetch('/api/method/ai_assistant.api.security_check_permission', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({
          subject_type: 'user',
          subject_id: getCurrentUserId(),
          resource_type: resourceType,
          resource_id: resourceId,
          action: action
        })
      });

      const data = await response.json();
      setAllowed(data.message.allowed);
      setLoading(false);
    }

    checkPerm();
  }, [resourceType, resourceId, action]);

  return { allowed, loading };
}

// Usage
function DocumentActions({ docId }) {
  const { allowed: canEdit } = usePermission('document', docId, 'write');
  const { allowed: canDelete } = usePermission('document', docId, 'delete');

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

---

### 3.2 Grant Permission

**Endpoint:** `POST /api/method/ai_assistant.api.security_grant_permission`

**Purpose:** Grant a permission to a user/role.

**Request Body:**
```json
{
  "subject_type": "user",
  "subject_id": "user@example.com",
  "subject_name": "John Doe",
  "resource_type": "document",
  "resource_id": "DOC-001",
  "action": "write",
  "priority": 100                    // Optional: Priority for conflict resolution
}
```

**Response:**
```json
{
  "message": "ACL-2025-00001"        // Access control rule ID
}
```

---

### 3.3 Revoke Permission

**Endpoint:** `POST /api/method/ai_assistant.api.security_revoke_permission`

**Request Body:**
```json
{
  "acl_id": "ACL-2025-00001"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "message": "Permission revoked"
  }
}
```

---

### 3.4 Get User Permissions

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_user_permissions`

**Purpose:** Get all permissions for a user.

**Request Body:**
```json
{
  "user_id": "user@example.com"
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "ACL-2025-00001",
      "resource_type": "document",
      "resource_id": "DOC-001",
      "action": "write",
      "permission": "allow",
      "priority": 100,
      "creation": "2025-10-25 10:00:00"
    }
  ]
}
```

---

### 3.5 Get Resource Permissions

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_resource_permissions`

**Purpose:** Get all permissions for a specific resource.

**Request Body:**
```json
{
  "resource_type": "document",
  "resource_id": "DOC-001"
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "ACL-2025-00001",
      "subject_type": "user",
      "subject_id": "user@example.com",
      "subject_name": "John Doe",
      "action": "write",
      "permission": "allow",
      "priority": 100
    }
  ]
}
```

---

## 4. Compliance Reporting APIs

Generate compliance reports for SOC2, GDPR, HIPAA, ISO27001.

### 4.1 Generate Compliance Report

**Endpoint:** `POST /api/method/ai_assistant.api.security_generate_compliance_report`

**Request Body:**
```json
{
  "framework": "SOC2",               // SOC2, GDPR, HIPAA, ISO27001, PCI-DSS
  "period_start": "2025-10-01",
  "period_end": "2025-10-31",
  "scope": "global",                 // global, team, workspace
  "team_id": null                    // Optional: if scope is team
}
```

**Response:**
```json
{
  "message": "RPT-202510-00001"      // Report ID
}
```

---

### 4.2 Get Compliance Report

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_compliance_report`

**Request Body:**
```json
{
  "report_id": "RPT-202510-00001"
}
```

**Response:**
```json
{
  "message": {
    "name": "RPT-202510-00001",
    "framework": "SOC2",
    "period_start": "2025-10-01",
    "period_end": "2025-10-31",
    "compliance_score": 95.5,
    "total_controls": 100,
    "compliant_controls": 95,
    "non_compliant_controls": 5,
    "status": "completed",
    "summary": {
      "audit_logs": 1543,
      "active_policies": 12
    }
  }
}
```

---

### 4.3 Get Compliance Status

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_compliance_status`

**Purpose:** Get current compliance status for a framework.

**Request Body:**
```json
{
  "framework": "SOC2"
}
```

**Response:**
```json
{
  "message": {
    "framework": "SOC2",
    "compliant": true,
    "score": 95.5,
    "last_assessment": "2025-10-25",
    "findings": {
      "critical": 0,
      "high": 2,
      "medium": 3,
      "low": 5
    }
  }
}
```

---

### 4.4 Check Compliance Control

**Endpoint:** `POST /api/method/ai_assistant.api.security_check_compliance`

**Request Body:**
```json
{
  "framework": "SOC2",
  "control_id": "CC6.1"              // Specific control to check
}
```

**Response:**
```json
{
  "message": {
    "control_id": "CC6.1",
    "compliant": true,
    "evidence": [...],
    "last_checked": "2025-10-25"
  }
}
```

---

## 5. Encryption Management APIs

Manage encryption keys and encrypt/decrypt data.

### 5.1 Encrypt Data

**Endpoint:** `POST /api/method/ai_assistant.api.security_encrypt_data`

**Request Body:**
```json
{
  "data": "sensitive information",
  "key_type": "data"                 // data, session, backup
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "encrypted_data": "base64_encrypted_string",
    "key_id": "KEY-2025-00001",
    "algorithm": "AES-256-GCM"
  }
}
```

---

### 5.2 Decrypt Data

**Endpoint:** `POST /api/method/ai_assistant.api.security_decrypt_data`

**Request Body:**
```json
{
  "encrypted_data": "base64_encrypted_string",
  "key_id": "KEY-2025-00001"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "decrypted_data": "sensitive information"
  }
}
```

---

### 5.3 Rotate Encryption Keys

**Endpoint:** `POST /api/method/ai_assistant.api.security_rotate_keys`

**Request Body:**
```json
{
  "key_type": "data"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "old_key_id": "KEY-2025-00001",
    "new_key_id": "KEY-2025-00002",
    "rotated_at": "2025-10-25 10:00:00"
  }
}
```

---

### 5.4 Get Encryption Status

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_encryption_status`

**Request Body:** `{}` (empty)

**Response:**
```json
{
  "message": {
    "total_keys": 3,
    "active_keys": 2,
    "keys_needing_rotation": 1,
    "algorithm": "AES-256-GCM",
    "keys": [
      {
        "key_id": "KEY-2025-00001",
        "key_type": "data",
        "status": "active",
        "next_rotation": "2025-11-25"
      }
    ]
  }
}
```

---

## 6. Secret Detection APIs

Scan code for hardcoded secrets and credentials.

### 6.1 Scan for Secrets

**Endpoint:** `POST /api/method/ai_assistant.api.security_scan_secrets`

**Request Body:**
```json
{
  "code": "const API_KEY = 'sk_live_123456789';\nconst password = 'admin123';",
  "file_path": "/src/config.js"     // Optional
}
```

**Response:**
```json
{
  "message": {
    "secrets_found": 2,
    "secrets": [
      {
        "secret_id": "SEC-20251025-00001",
        "secret_type": "api_key",
        "line_number": 1,
        "severity": "high",
        "confidence": "high",
        "pattern": "Stripe API Key"
      },
      {
        "secret_id": "SEC-20251025-00002",
        "secret_type": "password",
        "line_number": 2,
        "severity": "critical",
        "confidence": "medium"
      }
    ]
  }
}
```

---

### 6.2 Get Detected Secrets

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_detected_secrets`

**Request Body:**
```json
{
  "file_path": "/src/config.js",    // Optional filter
  "status": "detected"               // Optional: detected, confirmed, remediated
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "SEC-20251025-00001",
      "file_path": "/src/config.js",
      "line_number": 1,
      "secret_type": "api_key",
      "severity": "high",
      "status": "detected",
      "is_remediated": 0
    }
  ]
}
```

---

### 6.3 Remediate Secret

**Endpoint:** `POST /api/method/ai_assistant.api.security_remediate_secret`

**Request Body:**
```json
{
  "secret_id": "SEC-20251025-00001",
  "remediation_action": "moved_to_env",  // removed, moved_to_env, rotated
  "remediation_notes": "Moved to environment variables"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "secret_id": "SEC-20251025-00001",
    "status": "remediated"
  }
}
```

---

### 6.4 Mark False Positive

**Endpoint:** `POST /api/method/ai_assistant.api.security_mark_false_positive`

**Request Body:**
```json
{
  "secret_id": "SEC-20251025-00001",
  "reason": "This is a test API key, not a real secret"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "secret_id": "SEC-20251025-00001",
    "status": "false_positive"
  }
}
```

---

## 7. License Compliance APIs

Track open-source license compliance.

### 7.1 Scan Licenses

**Endpoint:** `POST /api/method/ai_assistant.api.security_scan_licenses`

**Request Body:**
```json
{
  "project_path": "/workspace/myproject",
  "package_manager": "npm"           // npm, pip, maven, composer
}
```

**Response:**
```json
{
  "message": {
    "total_packages": 150,
    "licenses_found": 145,
    "non_compliant": 5,
    "high_risk": 2,
    "packages": [
      {
        "license_id": "LIC-2025-00001",
        "package_name": "some-package",
        "package_version": "1.0.0",
        "license_name": "GPL-3.0",
        "risk_level": "high",
        "compliance_status": "non_compliant"
      }
    ]
  }
}
```

---

### 7.2 Get License Compliance

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_license_compliance`

**Request Body:**
```json
{
  "compliance_status": "non_compliant",  // Optional filter
  "risk_level": "high"                   // Optional filter
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "LIC-2025-00001",
      "package_name": "some-package",
      "package_version": "1.0.0",
      "license_name": "GPL-3.0",
      "license_type": "copyleft",
      "risk_level": "high",
      "compliance_status": "non_compliant",
      "is_approved": 0,
      "is_blocked": 1
    }
  ]
}
```

---

### 7.3 Approve License

**Endpoint:** `POST /api/method/ai_assistant.api.security_approve_license`

**Request Body:**
```json
{
  "license_id": "LIC-2025-00001",
  "notes": "Approved after legal review"
}
```

---

### 7.4 Block License

**Endpoint:** `POST /api/method/ai_assistant.api.security_block_license`

**Request Body:**
```json
{
  "license_id": "LIC-2025-00001",
  "reason": "Incompatible with our license policy"
}
```

---

## 8. Incident Management APIs

Track and respond to security incidents.

### 8.1 Create Security Incident

**Endpoint:** `POST /api/method/ai_assistant.api.security_create_incident`

**Request Body:**
```json
{
  "title": "Unauthorized Access Attempt",
  "description": "Multiple failed login attempts from suspicious IP",
  "incident_type": "unauthorized_access",  // data_breach, unauthorized_access, malware, phishing, ddos
  "severity": "high",                      // low, medium, high, critical
  "impact": "medium",
  "detected_at": "2025-10-25T10:00:00",
  "affected_users": ["user1@example.com", "user2@example.com"],
  "affected_resources": ["Server-01", "Database-A"]
}
```

**Response:**
```json
{
  "message": "INC-2025-0001"         // Incident ID
}
```

---

### 8.2 Update Security Incident

**Endpoint:** `POST /api/method/ai_assistant.api.security_update_incident`

**Request Body:**
```json
{
  "incident_id": "INC-2025-0001",
  "status": "investigating",         // new, investigating, contained, remediated, closed
  "investigation_notes": "Identified source IP and blocked",
  "assigned_to": "security@example.com"
}
```

**Response:**
```json
{
  "message": {
    "success": true,
    "incident_id": "INC-2025-0001"
  }
}
```

---

### 8.3 Get Security Incidents

**Endpoint:** `POST /api/method/ai_assistant.api.security_get_incidents`

**Request Body:**
```json
{
  "status": "investigating",         // Optional filter
  "severity": "high",                // Optional filter
  "limit": 50
}
```

**Response:**
```json
{
  "message": [
    {
      "name": "INC-2025-0001",
      "incident_number": "INC-2025-0001",
      "title": "Unauthorized Access Attempt",
      "incident_type": "unauthorized_access",
      "severity": "high",
      "status": "investigating",
      "detected_at": "2025-10-25 10:00:00",
      "assigned_to": "security@example.com"
    }
  ]
}
```

---

## 9. Error Handling

All APIs return errors in a consistent format:

**Error Response:**
```json
{
  "exc": "Error details...",
  "exc_type": "ValidationError",
  "_server_messages": "[{\"message\": \"Error occurred\"}]"
}
```

**JavaScript Error Handler:**
```javascript
async function callSecurityAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': getCookie('csrf_token')
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    // Check for Frappe errors
    if (result.exc || result._server_messages) {
      const errorMsg = result._server_messages
        ? JSON.parse(result._server_messages)[0].message
        : result.exc;
      throw new Error(errorMsg);
    }

    return result.message;

  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## 10. TypeScript Types

```typescript
// Audit Log Types
interface AuditEvent {
  event_type: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'permission_change';
  event_category: 'document' | 'code' | 'security' | 'admin' | 'data';
  action: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure' | 'blocked';
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  compliance_relevant?: boolean;
}

interface AuditLog {
  name: string;
  user_id: string;
  event_type: string;
  event_category: string;
  action: string;
  status: string;
  risk_level: string;
  compliance_relevant: number;
  creation: string;
  metadata?: Record<string, any>;
}

// Security Policy Types
interface SecurityPolicy {
  name?: string;
  description?: string;
  policy_type: 'access_control' | 'data_protection' | 'authentication' | 'compliance';
  policy_config: Record<string, any>;
  scope?: 'global' | 'team' | 'workspace' | 'user';
  enforcement_mode?: 'enforce' | 'audit' | 'disabled';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  compliance_framework?: 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001';
}

// Access Control Types
interface Permission {
  subject_type: 'user' | 'role' | 'team' | 'api_key';
  subject_id: string;
  subject_name?: string;
  resource_type: 'document' | 'conversation' | 'code' | 'workspace' | 'api';
  resource_id?: string;
  action: 'read' | 'write' | 'delete' | 'execute' | 'admin';
  priority?: number;
}

interface PermissionCheck {
  allowed: boolean;
  reason: string;
  acl_id?: string;
  permission?: string;
}

// Compliance Types
interface ComplianceReport {
  name: string;
  framework: string;
  period_start: string;
  period_end: string;
  compliance_score: number;
  total_controls: number;
  compliant_controls: number;
  non_compliant_controls: number;
  status: string;
  summary: Record<string, any>;
}

// Secret Detection Types
interface DetectedSecret {
  name: string;
  file_path: string;
  line_number: number;
  secret_type: string;
  severity: string;
  confidence: string;
  status: 'detected' | 'confirmed' | 'false_positive' | 'remediated';
  is_remediated: number;
}

// License Compliance Types
interface LicenseCompliance {
  name: string;
  package_name: string;
  package_version: string;
  license_name: string;
  license_type: string;
  risk_level: string;
  compliance_status: string;
  is_approved: number;
  is_blocked: number;
}

// Security Incident Types
interface SecurityIncident {
  title: string;
  description?: string;
  incident_type: 'data_breach' | 'unauthorized_access' | 'malware' | 'phishing' | 'ddos';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  affected_users?: string[];
  affected_resources?: string[];
}
```

---

## 11. React Example Components

### Complete Audit Log Viewer Component

```jsx
import React, { useState, useEffect } from 'react';

function AuditLogDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    risk_level: '',
    event_type: '',
    limit: 50
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  async function fetchAuditLogs() {
    setLoading(true);
    try {
      const response = await fetch('/api/method/ai_assistant.api.security_get_audit_logs', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify(filters)
      });

      const data = await response.json();
      setLogs(data.message || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRiskLevelColor = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4">Loading audit logs...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Log Dashboard</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          className="border rounded px-3 py-2"
          value={filters.risk_level}
          onChange={(e) => setFilters({...filters, risk_level: e.target.value})}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={filters.event_type}
          onChange={(e) => setFilters({...filters, event_type: e.target.value})}
        >
          <option value="">All Event Types</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.action}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.user_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskLevelColor(log.risk_level)}`}>
                    {log.risk_level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.creation).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogDashboard;
```

---

### Permission-Gated Component

```jsx
import React, { useState, useEffect } from 'react';

function PermissionGate({ children, resourceType, resourceId, action, fallback = null }) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, [resourceType, resourceId, action]);

  async function checkPermission() {
    try {
      const response = await fetch('/api/method/ai_assistant.api.security_check_permission', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({
          subject_type: 'user',
          subject_id: getCurrentUserId(),
          resource_type: resourceType,
          resource_id: resourceId,
          action: action
        })
      });

      const data = await response.json();
      setAllowed(data.message.allowed);
    } catch (error) {
      console.error('Permission check failed:', error);
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Checking permissions...</div>;
  if (!allowed) return fallback;

  return <>{children}</>;
}

// Usage
function DocumentEditor({ documentId }) {
  return (
    <div>
      <PermissionGate
        resourceType="document"
        resourceId={documentId}
        action="write"
        fallback={<div>You don't have permission to edit this document</div>}
      >
        <button>Edit Document</button>
      </PermissionGate>

      <PermissionGate
        resourceType="document"
        resourceId={documentId}
        action="delete"
        fallback={null}
      >
        <button>Delete Document</button>
      </PermissionGate>
    </div>
  );
}

export default PermissionGate;
```

---

### Security Policy Manager Component

```jsx
import React, { useState, useEffect } from 'react';

function SecurityPolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const response = await fetch('/api/method/ai_assistant.api.security_get_policies', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      setPolicies(data.message || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createPolicy(policyData) {
    try {
      const response = await fetch('/api/method/ai_assistant.api.security_create_policy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify(policyData)
      });

      const data = await response.json();
      console.log('Policy created:', data.message);
      fetchPolicies(); // Refresh list
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  }

  async function deletePolicy(policyId) {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      await fetch('/api/method/ai_assistant.api.security_delete_policy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': getCookie('csrf_token')
        },
        body: JSON.stringify({ policy_id: policyId })
      });

      fetchPolicies(); // Refresh list
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  }

  if (loading) {
    return <div className="p-4">Loading policies...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Security Policies</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Policy
        </button>
      </div>

      {showCreateForm && (
        <PolicyCreateForm
          onCreate={createPolicy}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="grid gap-4">
        {policies.map((policy) => (
          <div key={policy.name} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{policy.policy_name}</h3>
                <p className="text-gray-600 text-sm mt-1">{policy.description}</p>
                <div className="mt-3 flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {policy.policy_type}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    {policy.enforcement_mode}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    policy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    policy.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    policy.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {policy.severity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deletePolicy(policy.name)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SecurityPolicyManager;
```

---

## Utility Functions

```javascript
// Get CSRF token from cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Get current user ID from Frappe
function getCurrentUserId() {
  return window.frappe?.session?.user || 'Guest';
}

// Format date for API
function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Generic API caller with error handling
async function callAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': getCookie('csrf_token')
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.exc || result._server_messages) {
      const errorMsg = result._server_messages
        ? JSON.parse(result._server_messages)[0].message
        : result.exc;
      throw new Error(errorMsg);
    }

    return result.message;

  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## Testing the APIs

You can test all endpoints using this template:

```javascript
// Test Audit Logging
await callAPI('/api/method/ai_assistant.api.security_log_audit_event', {
  event_type: 'create',
  event_category: 'test',
  action: 'test_api',
  status: 'success',
  risk_level: 'low'
});

// Test Policy Creation
await callAPI('/api/method/ai_assistant.api.security_create_policy', {
  name: 'Test Policy',
  description: 'Testing policy creation',
  policy_type: 'authentication',
  policy_config: { test: true },
  scope: 'global',
  enforcement_mode: 'audit'
});

// Test Permission Check
await callAPI('/api/method/ai_assistant.api.security_check_permission', {
  subject_type: 'user',
  subject_id: getCurrentUserId(),
  resource_type: 'document',
  resource_id: 'TEST-001',
  action: 'read'
});
```

---

## Support & Documentation

- **Production URL:** `https://oropendola.ai`
- **API Base Path:** `/api/method/ai_assistant.api.*`
- **Total Endpoints:** 33 operational security APIs
- **Authentication:** Session-based or API Key

For questions or issues, contact the backend team.

---

**Document Version:** 1.0
**Last Updated:** October 25, 2025
**Status:** Production Ready ✅
