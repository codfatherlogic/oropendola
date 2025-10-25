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
}

export interface CombinedApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites: number
  cacheReads: number
  totalCost: number
  contextTokens: number
}

export interface ClineMessage {
  ts: number
  type: 'ask' | 'say'
  ask?: string
  say?: string
  text?: string
  images?: string[]
  partial?: boolean
  tool?: any
  apiMetrics?: ApiMetrics
}

export type ClineAsk = string
export type ClineSay = string
