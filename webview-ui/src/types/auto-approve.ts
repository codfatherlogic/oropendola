/**
 * Auto-Approval Types - Simplified for Oropendola
 */

export type AutoApproveSetting =
  | "alwaysAllowReadOnly"
  | "alwaysAllowWrite"
  | "alwaysAllowExecute"
  | "alwaysAllowBrowser"
  | "alwaysAllowMcp"
  | "alwaysAllowModeSwitch"
  | "alwaysAllowSubtasks"
  | "alwaysApproveResubmit"
  | "alwaysAllowFollowupQuestions"
  | "alwaysAllowUpdateTodoList"

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

export interface AutoApproveConfig {
  key: AutoApproveSetting
  label: string
  description: string
  icon: string
}

export const autoApproveSettingsConfig: Record<AutoApproveSetting, AutoApproveConfig> = {
  alwaysAllowReadOnly: {
    key: "alwaysAllowReadOnly",
    label: "Read Files",
    description: "Automatically approve requests to read files",
    icon: "eye",
  },
  alwaysAllowWrite: {
    key: "alwaysAllowWrite",
    label: "Write Files",
    description: "Automatically approve requests to write files",
    icon: "edit",
  },
  alwaysAllowExecute: {
    key: "alwaysAllowExecute",
    label: "Execute Commands",
    description: "Automatically approve terminal commands",
    icon: "terminal",
  },
  alwaysAllowBrowser: {
    key: "alwaysAllowBrowser",
    label: "Browser",
    description: "Automatically approve browser automation",
    icon: "globe",
  },
  alwaysAllowMcp: {
    key: "alwaysAllowMcp",
    label: "MCP",
    description: "Automatically approve MCP server usage",
    icon: "plug",
  },
  alwaysAllowModeSwitch: {
    key: "alwaysAllowModeSwitch",
    label: "Mode Switch",
    description: "Automatically approve mode switches",
    icon: "sync",
  },
  alwaysAllowSubtasks: {
    key: "alwaysAllowSubtasks",
    label: "Subtasks",
    description: "Automatically approve subtasks",
    icon: "list-tree",
  },
  alwaysApproveResubmit: {
    key: "alwaysApproveResubmit",
    label: "Retry",
    description: "Automatically retry failed requests",
    icon: "refresh",
  },
  alwaysAllowFollowupQuestions: {
    key: "alwaysAllowFollowupQuestions",
    label: "Followup",
    description: "Automatically handle followup questions",
    icon: "question",
  },
  alwaysAllowUpdateTodoList: {
    key: "alwaysAllowUpdateTodoList",
    label: "Todos",
    description: "Automatically approve todo updates",
    icon: "checklist",
  },
}

export function getEnabledCount(toggles: AutoApproveToggles): number {
  return Object.values(toggles).filter(value => value === true).length
}

export function getTotalCount(): number {
  return Object.keys(autoApproveSettingsConfig).length
}

export function isEffectivelyEnabled(
  toggles: AutoApproveToggles,
  masterSwitch: boolean
): boolean {
  return masterSwitch && getEnabledCount(toggles) > 0
}
