-- Week 11 Phase 4: Custom Code Actions DocType
-- Allows users to define and save custom code analysis/transformation actions

CREATE TABLE IF NOT EXISTS `oropendola_custom_code_action` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `action_id` VARCHAR(140) UNIQUE NOT NULL,
  `action_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `action_type` VARCHAR(50) NOT NULL,  -- analysis, transformation, validation, generation
  `language` VARCHAR(50),  -- Specific language or 'any'
  `prompt_template` LONGTEXT NOT NULL,  -- AI prompt template with {{code}}, {{language}} placeholders
  `parameters` JSON,  -- Custom parameters for the action
  `output_format` VARCHAR(50) DEFAULT 'json',  -- json, text, code
  `is_public` BOOLEAN DEFAULT FALSE,  -- Share with other users
  `created_by` VARCHAR(140) NOT NULL,
  `execution_count` INT DEFAULT 0,
  `average_rating` DECIMAL(3,2) DEFAULT 0.00,
  `created_at` DATETIME(6) NOT NULL,
  `modified_at` DATETIME(6) NOT NULL,
  INDEX `idx_action_id` (`action_id`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_language` (`language`),
  INDEX `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custom Action Execution History
CREATE TABLE IF NOT EXISTS `oropendola_custom_action_execution` (
  `name` VARCHAR(140) NOT NULL PRIMARY KEY,
  `execution_id` VARCHAR(140) UNIQUE NOT NULL,
  `action_id` VARCHAR(140) NOT NULL,
  `action_name` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(140) NOT NULL,
  `input_code` LONGTEXT,
  `input_language` VARCHAR(50),
  `output_result` LONGTEXT,
  `execution_time_ms` INT,
  `success` BOOLEAN DEFAULT TRUE,
  `error_message` TEXT,
  `rating` INT,  -- 1-5 stars
  `executed_at` DATETIME(6) NOT NULL,
  INDEX `idx_execution_id` (`execution_id`),
  INDEX `idx_action_id` (`action_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_executed_at` (`executed_at`),
  FOREIGN KEY (`action_id`) REFERENCES `oropendola_custom_code_action`(`action_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
