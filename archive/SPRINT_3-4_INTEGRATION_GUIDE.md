# Sprint 3-4: Integration Guide

**Quick Start for Integrating Context Intelligence**

---

## Step 1: Wire Up Services in TaskManager

```typescript
// src/services/tasks/TaskManager.ts

import { TokenCounter } from '../TokenCounter';
import { CostTracker } from '../CostTracker';
import { ContextManager } from '../ContextManager';

class TaskManager {
    private tokenCounter: TokenCounter;
    private costTracker: CostTracker;
    private contextManager: ContextManager;

    constructor() {
        // Initialize services
        const apiKey = getAnthropicAPIKey(); // Get from config
        this.tokenCounter = new TokenCounter(apiKey);
        this.costTracker = new CostTracker(this.tokenCounter);
        this.contextManager = new ContextManager(
            this.tokenCounter,
            {
                maxTokens: 200_000,
                autoThreshold: 80,
                preserveRecent: 5
            }
        );

        // Subscribe to status changes
        this.contextManager.onStatusChange((status) => {
            this.emit('contextStatusChanged', status);
        });
    }

    async sendMessage(taskId: string, message: any) {
        // ... existing logic ...

        // Track the message cost
        await this.costTracker.trackMessage(
            taskId,
            message.id,
            message,
            apiResponse.metrics // From API
        );

        // Check if auto-condensing is needed
        const status = this.contextManager.getStatus(task.messages);
        if (status.shouldCondense && task.autoCondensingEnabled) {
            const result = await this.contextManager.autoCondense(task.messages);
            if (result) {
                task.messages = result.condensedMessages;
                this.emit('messagesCondensed', result);
            }
        }
    }

    getTaskCost(taskId: string) {
        return this.costTracker.getTaskCost(taskId);
    }

    async manualCondense(taskId: string) {
        const task = this.getTask(taskId);
        const result = await this.contextManager.condenseMessages(task.messages);
        task.messages = result.condensedMessages;
        return result;
    }
}
```

---

## Step 2: Update TaskHeader Component

```typescript
// webview-ui/src/components/Task/TaskHeader.tsx

import React from 'react';
import { CostBreakdown } from './CostBreakdown';
import { CondensingControls } from './CondensingControls';

interface TaskHeaderProps {
    task: Task;
    onCondense: () => void;
    onToggleAutoCondensing: (enabled: boolean) => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
    task,
    onCondense,
    onToggleAutoCondensing
}) => {
    const taskCost = task.costData; // From TaskManager

    return (
        <div className="task-header">
            {/* Existing task header content */}
            
            {/* Add cost breakdown */}
            {taskCost && (
                <CostBreakdown
                    inputTokens={taskCost.totalTokens.input}
                    outputTokens={taskCost.totalTokens.output}
                    cacheWrites={taskCost.totalTokens.cacheWrite}
                    cacheReads={taskCost.totalTokens.cacheRead}
                    totalCost={taskCost.totalCost.totalCost}
                    showDetails={true}
                />
            )}

            {/* Add condensing controls */}
            <CondensingControls
                autoCondensingEnabled={task.autoCondensingEnabled}
                isCondensing={task.isCondensing}
                lastCondensedAt={task.lastCondensedAt}
                condensingHistory={task.condensingHistory}
                onCondense={onCondense}
                onToggleAuto={onToggleAutoCondensing}
            />
        </div>
    );
};
```

---

## Step 3: Update Task State

```typescript
// Add to Task interface
interface Task {
    // ... existing fields ...
    
    // Context Intelligence fields
    costData?: TaskCost;
    autoCondensingEnabled: boolean;
    isCondensing: boolean;
    lastCondensedAt?: Date;
    condensingHistory: CondensingHistoryEntry[];
}

interface CondensingHistoryEntry {
    timestamp: Date;
    tokensBefore: number;
    tokensAfter: number;
    reductionPercent: number;
}
```

---

## Step 4: Wire Up Events

```typescript
// In your main React component
const handleCondense = async () => {
    setTask(prev => ({ ...prev, isCondensing: true }));
    
    try {
        const result = await taskManager.manualCondense(task.id);
        
        // Update task with condensed messages
        setTask(prev => ({
            ...prev,
            messages: result.condensedMessages,
            isCondensing: false,
            lastCondensedAt: new Date(),
            condensingHistory: [
                ...prev.condensingHistory,
                {
                    timestamp: new Date(),
                    tokensBefore: result.originalCount,
                    tokensAfter: result.condensedCount,
                    reductionPercent: result.reductionPercent
                }
            ]
        }));
    } catch (error) {
        console.error('Condensing failed:', error);
        setTask(prev => ({ ...prev, isCondensing: false }));
    }
};

const handleToggleAuto = (enabled: boolean) => {
    setTask(prev => ({ ...prev, autoCondensingEnabled: enabled }));
    // Persist to TaskStorage
    taskStorage.updateTask(task.id, { autoCondensingEnabled: enabled });
};

// Subscribe to cost updates
useEffect(() => {
    const updateCost = () => {
        const costData = taskManager.getTaskCost(task.id);
        setTask(prev => ({ ...prev, costData }));
    };

    taskManager.on('messageTracked', updateCost);
    return () => taskManager.off('messageTracked', updateCost);
}, [task.id]);
```

---

## Step 5: Update TaskStorage Schema

```sql
-- Add columns to tasks table
ALTER TABLE tasks ADD COLUMN auto_condensing_enabled INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN last_condensed_at TEXT;
ALTER TABLE tasks ADD COLUMN condensing_history TEXT; -- JSON array
```

```typescript
// Update TaskStorage methods
async updateTask(taskId: string, updates: Partial<Task>) {
    await this.db.run(
        `UPDATE tasks SET
            auto_condensing_enabled = ?,
            last_condensed_at = ?,
            condensing_history = ?
        WHERE id = ?`,
        [
            updates.autoCondensingEnabled ? 1 : 0,
            updates.lastCondensedAt?.toISOString(),
            JSON.stringify(updates.condensingHistory || []),
            taskId
        ]
    );
}
```

---

## Step 6: Environment Configuration

```typescript
// src/config/index.ts
export const getAnthropicAPIKey = (): string => {
    return vscode.workspace.getConfiguration('oropendola')
        .get('anthropicApiKey') || '';
};
```

```json
// package.json - Add configuration
{
  "contributes": {
    "configuration": {
      "properties": {
        "oropendola.anthropicApiKey": {
          "type": "string",
          "default": "",
          "description": "Anthropic API key for context intelligence features"
        },
        "oropendola.autoCondensingEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic message condensing at 80% context usage"
        },
        "oropendola.condensingThreshold": {
          "type": "number",
          "default": 80,
          "description": "Percentage of context usage before auto-condensing triggers"
        }
      }
    }
  }
}
```

---

## Testing Checklist

- [ ] TokenCounter counts tokens correctly
- [ ] CostTracker aggregates costs per task
- [ ] MessageCondenser preserves code blocks
- [ ] ContextManager triggers at 80%
- [ ] UI components render correctly
- [ ] Manual condensing works
- [ ] Auto-condensing toggles correctly
- [ ] History displays properly
- [ ] Cost breakdown shows accurate data
- [ ] Cache metrics calculate correctly

---

## Common Issues & Solutions

### Issue: "Cannot find module '@anthropic-ai/sdk'"
**Solution:** Run `npm install @anthropic-ai/sdk`

### Issue: Tests fail with "describe is not defined"
**Solution:** Run `npm install --save-dev @types/jest`

### Issue: Lint errors prevent testing
**Solution:** Temporarily skip lint with `npm test -- --no-lint`

### Issue: TokenCounter returns 0
**Solution:** Check API key is configured correctly

### Issue: Auto-condensing not triggering
**Solution:** Verify threshold is set correctly (default 80%)

---

## Performance Tips

1. **Token Counting:**
   - Use fallback estimation for offline mode
   - Cache counted values where possible
   - Batch multiple messages together

2. **Cost Tracking:**
   - Store in-memory Map for fast access
   - Persist to database periodically
   - Lazy-load history for older tasks

3. **Message Condensing:**
   - Process in batches of 50 messages
   - Validate quality before accepting
   - Preserve recent 5 messages always

4. **UI Updates:**
   - Debounce cost updates (500ms)
   - Lazy-load history with pagination
   - Use React.memo for components

---

## Next Steps

1. Complete integration in TaskManager
2. Wire up UI components
3. Add unit/integration tests
4. Test with real conversations
5. Optimize performance
6. Deploy to production

**Estimated Time:** 8-12 hours for full integration

---

**Questions?** Check SPRINT_3-4_COMPLETION_SUMMARY.md for detailed implementation notes.
