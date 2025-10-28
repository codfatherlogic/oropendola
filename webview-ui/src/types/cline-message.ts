/**
 * Cline Message Types - Simplified for Oropendola
 */

export interface ApiMetrics {
  cost?: number
  tokensIn?: number
  tokensOut?: number
  cacheWrites?: number
  cacheReads?: number
  apiRequestId?: string
  // Agent Mode metadata
  agentMode?: boolean
  selectedModel?: string
  selectionReason?: string
}

export interface CombinedApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites: number
  cacheReads: number
  totalCost: number
  contextTokens: number
}

export interface ToolCall {
  id?: string
  action: string  // 'create_file', 'edit_file', 'run_terminal', etc.
  path?: string
  content?: string
  command?: string
  old_string?: string
  new_string?: string
  description?: string
  [key: string]: any  // Allow additional tool-specific fields
}

export interface ClineMessage {
  ts: number
  type: 'ask' | 'say'
  ask?: string
  say?: string | 'sign_in_required'
  text?: string
  images?: string[]
  partial?: boolean
  tool?: ToolCall  // Tool data for approval
  apiMetrics?: ApiMetrics
}

export type ClineAsk = string
export type ClineSay = string
