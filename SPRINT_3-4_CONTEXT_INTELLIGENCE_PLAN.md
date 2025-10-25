# Sprint 3-4: Context Intelligence & Condensing

**Duration:** Dec 8, 2025 - Jan 18, 2026 (6 weeks)
**Effort:** 300 hours
**Status:** 📋 PLANNING
**Phase:** 1 - Core Foundation

---

## Executive Summary

Sprint 3-4 implements intelligent context management to handle Claude's 200k token window efficiently. This includes real-time token tracking, automatic context condensing when nearing limits, manual condensing controls, and detailed cost breakdowns per task.

**Key Goals:**
1. Never exceed context window (prevent "context too long" errors)
2. Preserve critical information during condensing
3. Track token usage and costs in real-time
4. Provide users visibility and control over context

---

## Current State Assessment

### What We Have ✅
- Task persistence with full CRUD operations
- Message storage (messages_json, messages_text)
- SQLite database with FTS5 search
- Task history UI with virtualization
- Basic task lifecycle (create/update/delete/status)

### What's Missing ❌
- Token counting for messages
- Context window usage tracking
- Automatic condensing triggers
- Message summarization/condensing
- Cost calculation per task
- Context usage visualization
- Condensing controls in UI

---

## Architecture Overview

### Components to Build

```
Context Intelligence System
├── TokenCounter (Core Service)
│   ├── Count tokens in messages
│   ├── Track cumulative usage
│   └── Estimate API costs
├── ContextManager (Core Service)
│   ├── Monitor context window
│   ├── Trigger auto-condensing
│   ├── Execute manual condensing
│   └── Preserve critical context
├── MessageCondenser (AI Service)
│   ├── Summarize message groups
│   ├── Preserve code/data
│   ├── Maintain conversation flow
│   └── Quality validation
├── CostTracker (Analytics Service)
│   ├── Calculate per-message costs
│   ├── Aggregate task costs
│   ├── Track cache usage
│   └── Generate cost reports
└── UI Components
    ├── ContextWindowProgress
    ├── CostBreakdown
    ├── CondensingControls
    └── MessageTimeline
```

---

## Week 1-2: Token Counting & Cost Tracking (100 hrs)

### Deliverables

#### 1. TokenCounter Service

**File:** `src/services/TokenCounter.ts` (~250 lines)

```typescript
import Anthropic from '@anthropic-ai/sdk'

export interface TokenCount {
  input: number
  output: number
  total: number
  cacheWrite?: number
  cacheRead?: number
}

export interface CostEstimate {
  inputCost: number
  outputCost: number
  cacheWriteCost: number
  cacheReadCost: number
  totalCost: number
}

export class TokenCounter {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    })
  }

  /**
   * Count tokens in a message using Claude API
   */
  async countTokens(text: string | object): Promise<number> {
    try {
      const content = typeof text === 'string' ? text : JSON.stringify(text)
      const response = await this.anthropic.messages.countTokens({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content }]
      })
      return response.input_tokens
    } catch (error) {
      console.error('[TokenCounter] Error counting tokens:', error)
      // Fallback: rough estimate (4 chars per token)
      const content = typeof text === 'string' ? text : JSON.stringify(text)
      return Math.ceil(content.length / 4)
    }
  }

  /**
   * Count tokens in multiple messages
   */
  async countMessageTokens(messages: ClineMessage[]): Promise<TokenCount> {
    let inputTokens = 0
    let outputTokens = 0

    for (const msg of messages) {
      const text = msg.text || msg.ask || msg.say || ''
      const tokens = await this.countTokens(text)

      if (msg.type === 'ask') {
        inputTokens += tokens
      } else {
        outputTokens += tokens
      }

      // Add API metrics if available
      if (msg.apiMetrics) {
        inputTokens += msg.apiMetrics.tokensIn || 0
        outputTokens += msg.apiMetrics.tokensOut || 0
      }
    }

    return {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  }

  /**
   * Calculate cost based on token usage
   * Claude Sonnet 4 pricing (as of 2025):
   * - Input: $3/MTok
   * - Output: $15/MTok
   * - Cache Write: $3.75/MTok
   * - Cache Read: $0.30/MTok
   */
  calculateCost(tokens: TokenCount): CostEstimate {
    const INPUT_COST_PER_MTOK = 3.0
    const OUTPUT_COST_PER_MTOK = 15.0
    const CACHE_WRITE_COST_PER_MTOK = 3.75
    const CACHE_READ_COST_PER_MTOK = 0.3

    const inputCost = (tokens.input / 1_000_000) * INPUT_COST_PER_MTOK
    const outputCost = (tokens.output / 1_000_000) * OUTPUT_COST_PER_MTOK
    const cacheWriteCost = tokens.cacheWrite
      ? (tokens.cacheWrite / 1_000_000) * CACHE_WRITE_COST_PER_MTOK
      : 0
    const cacheReadCost = tokens.cacheRead
      ? (tokens.cacheRead / 1_000_000) * CACHE_READ_COST_PER_MTOK
      : 0

    return {
      inputCost,
      outputCost,
      cacheWriteCost,
      cacheReadCost,
      totalCost: inputCost + outputCost + cacheWriteCost + cacheReadCost
    }
  }

  /**
   * Estimate remaining context capacity
   */
  estimateRemainingContext(
    currentTokens: number,
    maxTokens: number = 200_000
  ): number {
    return Math.max(0, maxTokens - currentTokens)
  }

  /**
   * Check if context window is nearing limit
   */
  isNearingLimit(
    currentTokens: number,
    threshold: number = 0.8, // 80%
    maxTokens: number = 200_000
  ): boolean {
    return currentTokens >= maxTokens * threshold
  }
}
```

#### 2. CostTracker Service

**File:** `src/services/CostTracker.ts` (~200 lines)

```typescript
import { Task } from '../types/task'
import { TokenCounter, TokenCount, CostEstimate } from './TokenCounter'

export interface TaskCostBreakdown {
  taskId: string
  taskName: string
  totalCost: number
  tokenCount: TokenCount
  costBreakdown: CostEstimate
  messageCount: number
  duration?: number
  costPerMessage: number
  costPerMinute?: number
}

export class CostTracker {
  private tokenCounter: TokenCounter

  constructor() {
    this.tokenCounter = new TokenCounter()
  }

  /**
   * Calculate cost breakdown for a task
   */
  async calculateTaskCost(task: Task): Promise<TaskCostBreakdown> {
    const tokens = await this.tokenCounter.countMessageTokens(task.messages)
    const costs = this.tokenCounter.calculateCost(tokens)

    const duration = task.completedAt
      ? task.completedAt - task.createdAt
      : Date.now() - task.createdAt

    return {
      taskId: task.id,
      taskName: task.text,
      totalCost: costs.totalCost,
      tokenCount: tokens,
      costBreakdown: costs,
      messageCount: task.messages.length,
      duration,
      costPerMessage: task.messages.length > 0
        ? costs.totalCost / task.messages.length
        : 0,
      costPerMinute: duration > 0
        ? (costs.totalCost / duration) * 60000
        : undefined
    }
  }

  /**
   * Get cost summary across multiple tasks
   */
  async calculateTotalCost(tasks: Task[]): Promise<{
    totalCost: number
    totalTokens: number
    taskCount: number
    averageCostPerTask: number
  }> {
    let totalCost = 0
    let totalTokens = 0

    for (const task of tasks) {
      const breakdown = await this.calculateTaskCost(task)
      totalCost += breakdown.totalCost
      totalTokens += breakdown.tokenCount.total
    }

    return {
      totalCost,
      totalTokens,
      taskCount: tasks.length,
      averageCostPerTask: tasks.length > 0 ? totalCost / tasks.length : 0
    }
  }

  /**
   * Export cost report as CSV
   */
  exportCostReport(breakdowns: TaskCostBreakdown[]): string {
    const header = 'Task ID,Task Name,Total Cost,Input Tokens,Output Tokens,Messages,Duration (ms)'
    const rows = breakdowns.map(b =>
      `${b.taskId},"${b.taskName}",${b.totalCost.toFixed(4)},${b.tokenCount.input},${b.tokenCount.output},${b.messageCount},${b.duration || 0}`
    )
    return [header, ...rows].join('\n')
  }
}
```

#### 3. Update Task Schema for Context Tracking

**File:** `src/services/TaskStorage.ts` (modifications)

Add fields to tasks table:
```sql
ALTER TABLE tasks ADD COLUMN context_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN context_window INTEGER NOT NULL DEFAULT 200000;
ALTER TABLE tasks ADD COLUMN condensing_history_json TEXT DEFAULT '[]';
```

Update Task interface in `src/types/task.ts`:
```typescript
export interface Task {
  // ... existing fields ...

  // Context management
  contextTokens: number        // Current token count
  contextWindow: number         // Max tokens (200k default)
  condensingHistory: CondensingEvent[]
}

export interface CondensingEvent {
  timestamp: number
  beforeTokens: number
  afterTokens: number
  messagesCondensed: number
  method: 'auto' | 'manual'
  trigger?: 'threshold' | 'user'
}
```

#### Acceptance Criteria

- [  ] TokenCounter accurately counts tokens using Claude API
- [  ] Fallback estimation works when API unavailable
- [  ] CostTracker calculates costs for tasks
- [  ] Task schema updated with context fields
- [  ] Database migration runs successfully
- [  ] Unit tests for token counting (90% coverage)
- [  ] Unit tests for cost tracking (90% coverage)

---

## Week 3-4: Context Management & Auto-Condensing (100 hrs)

### Deliverables

#### 1. ContextManager Service

**File:** `src/services/ContextManager.ts` (~350 lines)

```typescript
import { Task } from '../types/task'
import { ClineMessage } from '../types/cline-message'
import { TokenCounter } from './TokenCounter'
import { MessageCondenser } from './MessageCondenser'

export interface ContextManagerConfig {
  maxTokens: number           // 200k default
  autoCondensingThreshold: number  // 0.8 = 80%
  targetReduction: number     // 0.5 = reduce to 50%
  preserveRecentMessages: number  // Keep last N messages
  preserveImportant: boolean  // Keep code, errors, decisions
}

export class ContextManager {
  private tokenCounter: TokenCounter
  private condenser: MessageCondenser
  private config: ContextManagerConfig

  constructor(config?: Partial<ContextManagerConfig>) {
    this.tokenCounter = new TokenCounter()
    this.condenser = new MessageCondenser()
    this.config = {
      maxTokens: config?.maxTokens || 200_000,
      autoCondensingThreshold: config?.autoCondensingThreshold || 0.8,
      targetReduction: config?.targetReduction || 0.5,
      preserveRecentMessages: config?.preserveRecentMessages || 10,
      preserveImportant: config?.preserveImportant !== false
    }
  }

  /**
   * Check if task needs condensing
   */
  async needsCondensing(task: Task): Promise<boolean> {
    const tokens = await this.tokenCounter.countMessageTokens(task.messages)
    return this.tokenCounter.isNearingLimit(
      tokens.total,
      this.config.autoCondensingThreshold,
      this.config.maxTokens
    )
  }

  /**
   * Automatically condense task context
   */
  async autoCondense(task: Task): Promise<Task> {
    console.log('[ContextManager] Auto-condensing task:', task.id)

    const beforeTokens = await this.tokenCounter.countMessageTokens(task.messages)

    // Identify messages to condense (oldest, non-important)
    const { toCondense, toPreserve } = this.categorizeMessages(task.messages)

    // Condense messages using AI
    const condensedMessage = await this.condenser.condenseMessages(toCondense)

    // Replace old messages with condensed version
    const newMessages = [
      condensedMessage,
      ...toPreserve
    ]

    const afterTokens = await this.tokenCounter.countMessageTokens(newMessages)

    // Update task
    const updatedTask: Task = {
      ...task,
      messages: newMessages,
      contextTokens: afterTokens.total,
      condensingHistory: [
        ...task.condensingHistory,
        {
          timestamp: Date.now(),
          beforeTokens: beforeTokens.total,
          afterTokens: afterTokens.total,
          messagesCondensed: toCondense.length,
          method: 'auto',
          trigger: 'threshold'
        }
      ]
    }

    console.log('[ContextManager] Condensed:', {
      before: beforeTokens.total,
      after: afterTokens.total,
      reduction: ((1 - afterTokens.total / beforeTokens.total) * 100).toFixed(1) + '%'
    })

    return updatedTask
  }

  /**
   * Manually condense specific messages
   */
  async manualCondense(
    task: Task,
    messageIds: string[]
  ): Promise<Task> {
    const beforeTokens = await this.tokenCounter.countMessageTokens(task.messages)

    const toCondense = task.messages.filter((m, i) => messageIds.includes(String(i)))
    const toPreserve = task.messages.filter((m, i) => !messageIds.includes(String(i)))

    const condensedMessage = await this.condenser.condenseMessages(toCondense)

    const newMessages = [
      ...toPreserve.slice(0, task.messages.indexOf(toCondense[0])),
      condensedMessage,
      ...toPreserve.slice(task.messages.indexOf(toCondense[0]) + toCondense.length)
    ]

    const afterTokens = await this.tokenCounter.countMessageTokens(newMessages)

    return {
      ...task,
      messages: newMessages,
      contextTokens: afterTokens.total,
      condensingHistory: [
        ...task.condensingHistory,
        {
          timestamp: Date.now(),
          beforeTokens: beforeTokens.total,
          afterTokens: afterTokens.total,
          messagesCondensed: toCondense.length,
          method: 'manual',
          trigger: 'user'
        }
      ]
    }
  }

  /**
   * Categorize messages by importance
   */
  private categorizeMessages(messages: ClineMessage[]): {
    toCondense: ClineMessage[]
    toPreserve: ClineMessage[]
  } {
    const recentCount = this.config.preserveRecentMessages
    const totalCount = messages.length

    const toPreserve: ClineMessage[] = []
    const toCondense: ClineMessage[] = []

    messages.forEach((msg, index) => {
      const isRecent = index >= totalCount - recentCount
      const isImportant = this.config.preserveImportant && this.isImportantMessage(msg)

      if (isRecent || isImportant) {
        toPreserve.push(msg)
      } else {
        toCondense.push(msg)
      }
    })

    return { toCondense, toPreserve }
  }

  /**
   * Determine if message is important
   */
  private isImportantMessage(msg: ClineMessage): boolean {
    const text = msg.text || msg.ask || msg.say || ''

    // Keep messages with code blocks
    if (text.includes('```')) return true

    // Keep error messages
    if (msg.say === 'error' || text.toLowerCase().includes('error')) return true

    // Keep tool calls
    if (msg.tool) return true

    // Keep decisions/confirmations
    if (msg.ask === 'tool' || msg.ask === 'command') return true

    return false
  }
}
```

#### 2. MessageCondenser Service

**File:** `src/services/MessageCondenser.ts` (~300 lines)

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { ClineMessage } from '../types/cline-message'

export class MessageCondenser {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    })
  }

  /**
   * Condense multiple messages into a summary
   */
  async condenseMessages(messages: ClineMessage[]): Promise<ClineMessage> {
    if (messages.length === 0) {
      throw new Error('No messages to condense')
    }

    if (messages.length === 1) {
      return messages[0]
    }

    // Create condensing prompt
    const prompt = this.buildCondensingPrompt(messages)

    // Call Claude to summarize
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const summary = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Create condensed message
    const condensedMessage: ClineMessage = {
      ts: Date.now(),
      type: 'say',
      say: 'assistant',
      text: `[CONDENSED ${messages.length} messages]\n\n${summary}`,
      partial: false,
      apiMetrics: {
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
        cacheWrites: response.usage.cache_creation_input_tokens || 0,
        cacheReads: response.usage.cache_read_input_tokens || 0,
        cost: this.calculateCondenseCost(response.usage)
      }
    }

    return condensedMessage
  }

  /**
   * Build prompt for condensing
   */
  private buildCondensingPrompt(messages: ClineMessage[]): string {
    const messageTexts = messages.map((msg, index) => {
      const text = msg.text || msg.ask || msg.say || ''
      const role = msg.type === 'ask' ? 'User' : 'Assistant'
      return `[Message ${index + 1}] ${role}: ${text}`
    }).join('\n\n')

    return `You are tasked with condensing a conversation while preserving all critical information.

INSTRUCTIONS:
1. Summarize the key points, decisions, and outcomes
2. Preserve any code snippets, file paths, or technical details
3. Keep track of what was accomplished
4. Maintain chronological flow
5. Be concise but comprehensive

MESSAGES TO CONDENSE:
${messageTexts}

CONDENSED SUMMARY:`
  }

  /**
   * Calculate cost of condensing operation
   */
  private calculateCondenseCost(usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }): number {
    const INPUT_COST = 3.0 / 1_000_000
    const OUTPUT_COST = 15.0 / 1_000_000
    const CACHE_WRITE_COST = 3.75 / 1_000_000
    const CACHE_READ_COST = 0.3 / 1_000_000

    return (
      usage.input_tokens * INPUT_COST +
      usage.output_tokens * OUTPUT_COST +
      (usage.cache_creation_input_tokens || 0) * CACHE_WRITE_COST +
      (usage.cache_read_input_tokens || 0) * CACHE_READ_COST
    )
  }

  /**
   * Validate condensing quality (BLEU score approximation)
   */
  async validateCondensing(
    original: ClineMessage[],
    condensed: ClineMessage
  ): Promise<number> {
    // Extract key terms from original
    const originalText = original
      .map(m => m.text || m.ask || m.say || '')
      .join(' ')

    const condensedText = condensed.text || ''

    // Simple keyword preservation check
    const keywords = this.extractKeywords(originalText)
    const preserved = keywords.filter(keyword =>
      condensedText.toLowerCase().includes(keyword.toLowerCase())
    )

    // Return preservation ratio (0-1)
    return keywords.length > 0 ? preserved.length / keywords.length : 1
  }

  /**
   * Extract important keywords
   */
  private extractKeywords(text: string): string[] {
    // Extract code blocks
    const codeBlocks = text.match(/```[\s\S]*?```/g) || []

    // Extract file paths
    const filePaths = text.match(/[a-zA-Z0-9_/-]+\.(ts|js|tsx|jsx|py|java|go|rs)/g) || []

    // Extract function names
    const functions = text.match(/function\s+([a-zA-Z0-9_]+)/g) || []

    // Extract class names
    const classes = text.match(/class\s+([a-zA-Z0-9_]+)/g) || []

    return [
      ...codeBlocks.map(c => c.slice(3, -3).trim()),
      ...filePaths,
      ...functions.map(f => f.replace('function ', '')),
      ...classes.map(c => c.replace('class ', ''))
    ]
  }
}
```

#### Acceptance Criteria

- [  ] Auto-condensing triggers at 80% context usage
- [  ] Manual condensing works for selected messages
- [  ] Important messages are preserved (code, errors, decisions)
- [  ] Condensing quality score >= 0.7 (70% keyword preservation)
- [  ] Condensing history tracked in database
- [  ] Performance: Condensing completes in < 5 seconds
- [  ] Unit tests (85% coverage)
- [  ] Integration tests with real tasks

---

## Week 5-6: UI Components & Visualization (100 hrs)

### Deliverables

#### 1. ContextWindowProgress Component

**File:** `webview-ui/src/components/Context/ContextWindowProgress.tsx` (~200 lines)

```typescript
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react'
import './ContextWindowProgress.css'

export interface ContextWindowProgressProps {
  currentTokens: number
  maxTokens: number
  onCondenseClick?: () => void
}

export const ContextWindowProgress: React.FC<ContextWindowProgressProps> = ({
  currentTokens,
  maxTokens,
  onCondenseClick
}) => {
  const percentage = (currentTokens / maxTokens) * 100
  const status = percentage >= 80 ? 'critical' : percentage >= 60 ? 'warning' : 'ok'

  return (
    <div className="context-window-progress">
      <div className="context-header">
        <span className="context-label">Context Window</span>
        <span className={`context-status ${status}`}>
          {currentTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className={`progress-bar ${status}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="context-details">
        <span className="percentage">{percentage.toFixed(1)}% used</span>
        {percentage >= 60 && (
          <button
            className="condense-button"
            onClick={onCondenseClick}
          >
            Condense Context
          </button>
        )}
      </div>
    </div>
  )
}
```

#### 2. CostBreakdown Component

**File:** `webview-ui/src/components/Context/CostBreakdown.tsx` (~250 lines)

```typescript
export interface CostBreakdownProps {
  totalCost: number
  inputCost: number
  outputCost: number
  cacheWriteCost: number
  cacheReadCost: number
  tokenCount: {
    input: number
    output: number
    total: number
  }
}

export const CostBreakdown: React.FC<CostBreakdownProps> = ({
  totalCost,
  inputCost,
  outputCost,
  cacheWriteCost,
  cacheReadCost,
  tokenCount
}) => {
  return (
    <div className="cost-breakdown">
      <div className="cost-header">
        <h3>Cost Breakdown</h3>
        <span className="total-cost">${totalCost.toFixed(4)}</span>
      </div>

      <div className="cost-details">
        <div className="cost-item">
          <span className="cost-label">
            Input ({tokenCount.input.toLocaleString()} tokens)
          </span>
          <span className="cost-value">${inputCost.toFixed(4)}</span>
        </div>

        <div className="cost-item">
          <span className="cost-label">
            Output ({tokenCount.output.toLocaleString()} tokens)
          </span>
          <span className="cost-value">${outputCost.toFixed(4)}</span>
        </div>

        {cacheWriteCost > 0 && (
          <div className="cost-item">
            <span className="cost-label">Cache Write</span>
            <span className="cost-value">${cacheWriteCost.toFixed(4)}</span>
          </div>
        )}

        {cacheReadCost > 0 && (
          <div className="cost-item">
            <span className="cost-label">Cache Read</span>
            <span className="cost-value">${cacheReadCost.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="cost-summary">
        <div className="summary-item">
          <span>Total Tokens</span>
          <span>{tokenCount.total.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span>Cost per 1K tokens</span>
          <span>${((totalCost / tokenCount.total) * 1000).toFixed(4)}</span>
        </div>
      </div>
    </div>
  )
}
```

#### 3. CondensingControls Component

**File:** `webview-ui/src/components/Context/CondensingControls.tsx` (~150 lines)

```typescript
export interface CondensingControlsProps {
  onAutoCondense: () => void
  onManualCondense: () => void
  autoEnabled: boolean
  threshold: number
  onThresholdChange: (threshold: number) => void
}

export const CondensingControls: React.FC<CondensingControlsProps> = ({
  onAutoCondense,
  onManualCondense,
  autoEnabled,
  threshold,
  onThresholdChange
}) => {
  return (
    <div className="condensing-controls">
      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={autoEnabled}
            onChange={(e) => onAutoCondense()}
          />
          Auto-condense at {threshold * 100}% context usage
        </label>
      </div>

      <div className="control-group">
        <label>Auto-condense threshold:</label>
        <input
          type="range"
          min="50"
          max="95"
          value={threshold * 100}
          onChange={(e) => onThresholdChange(Number(e.target.value) / 100)}
        />
        <span>{threshold * 100}%</span>
      </div>

      <div className="control-group">
        <button onClick={onManualCondense}>
          Manually Condense Now
        </button>
      </div>
    </div>
  )
}
```

#### 4. Update TaskHeader with Context Info

**File:** `webview-ui/src/components/chat/TaskHeader.tsx` (modifications)

Add context progress and cost display:
```typescript
<div className="task-header-context">
  <ContextWindowProgress
    currentTokens={task.contextTokens}
    maxTokens={task.contextWindow}
    onCondenseClick={() => handleCondenseClick(task.id)}
  />
  <CostBreakdown {...taskCostBreakdown} />
</div>
```

#### Acceptance Criteria

- [  ] Context progress bar shows real-time usage
- [  ] Progress bar colors change (green/yellow/red)
- [  ] Cost breakdown displays all components
- [  ] Condensing controls functional
- [  ] Auto-condense threshold adjustable
- [  ] Manual condense button works
- [  ] UI updates after condensing
- [  ] Responsive design on all screen sizes

---

## Integration & Testing

### Integration Points

1. **TaskManager** → ContextManager
   - Check context before adding message
   - Auto-condense if needed
   - Update context_tokens field

2. **Sidebar Provider** → CostTracker
   - Calculate costs on task completion
   - Display in task list
   - Export cost reports

3. **Chat UI** → Context Components
   - Show progress in task header
   - Display cost breakdown
   - Enable manual controls

### Testing Strategy

#### Unit Tests
- TokenCounter: token counting accuracy
- CostTracker: cost calculations
- ContextManager: condensing logic
- MessageCondenser: summarization quality

#### Integration Tests
- Full task lifecycle with auto-condensing
- Manual condensing workflow
- Context persistence across restarts

#### Performance Tests
- Token counting speed (< 100ms per message)
- Condensing speed (< 5s for 100 messages)
- UI rendering with large contexts

#### Quality Tests
- Condensing preserves code snippets
- Condensing preserves file paths
- Condensing maintains conversation flow
- BLEU/ROUGE scores >= 0.7

---

## Success Metrics

### Technical Metrics
- ✅ Context never exceeds 200k tokens
- ✅ Auto-condensing reduces context by 40-60%
- ✅ Condensing quality score >= 0.7
- ✅ Token counting accuracy >= 95%
- ✅ Cost calculation accuracy 100%

### Performance Metrics
- ✅ Token counting: < 100ms per message
- ✅ Auto-condensing: < 5s for 100 messages
- ✅ UI updates: < 100ms after condensing

### User Experience Metrics
- ✅ Context visualization clear and intuitive
- ✅ Cost breakdown easy to understand
- ✅ Manual controls accessible
- ✅ No data loss during condensing

---

## Risks & Mitigation

### Risk 1: Condensing Loses Critical Information
**Mitigation:**
- Preserve recent messages (last 10)
- Keep code blocks, errors, decisions
- Validate condensing quality (BLEU score)
- Allow undo of condensing

### Risk 2: Token Counting Inaccurate
**Mitigation:**
- Use official Claude API for counting
- Fallback to estimation if API fails
- Regular accuracy testing
- User can manually trigger recount

### Risk 3: Performance Issues with Large Contexts
**Mitigation:**
- Incremental token counting
- Cache token counts
- Background condensing
- Progress indicators for long operations

---

## Dependencies

### Required Packages
```json
{
  "@anthropic-ai/sdk": "^0.x.x"  // Already installed
}
```

### External APIs
- Anthropic Claude API (token counting)
- Anthropic Claude API (message summarization)

---

## Documentation

### Developer Docs
- Context management architecture
- Condensing algorithm explanation
- Token counting methodology
- Cost calculation formulas

### User Docs
- Understanding context windows
- How auto-condensing works
- Manual condensing guide
- Reading cost breakdowns

---

## Next Sprint Preview: Sprint 5-6 (Auto-Approval)

After Context Intelligence, we'll implement:
- 14 auto-approval toggles
- Tool execution without confirmation
- Command approval settings
- File operation permissions
- Security sandboxing

**Ready to start Sprint 3-4?** Let me know if you want to proceed with implementation!
