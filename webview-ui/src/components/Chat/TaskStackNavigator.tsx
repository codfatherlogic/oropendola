/**
 * TaskStackNavigator - Visual representation of task hierarchy
 * 
 * Shows parent/child task relationships in a breadcrumb-style navigation
 * Inspired by Roo-Code's task stack visualization
 */

import React from 'react'
import { ChevronRight, Circle, CheckCircle2, Loader2, Pause, XCircle } from 'lucide-react'
import './TaskStackNavigator.css'

export interface TaskStackItem {
  taskId: string
  taskText: string
  taskNumber: number
  status: 'active' | 'paused' | 'completed' | 'failed' | 'waiting-for-subtask'
  isPaused?: boolean
}

interface TaskStackNavigatorProps {
  taskStack: TaskStackItem[]
  currentTaskId: string
  onNavigateToTask?: (taskId: string) => void
}

export const TaskStackNavigator: React.FC<TaskStackNavigatorProps> = ({
  taskStack,
  currentTaskId,
  onNavigateToTask
}) => {
  if (taskStack.length === 0) {
    return null
  }

  const getStatusIcon = (status: TaskStackItem['status'], isCurrent: boolean) => {
    if (isCurrent && status === 'active') {
      return <Loader2 className="task-stack-icon task-stack-icon-active" size={14} />
    }

    switch (status) {
      case 'completed':
        return <CheckCircle2 className="task-stack-icon task-stack-icon-completed" size={14} />
      case 'failed':
        return <XCircle className="task-stack-icon task-stack-icon-failed" size={14} />
      case 'paused':
      case 'waiting-for-subtask':
        return <Pause className="task-stack-icon task-stack-icon-paused" size={14} />
      default:
        return <Circle className="task-stack-icon task-stack-icon-pending" size={14} />
    }
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="task-stack-navigator">
      <div className="task-stack-label">Task Stack:</div>
      <div className="task-stack-breadcrumb">
        {taskStack.map((task, index) => {
          const isCurrent = task.taskId === currentTaskId
          const isClickable = onNavigateToTask && !isCurrent

          return (
            <React.Fragment key={task.taskId}>
              {index > 0 && <ChevronRight className="task-stack-separator" size={16} />}
              
              <div
                className={`task-stack-item ${isCurrent ? 'task-stack-item-current' : ''} ${
                  isClickable ? 'task-stack-item-clickable' : ''
                }`}
                onClick={() => isClickable && onNavigateToTask(task.taskId)}
                title={task.taskText}
              >
                {getStatusIcon(task.status, isCurrent)}
                <span className="task-stack-text">
                  {truncateText(task.taskText)}
                </span>
                {task.taskNumber > 0 && (
                  <span className="task-stack-depth">L{task.taskNumber}</span>
                )}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
