/**
 * Auto-Approval Settings Configuration
 *
 * Defines the 10 permission types that can be auto-approved
 * for hands-free AI assistance with Oropendola AI.
 */

export type AutoApproveSetting =
  | "alwaysAllowReadOnly"      // Read files and directories
  | "alwaysAllowWrite"          // Edit/create/delete files
  | "alwaysAllowExecute"        // Execute terminal commands
  | "alwaysAllowBrowser"        // Browser automation
  | "alwaysAllowMcp"            // MCP server usage
  | "alwaysAllowModeSwitch"     // Switch between modes (code/ask/architect)
  | "alwaysAllowSubtasks"       // Create and manage subtasks
  | "alwaysApproveResubmit"     // Retry failed API requests
  | "alwaysAllowFollowupQuestions"  // Auto-answer followup questions
  | "alwaysAllowUpdateTodoList" // Update todo list

export interface AutoApproveConfig {
  key: AutoApproveSetting
  label: string
  description: string
  icon: string  // VSCode codicon name
}

export const autoApproveSettingsConfig: Record<AutoApproveSetting, AutoApproveConfig> = {
  alwaysAllowReadOnly: {
    key: "alwaysAllowReadOnly",
    label: "Read Files",
    description: "Automatically approve requests to read files and list directories",
    icon: "eye",
  },
  alwaysAllowWrite: {
    key: "alwaysAllowWrite",
    label: "Write Files",
    description: "Automatically approve requests to create, edit, or delete files",
    icon: "edit",
  },
  alwaysAllowExecute: {
    key: "alwaysAllowExecute",
    label: "Execute Commands",
    description: "Automatically approve requests to run terminal commands",
    icon: "terminal",
  },
  alwaysAllowBrowser: {
    key: "alwaysAllowBrowser",
    label: "Browser Automation",
    description: "Automatically approve requests to use browser automation",
    icon: "globe",
  },
  alwaysAllowMcp: {
    key: "alwaysAllowMcp",
    label: "MCP Servers",
    description: "Automatically approve requests to use MCP server tools and resources",
    icon: "plug",
  },
  alwaysAllowModeSwitch: {
    key: "alwaysAllowModeSwitch",
    label: "Mode Switch",
    description: "Automatically approve requests to switch between modes (code/ask/architect)",
    icon: "sync",
  },
  alwaysAllowSubtasks: {
    key: "alwaysAllowSubtasks",
    label: "Subtasks",
    description: "Automatically approve requests to create and manage subtasks",
    icon: "list-tree",
  },
  alwaysApproveResubmit: {
    key: "alwaysApproveResubmit",
    label: "Retry Requests",
    description: "Automatically retry failed API requests without asking",
    icon: "refresh",
  },
  alwaysAllowFollowupQuestions: {
    key: "alwaysAllowFollowupQuestions",
    label: "Followup Questions",
    description: "Automatically handle followup questions with suggested answers",
    icon: "question",
  },
  alwaysAllowUpdateTodoList: {
    key: "alwaysAllowUpdateTodoList",
    label: "Update Todos",
    description: "Automatically approve updates to the todo list",
    icon: "checklist",
  },
}

export interface AutoApproveToggles {
  alwaysAllowReadOnly?: boolean
  alwaysAllowWrite?: boolean
  alwaysAllowExecute?: boolean
  alwaysAllowBrowser?: boolean
  alwaysAllowMcp?: boolean
  alwaysAllowModeSwitch?: boolean
  alwaysAllowSubtasks?: boolean
  alwaysApproveResubmit?: boolean
  alwaysAllowFollowupQuestions?: boolean
  alwaysAllowUpdateTodoList?: boolean
}

/**
 * Get array of enabled auto-approve settings
 */
export function getEnabledSettings(toggles: AutoApproveToggles): AutoApproveSetting[] {
  return Object.entries(toggles)
    .filter(([_, value]) => value === true)
    .map(([key]) => key as AutoApproveSetting)
}

/**
 * Count how many settings are enabled
 */
export function getEnabledCount(toggles: AutoApproveToggles): number {
  return Object.values(toggles).filter(value => value === true).length
}

/**
 * Get total number of available settings
 */
export function getTotalCount(): number {
  return Object.keys(autoApproveSettingsConfig).length
}

/**
 * Check if all settings are enabled
 */
export function areAllEnabled(toggles: AutoApproveToggles): boolean {
  return getEnabledCount(toggles) === getTotalCount()
}

/**
 * Check if auto-approval is effectively enabled
 * (master switch is on AND at least one permission is enabled)
 */
export function isEffectivelyEnabled(
  toggles: AutoApproveToggles,
  masterSwitch: boolean
): boolean {
  return masterSwitch && getEnabledCount(toggles) > 0
}
