/**
 * Cline Message Types - Based on Roo-Code
 * Adapted for Oropendola AI with single backend at https://oropendola.ai
 */

// ============================================================================
// ASK TYPES - Permission requests and user interactions
// ============================================================================

export const clineAsks = [
  "followup",                      // Clarifying question from AI
  "command",                        // Permission to execute terminal command
  "command_output",                 // Permission to read command output
  "completion_result",              // Task has been completed
  "tool",                           // Permission for file operations
  "api_req_failed",                 // API request failed, asking to retry
  "resume_task",                    // Resume a paused task
  "resume_completed_task",          // Resume a completed task
  "mistake_limit_reached",          // Too many errors, need guidance
  "browser_action_launch",          // Permission for browser automation
  "use_mcp_server",                 // Permission to use MCP server
  "auto_approval_max_req_reached",  // Auto-approval limit reached
] as const

export type ClineAsk = (typeof clineAsks)[number]

// ============================================================================
// SAY TYPES - Assistant messages and responses
// ============================================================================

export const clineSays = [
  "error",                          // Error message
  "api_req_started",                // API request initiated
  "api_req_finished",               // API request completed
  "api_req_retried",                // API request being retried
  "api_req_retry_delayed",          // API request retry delayed
  "api_req_deleted",                // API request cancelled
  "text",                           // Regular text message
  "image",                          // Image response
  "reasoning",                      // AI's reasoning/thinking
  "completion_result",              // Task completion result
  "user_feedback",                  // User feedback message
  "user_feedback_diff",             // Diff-formatted user feedback
  "command_output",                 // Command execution output
  "shell_integration_warning",      // Shell integration warning
  "browser_action",                 // Browser action performed
  "browser_action_result",          // Browser action result
  "mcp_server_request_started",     // MCP server request initiated
  "mcp_server_response",            // MCP server response
  "subtask_result",                 // Subtask completed
  "checkpoint_saved",               // Checkpoint saved
  "rooignore_error",                // .rooignore file error
  "diff_error",                     // Diff application error
  "condense_context",               // Context condensation started
  "condense_context_error",         // Context condensation error
  "codebase_search_result",         // Codebase search results
] as const

export type ClineSay = (typeof clineSays)[number]

// ============================================================================
// TOOL TYPES - File and system operations
// ============================================================================

export type ClineSayTool =
  | "editedExistingFile"
  | "newFileCreated"
  | "readFile"
  | "listFilesTopLevel"
  | "listFilesRecursive"
  | "listCodeDefinitionNames"
  | "searchFiles"
  | "insertCodeBlock"
  | "applyDiff"

export interface ToolUse {
  tool: ClineSayTool
  path?: string
  content?: string
  regex?: string
  filePattern?: string
  approvalState?: "pending" | "approved" | "rejected"
  ts?: number
  diff?: string
  error?: string
}

// ============================================================================
// API METRICS
// ============================================================================

export interface ApiMetrics {
  cost?: number
  tokensIn?: number
  tokensOut?: number
  cacheWrites?: number
  cacheReads?: number
  apiRequestId?: string
}

// ============================================================================
// BROWSER ACTION TYPES
// ============================================================================

export interface BrowserAction {
  action: "launch" | "click" | "type" | "scroll_down" | "scroll_up" | "close" | "screenshot"
  coordinate?: string
  text?: string
}

export interface BrowserActionResult {
  screenshot?: string
  logs?: string
  currentUrl?: string
  currentMousePosition?: string
}

// ============================================================================
// MCP SERVER TYPES
// ============================================================================

export interface McpServerUse {
  serverName: string
  toolName: string
  arguments?: Record<string, unknown>
}

// ============================================================================
// MAIN MESSAGE INTERFACE
// ============================================================================

export interface ClineMessage {
  ts: number                        // Timestamp in milliseconds
  type: "ask" | "say"               // Message direction
  ask?: ClineAsk                    // Ask type if applicable
  say?: ClineSay                    // Say type if applicable
  text?: string                     // Message content
  images?: string[]                 // Base64 encoded images

  // Tool usage
  tool?: ToolUse

  // API metrics (for api_req_finished messages)
  apiMetrics?: ApiMetrics

  // Browser actions
  browserAction?: BrowserAction
  browserActionResult?: BrowserActionResult

  // MCP server usage
  mcpServer?: McpServerUse

  // Partial message (for streaming)
  partial?: boolean

  // Error information
  error?: string
}

// ============================================================================
// COMBINED API METRICS (for entire conversation)
// ============================================================================

export interface CombinedApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites: number
  cacheReads: number
  totalCost: number
  contextTokens: number
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export function isAskMessage(message: ClineMessage): message is ClineMessage & { type: "ask"; ask: ClineAsk } {
  return message.type === "ask" && !!message.ask
}

export function isSayMessage(message: ClineMessage): message is ClineMessage & { type: "say"; say: ClineSay } {
  return message.type === "say" && !!message.say
}

export function isToolMessage(message: ClineMessage): boolean {
  return message.ask === "tool" || !!message.tool
}

export function isApiRequestMessage(message: ClineMessage): boolean {
  return message.say === "api_req_started" ||
         message.say === "api_req_finished" ||
         message.say === "api_req_retried"
}

export function isCommandMessage(message: ClineMessage): boolean {
  return message.ask === "command"
}

export function isBrowserMessage(message: ClineMessage): boolean {
  return message.ask === "browser_action_launch" ||
         message.say === "browser_action" ||
         message.say === "browser_action_result"
}

export function isCompletionMessage(message: ClineMessage): boolean {
  return message.ask === "completion_result" || message.say === "completion_result"
}

// ============================================================================
// MESSAGE FACTORY HELPERS
// ============================================================================

export function createTaskMessage(text: string, images?: string[]): ClineMessage {
  return {
    ts: Date.now(),
    type: "ask",
    ask: "followup",
    text,
    images: images || [],
  }
}

export function createToolAskMessage(tool: ToolUse, text?: string): ClineMessage {
  return {
    ts: Date.now(),
    type: "ask",
    ask: "tool",
    text,
    tool,
  }
}

export function createApiRequestStartMessage(text: string, requestId?: string): ClineMessage {
  return {
    ts: Date.now(),
    type: "say",
    say: "api_req_started",
    text,
    apiMetrics: requestId ? { apiRequestId: requestId } : undefined,
  }
}

export function createTextMessage(text: string): ClineMessage {
  return {
    ts: Date.now(),
    type: "say",
    say: "text",
    text,
  }
}

export function createCompletionMessage(text: string): ClineMessage {
  return {
    ts: Date.now(),
    type: "ask",
    ask: "completion_result",
    text,
  }
}
