-- Week 9: Analytics & Insights - Database Schema
-- 6 DocTypes for comprehensive analytics and reporting

-- 1. ANALYTICS EVENT
-- Track all user events and interactions
CREATE TABLE IF NOT EXISTS `oropendola_analytics_event` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `event_id` VARCHAR(140) UNIQUE NOT NULL,
  `user_id` VARCHAR(140) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,  -- chat, code_action, document_process, terminal, browser, search
  `event_category` VARCHAR(100),  -- feature category
  `event_action` VARCHAR(255) NOT NULL,  -- specific action taken
  `event_label` VARCHAR(255),  -- additional context
  `event_value` DECIMAL(10,2),  -- numeric value if applicable
  `session_id` VARCHAR(140),
  `workspace_id` VARCHAR(255),
  `project_id` VARCHAR(255),
  `metadata` JSON,  -- Additional event data
  `timestamp` DATETIME(6) NOT NULL,
  `date` DATE NOT NULL,
  `hour` INT,  -- 0-23 for hourly aggregation
  INDEX `idx_event_id` (`event_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_date` (`date`),
  INDEX `idx_session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USAGE METRIC
-- Aggregate usage statistics
CREATE TABLE IF NOT EXISTS `oropendola_usage_metric` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `metric_id` VARCHAR(140) UNIQUE NOT NULL,
  `user_id` VARCHAR(140),  -- NULL for global metrics
  `metric_type` VARCHAR(100) NOT NULL,  -- api_calls, tokens_used, features_used, active_time
  `metric_name` VARCHAR(255) NOT NULL,
  `metric_value` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(50),  -- count, tokens, seconds, bytes
  `period_type` VARCHAR(50) NOT NULL,  -- hourly, daily, weekly, monthly
  `period_start` DATETIME(6) NOT NULL,
  `period_end` DATETIME(6) NOT NULL,
  `workspace_id` VARCHAR(255),
  `project_id` VARCHAR(255),
  `metadata` JSON,
  `created_at` DATETIME(6) NOT NULL,
  INDEX `idx_metric_id` (`metric_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_metric_type` (`metric_type`),
  INDEX `idx_period_type` (`period_type`),
  INDEX `idx_period_start` (`period_start`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PERFORMANCE METRIC
-- Track system and feature performance
CREATE TABLE IF NOT EXISTS `oropendola_performance_metric` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `metric_id` VARCHAR(140) UNIQUE NOT NULL,
  `metric_name` VARCHAR(255) NOT NULL,
  `metric_category` VARCHAR(100),  -- api_latency, ai_response_time, cache_hit_rate, error_rate
  `value` DECIMAL(15,4) NOT NULL,
  `unit` VARCHAR(50),  -- ms, seconds, percentage, count
  `threshold_warning` DECIMAL(15,4),
  `threshold_critical` DECIMAL(15,4),
  `status` VARCHAR(50) DEFAULT 'normal',  -- normal, warning, critical
  `endpoint` VARCHAR(255),  -- API endpoint if applicable
  `feature` VARCHAR(100),  -- Feature name
  `user_id` VARCHAR(140),
  `metadata` JSON,
  `measured_at` DATETIME(6) NOT NULL,
  `period_type` VARCHAR(50),  -- realtime, hourly, daily
  INDEX `idx_metric_id` (`metric_id`),
  INDEX `idx_metric_category` (`metric_category`),
  INDEX `idx_status` (`status`),
  INDEX `idx_measured_at` (`measured_at`),
  INDEX `idx_feature` (`feature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ANALYTICS REPORT
-- Generated analytics reports
CREATE TABLE IF NOT EXISTS `oropendola_analytics_report` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `report_id` VARCHAR(140) UNIQUE NOT NULL,
  `report_name` VARCHAR(255) NOT NULL,
  `report_type` VARCHAR(100) NOT NULL,  -- usage, performance, user_engagement, feature_adoption
  `description` TEXT,
  `period_start` DATETIME(6) NOT NULL,
  `period_end` DATETIME(6) NOT NULL,
  `scope` VARCHAR(50),  -- global, user, workspace, project
  `scope_id` VARCHAR(140),  -- user_id, workspace_id, or project_id
  `report_data` JSON NOT NULL,  -- Report results
  `summary` JSON,  -- Summary statistics
  `visualizations` JSON,  -- Chart configurations
  `format` VARCHAR(50) DEFAULT 'json',  -- json, pdf, csv
  `status` VARCHAR(50) DEFAULT 'generated',  -- generating, generated, failed
  `generated_by` VARCHAR(140) NOT NULL,
  `generated_at` DATETIME(6) NOT NULL,
  `file_path` VARCHAR(500),  -- Path to exported file if applicable
  INDEX `idx_report_id` (`report_id`),
  INDEX `idx_report_type` (`report_type`),
  INDEX `idx_generated_by` (`generated_by`),
  INDEX `idx_generated_at` (`generated_at`),
  INDEX `idx_scope` (`scope`, `scope_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. DASHBOARD WIDGET
-- Customizable dashboard widgets
CREATE TABLE IF NOT EXISTS `oropendola_dashboard_widget` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `widget_id` VARCHAR(140) UNIQUE NOT NULL,
  `widget_name` VARCHAR(255) NOT NULL,
  `widget_type` VARCHAR(100) NOT NULL,  -- chart, metric, table, list, custom
  `chart_type` VARCHAR(50),  -- line, bar, pie, area, scatter (for chart widgets)
  `data_source` VARCHAR(100) NOT NULL,  -- events, usage, performance, custom_query
  `query_config` JSON NOT NULL,  -- Query configuration
  `display_config` JSON,  -- Display settings (colors, labels, etc.)
  `refresh_interval` INT DEFAULT 300,  -- Refresh interval in seconds
  `position_x` INT DEFAULT 0,
  `position_y` INT DEFAULT 0,
  `width` INT DEFAULT 4,
  `height` INT DEFAULT 3,
  `is_public` BOOLEAN DEFAULT FALSE,
  `created_by` VARCHAR(140) NOT NULL,
  `workspace_id` VARCHAR(255),
  `created_at` DATETIME(6) NOT NULL,
  `modified_at` DATETIME(6) NOT NULL,
  INDEX `idx_widget_id` (`widget_id`),
  INDEX `idx_widget_type` (`widget_type`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_workspace_id` (`workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. INSIGHT
-- AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS `oropendola_analytics_insight` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `insight_id` VARCHAR(140) UNIQUE NOT NULL,
  `insight_type` VARCHAR(100) NOT NULL,  -- trend, anomaly, recommendation, prediction
  `category` VARCHAR(100),  -- usage, performance, engagement, cost
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `severity` VARCHAR(50) DEFAULT 'info',  -- info, low, medium, high, critical
  `confidence` DECIMAL(5,2) DEFAULT 0.00,  -- 0-100
  `impact` VARCHAR(50),  -- low, medium, high
  `actionable` BOOLEAN DEFAULT FALSE,
  `action_suggestions` JSON,  -- Suggested actions
  `supporting_data` JSON,  -- Data that led to this insight
  `metric_change` DECIMAL(10,2),  -- Percentage change if applicable
  `period_start` DATETIME(6),
  `period_end` DATETIME(6),
  `status` VARCHAR(50) DEFAULT 'new',  -- new, acknowledged, acted_on, dismissed
  `user_id` VARCHAR(140),  -- NULL for global insights
  `workspace_id` VARCHAR(255),
  `generated_at` DATETIME(6) NOT NULL,
  `acknowledged_at` DATETIME(6),
  `acknowledged_by` VARCHAR(140),
  INDEX `idx_insight_id` (`insight_id`),
  INDEX `idx_insight_type` (`insight_type`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_status` (`status`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_generated_at` (`generated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
