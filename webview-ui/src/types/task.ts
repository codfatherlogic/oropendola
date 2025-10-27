/**
 * Task Type Definitions
 * Core types for task management system
 */

export type TaskStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'blocked'
  | 'active'
  | 'failed'
  | 'terminated'

export interface TaskMessage {
  text?: string
  [key: string]: any
}

export interface ApiMetrics {
  tokensIn: number
  tokensOut: number
  totalCost: number
  [key: string]: any
}

export interface Task {
  id: string
  title: string
  description?: string
  text?: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  completedAt?: number
  parentId?: string
  dependencies?: string[]
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  estimatedTime?: number
  actualTime?: number
  assignee?: string
  messages: TaskMessage[]
  apiMetrics: ApiMetrics
  metadata?: Record<string, any>
}

export interface TaskFilters {
  status?: TaskStatus[] | TaskStatus
  tags?: string[]
  priority?: string[]
  search?: string
  sortBy?: string
  sortOrder?: string
  dateRange?: {
    start: number
    end: number
  }
}

export interface TaskStats {
  total: number
  byStatus: Record<TaskStatus, number>
  completionRate: number
  averageCompletionTime?: number
}
