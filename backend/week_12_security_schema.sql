-- Week 12: Security & Compliance - Database Schema
-- 8 tables for enterprise-grade security features
-- Created: 2025-10-24

-- ============================================================================
-- 1. AUDIT LOG - Track all user actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_audit_log` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Audit Fields
  `log_id` VARCHAR(140) UNIQUE NOT NULL,
  `timestamp` DATETIME(6) NOT NULL,
  `user` VARCHAR(140) NOT NULL,
  `action` VARCHAR(255) NOT NULL,  -- login, logout, file_access, command_executed, etc.
  `resource_type` VARCHAR(100),    -- file, workspace, setting, user
  `resource_id` VARCHAR(255),
  `action_type` VARCHAR(50),       -- create, read, update, delete
  `ip_address` VARCHAR(45),        -- IPv4 or IPv6
  `user_agent` TEXT,
  `session_id` VARCHAR(140),
  `result` VARCHAR(50),            -- success, failure, denied
  `metadata` JSON,                 -- Additional context
  `risk_level` VARCHAR(20),        -- low, medium, high, critical

  -- Indexes for fast querying
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_user` (`user`),
  INDEX `idx_action` (`action`),
  INDEX `idx_risk_level` (`risk_level`),
  INDEX `idx_resource` (`resource_type`, `resource_id`),
  INDEX `idx_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. SECURITY POLICY - Policy definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_security_policy` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Policy Fields
  `policy_id` VARCHAR(140) UNIQUE NOT NULL,
  `policy_name` VARCHAR(255) NOT NULL,
  `policy_type` VARCHAR(100) NOT NULL,  -- access_control, data_retention, encryption, compliance
  `description` TEXT,
  `rules` JSON NOT NULL,                -- Policy rules configuration
  `scope` VARCHAR(50) NOT NULL,         -- organization, workspace, user
  `scope_id` VARCHAR(140),
  `enabled` BOOLEAN DEFAULT TRUE,
  `enforcement_level` VARCHAR(50) DEFAULT 'warn',  -- warn, block, audit
  `created_by` VARCHAR(140),
  `last_modified_at` DATETIME(6),

  INDEX `idx_policy_type` (`policy_type`),
  INDEX `idx_scope` (`scope`, `scope_id`),
  INDEX `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. ACCESS CONTROL POLICY - RBAC + ABAC
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_access_control` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Access Control Fields
  `policy_id` VARCHAR(140) UNIQUE NOT NULL,
  `resource_type` VARCHAR(100) NOT NULL,    -- file, workspace, feature, api
  `resource_pattern` VARCHAR(500),          -- Regex or glob pattern
  `principal_type` VARCHAR(50) NOT NULL,    -- user, role, group, organization
  `principal_id` VARCHAR(140) NOT NULL,
  `permissions` JSON NOT NULL,              -- {read, write, delete, execute, share}
  `conditions` JSON,                        -- [{attribute, operator, value}]
  `effect` VARCHAR(20) NOT NULL DEFAULT 'allow',  -- allow, deny
  `priority` INT DEFAULT 0,                 -- For conflict resolution
  `expires_at` DATETIME(6),

  INDEX `idx_resource` (`resource_type`, `resource_pattern`(100)),
  INDEX `idx_principal` (`principal_type`, `principal_id`),
  INDEX `idx_effect` (`effect`),
  INDEX `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. COMPLIANCE REPORT - SOC2, GDPR, HIPAA, ISO27001
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_compliance_report` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Compliance Fields
  `report_id` VARCHAR(140) UNIQUE NOT NULL,
  `compliance_type` VARCHAR(50) NOT NULL,   -- SOC2, GDPR, HIPAA, ISO27001
  `report_period_start` DATE NOT NULL,
  `report_period_end` DATE NOT NULL,
  `organization` VARCHAR(140),
  `status` VARCHAR(50) DEFAULT 'generating',  -- generating, completed, failed
  `findings` JSON,                          -- Array of compliance findings
  `compliant` BOOLEAN DEFAULT FALSE,
  `non_compliant_count` INT DEFAULT 0,
  `recommendations` JSON,
  `generated_by` VARCHAR(140),
  `generated_at` DATETIME(6),
  `file_path` VARCHAR(500),                 -- PDF report path

  INDEX `idx_compliance_type` (`compliance_type`),
  INDEX `idx_organization` (`organization`),
  INDEX `idx_status` (`status`),
  INDEX `idx_period` (`report_period_start`, `report_period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. DATA ENCRYPTION KEY - Key management
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_encryption_key` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Key Fields
  `key_id` VARCHAR(140) UNIQUE NOT NULL,
  `key_type` VARCHAR(50) NOT NULL,          -- master, data_encryption, session
  `algorithm` VARCHAR(50) NOT NULL,         -- AES-256-GCM, RSA-4096
  `key_material` TEXT NOT NULL,             -- Encrypted key (encrypted at rest)
  `created_at` DATETIME(6) NOT NULL,
  `expires_at` DATETIME(6),
  `rotated_from` VARCHAR(140),              -- Link to previous key
  `status` VARCHAR(50) DEFAULT 'active',    -- active, rotated, revoked
  `usage_count` INT DEFAULT 0,

  INDEX `idx_key_type` (`key_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expires` (`expires_at`),

  FOREIGN KEY (`rotated_from`) REFERENCES `oropendola_encryption_key`(`name`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. SECRET DETECTION RESULT - Hardcoded secrets scanner
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_secret_detection` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Detection Fields
  `detection_id` VARCHAR(140) UNIQUE NOT NULL,
  `user` VARCHAR(140) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `secret_type` VARCHAR(100) NOT NULL,      -- api_key, password, token, certificate, ssh_key
  `line_number` INT NOT NULL,
  `matched_pattern` VARCHAR(500),
  `confidence` DECIMAL(3, 2),               -- 0.0 to 1.0
  `entropy_score` DECIMAL(5, 2),            -- Shannon entropy
  `detected_at` DATETIME(6) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'detected',  -- detected, false_positive, remediated
  `remediated_at` DATETIME(6),
  `severity` VARCHAR(20),                   -- critical, high, medium, low

  INDEX `idx_user` (`user`),
  INDEX `idx_file_path` (`file_path`(255)),
  INDEX `idx_secret_type` (`secret_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_detected_at` (`detected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. LICENSE COMPLIANCE - OSS license tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_license_compliance` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- License Fields
  `package_name` VARCHAR(255) NOT NULL,
  `package_version` VARCHAR(100) NOT NULL,
  `license` VARCHAR(255),                   -- MIT, GPL, Apache, etc.
  `license_type` VARCHAR(50),               -- permissive, copyleft, proprietary
  `compliance_status` VARCHAR(50) DEFAULT 'review_needed',  -- compliant, review_needed, incompatible
  `detected_in` JSON,                       -- [{workspace_id, file_path}]
  `risk_level` VARCHAR(20),                 -- low, medium, high
  `policy_violation` BOOLEAN DEFAULT FALSE,
  `last_checked` DATETIME(6),

  INDEX `idx_package` (`package_name`, `package_version`),
  INDEX `idx_license_type` (`license_type`),
  INDEX `idx_compliance_status` (`compliance_status`),
  INDEX `idx_risk_level` (`risk_level`),
  UNIQUE KEY `unique_package_version` (`package_name`, `package_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. SECURITY INCIDENT - Incident management
-- ============================================================================
CREATE TABLE IF NOT EXISTS `oropendola_security_incident` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `creation` DATETIME(6) NOT NULL,
  `modified` DATETIME(6) NOT NULL,
  `modified_by` VARCHAR(140),
  `owner` VARCHAR(140),
  `docstatus` INT(1) NOT NULL DEFAULT 0,
  `idx` INT(8) NOT NULL DEFAULT 0,

  -- Incident Fields
  `incident_id` VARCHAR(140) UNIQUE NOT NULL,
  `incident_type` VARCHAR(100) NOT NULL,    -- unauthorized_access, data_breach, policy_violation
  `severity` VARCHAR(20) NOT NULL,          -- critical, high, medium, low
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `detected_at` DATETIME(6) NOT NULL,
  `detected_by` VARCHAR(140),               -- System or user
  `affected_users` JSON,                    -- Array of user IDs
  `affected_resources` JSON,                -- Array of resource IDs
  `status` VARCHAR(50) DEFAULT 'new',       -- new, investigating, contained, resolved
  `assigned_to` VARCHAR(140),
  `resolution` TEXT,
  `resolved_at` DATETIME(6),
  `root_cause` TEXT,
  `actions_taken` JSON,                     -- Array of remediation actions

  INDEX `idx_incident_type` (`incident_type`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_status` (`status`),
  INDEX `idx_detected_at` (`detected_at`),
  INDEX `idx_assigned_to` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA - For testing
-- ============================================================================

-- Insert sample security policy
INSERT IGNORE INTO `oropendola_security_policy` (
  `name`, `creation`, `modified`, `owner`, `policy_id`, `policy_name`,
  `policy_type`, `description`, `rules`, `scope`, `enabled`
) VALUES (
  'SEC-POL-001', NOW(), NOW(), 'Administrator', 'default-access-control',
  'Default Access Control Policy',
  'access_control',
  'Default policy for workspace access control',
  '{"default_permissions": {"read": true, "write": false, "delete": false}}',
  'organization',
  TRUE
);

-- Insert sample compliance report
INSERT IGNORE INTO `oropendola_compliance_report` (
  `name`, `creation`, `modified`, `owner`, `report_id`, `compliance_type`,
  `report_period_start`, `report_period_end`, `status`, `compliant`
) VALUES (
  'COMP-REP-001', NOW(), NOW(), 'Administrator', 'soc2-q4-2024',
  'SOC2',
  '2024-10-01', '2024-12-31',
  'generating',
  FALSE
);

-- ============================================================================
-- INDEXES SUMMARY
-- ============================================================================
-- Total tables: 8
-- Total indexes: 40+ (for optimal query performance)
-- Storage engine: InnoDB (supports transactions and foreign keys)
-- Character set: utf8mb4 (full Unicode support)
-- Collation: utf8mb4_unicode_ci (case-insensitive, Unicode-aware)

-- ============================================================================
-- RETENTION POLICIES (To be implemented in cron jobs)
-- ============================================================================
-- Audit logs: Keep 90 days, archive to cold storage, delete after 1 year
-- Secret detections: Keep 180 days for compliance
-- Compliance reports: Keep indefinitely
-- Security incidents: Keep indefinitely
-- Encryption keys: Keep rotated keys for 90 days
-- Access control: Clean up expired policies daily
-- License compliance: Update monthly

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
