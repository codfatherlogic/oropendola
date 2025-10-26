# Roo-Code Interface Architecture - Oropendola AI

## Overview
Complete replacement of simple chat interface with Roo-Code's task-based workflow system.

**Goal:** Implement full Roo-Code interface while maintaining single backend at oropendola.ai

---

## Component Architecture

### 1. Task Container Component
**File:** `webview-ui/src/components/Task/TaskContainer.tsx`

**Purpose:** Main container for a task with checkpoints

**Structure:**
```tsx
<TaskContainer>
  <TaskHeader
    title="Add colors to this website"
    metrics={{ tokens: 11700, time: "1.0m", cost: 0.02 }}
    onClose={handleClose}
  />
  <CheckpointList>
    <Checkpoint id="initial" status="current">
      <APIRequest id="d037" status="completed">
        <InvestigationMessage text="Investigating Color Integration..." />
        <FileReadRequest file="style.css" maxLines={500} />
      </APIRequest>
      <APIRequest id="d038" status="in_progress">
        <ProcessingMessage text="Applying the Color Palette..." />
      </APIRequest>
    </Checkpoint>
  </CheckpointList>
  <AutoApproveControls permissions={permissions} />
  <TaskInput onSubmit={handleSubmit} onCancel={handleCancel} />
</TaskContainer>
```

**State:**
- Current task info (title, metrics)
- Checkpoints array
- Current checkpoint ID
- API requests for each checkpoint
- Auto-approve permissions

---

### 2. Task Header Component
**File:** `webview-ui/src/components/Task/TaskHeader.tsx`

**Props:**
- `title: string` - Task description
- `metrics: { tokens: number, time: string, cost: number }`
- `onClose: () => void`

**UI:**
```
┌────────────────────────────────────────────┐
│ Task: Add colors to this website     [X]  │
│ 11.7k    1.0m    $0.02                    │
└────────────────────────────────────────────┘
```

---

### 3. Checkpoint Component
**File:** `webview-ui/src/components/Task/Checkpoint.tsx`

**Props:**
- `id: string` - Unique checkpoint ID
- `label: string` - "Initial Checkpoint", "After Review", etc.
- `status: 'current' | 'completed' | 'pending'`
- `children: React.ReactNode` - API requests

**UI:**
```
🔵 Initial Checkpoint        Current
   └─ [API Request #d037]  ✓
   └─ [API Request #d038]  ⟳
```

---

### 4. API Request Component
**File:** `webview-ui/src/components/Task/APIRequest.tsx`

**Props:**
- `id: string` - Request ID (e.g., "d037")
- `status: 'pending' | 'in_progress' | 'completed' | 'error'`
- `expandable: boolean` - Can collapse/expand
- `children: React.ReactNode` - Request content

**UI:**
```
✓ API Request  #d037  ▼
  ├─ **Investigating Color Integration** I've reviewed...
  └─ Roo wants to read this file:
     style.css (max 500 lines)  [Open]
```

---

### 5. File Read Request Component
**File:** `webview-ui/src/components/Task/FileReadRequest.tsx`

**Props:**
- `filename: string`
- `maxLines?: number`
- `onApprove: () => void`
- `onDeny: () => void`

**UI:**
```
📄 Roo wants to read this file:
   style.css (max 500 lines)         [Open Icon]
```

---

### 6. Auto-Approve Controls Component
**File:** `webview-ui/src/components/Task/AutoApproveControls.tsx`

**Props:**
- `permissions: Permission[]`
- `onChange: (permissions: Permission[]) => void`

**Permissions:**
- Read
- Write
- Execute
- Browser
- MCP
- Mode
- Subtasks
- Retry

**UI:**
```
✓ Auto-approve: Read, Write, Execute, Browser, MCP, Mode... ▶

  [When expanded:]
  ☑ Read      ☑ Write     ☑ Execute   ☑ Browser
  ☑ MCP       ☑ Mode      ☑ Subtasks  ☑ Retry
```

---

### 7. Task Input Component
**File:** `webview-ui/src/components/Task/TaskInput.tsx`

**Props:**
- `onSubmit: (message: string) => void`
- `onCancel: () => void`
- `placeholder?: string`

**UI:**
```
┌────────────────────────────────────────────┐
│                 [Cancel]                   │
├────────────────────────────────────────────┤
│ Type a message...                          │
│ (⌘ to add context / to switch modes,      │
│  hold shift to drop in files)              │
└────────────────────────────────────────────┘
```

---

## Data Models

### Task Interface
```typescript
interface Task {
  id: string;
  title: string;
  metrics: {
    tokens: number;
    time: string;
    cost: number;
  };
  checkpoints: Checkpoint[];
  currentCheckpointId: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

### Checkpoint Interface
```typescript
interface Checkpoint {
  id: string;
  label: string;
  status: 'current' | 'completed' | 'pending';
  apiRequests: APIRequest[];
  createdAt: Date;
}
```

### API Request Interface
```typescript
interface APIRequest {
  id: string;
  type: 'message' | 'file_read' | 'file_write' | 'execute' | 'browser';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  content: {
    text?: string;
    file?: FileRequest;
    command?: string;
  };
  response?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

### File Request Interface
```typescript
interface FileRequest {
  filename: string;
  path: string;
  maxLines?: number;
  approved: boolean;
}
```

### Permission Interface
```typescript
interface Permission {
  id: 'read' | 'write' | 'execute' | 'browser' | 'mcp' | 'mode' | 'subtasks' | 'retry';
  label: string;
  enabled: boolean;
}
```

---

## State Management

### Task State (using Context + Reducer)

**File:** `webview-ui/src/context/TaskContext.tsx`

```typescript
interface TaskState {
  currentTask: Task | null;
  taskHistory: Task[];
  autoApprovePermissions: Permission[];
}

type TaskAction =
  | { type: 'CREATE_TASK'; payload: { title: string } }
  | { type: 'ADD_CHECKPOINT'; payload: { label: string } }
  | { type: 'ADD_API_REQUEST'; payload: APIRequest }
  | { type: 'UPDATE_REQUEST_STATUS'; payload: { requestId: string; status: string } }
  | { type: 'UPDATE_METRICS'; payload: { tokens: number; time: string; cost: number } }
  | { type: 'UPDATE_PERMISSIONS'; payload: Permission[] }
  | { type: 'CANCEL_TASK' }
  | { type: 'COMPLETE_TASK' };
```

---

## Communication with Backend

### WebSocket Messages

**1. Start Task**
```json
{
  "type": "start_task",
  "payload": {
    "title": "Add colors to this website",
    "context": ["file1.css", "file2.html"]
  }
}
```

**2. API Request**
```json
{
  "type": "api_request",
  "payload": {
    "checkpointId": "checkpoint-1",
    "requestType": "file_read",
    "file": {
      "path": "style.css",
      "maxLines": 500
    }
  }
}
```

**3. Update Metrics**
```json
{
  "type": "update_metrics",
  "payload": {
    "tokens": 11700,
    "time": "1.0m",
    "cost": 0.02
  }
}
```

**4. Request Permission**
```json
{
  "type": "request_permission",
  "payload": {
    "permission": "read",
    "file": "style.css"
  }
}
```

**Backend Response:**
```json
{
  "type": "permission_response",
  "payload": {
    "granted": true,
    "autoApprove": false
  }
}
```

---

## CSS Structure

### New Roo-Code Styles
**File:** `webview-ui/src/styles/RooCodeTask.css`

**Key Classes:**
- `.roo-task-container` - Main task wrapper
- `.roo-task-header` - Task title and metrics
- `.roo-task-metrics` - Token/time/cost display
- `.roo-checkpoint` - Checkpoint container
- `.roo-checkpoint-current` - Active checkpoint highlight
- `.roo-api-request` - API request card
- `.roo-api-request-badge` - Request ID badge (#d037)
- `.roo-file-request` - File read request
- `.roo-auto-approve` - Auto-approve controls
- `.roo-permission-toggle` - Individual permission switch
- `.roo-task-input` - Bottom input area
- `.roo-cancel-btn` - Full-width cancel button

---

## Migration Plan

### Phase 1: Core Components (Week 1)
1. Create TaskContainer component
2. Create TaskHeader with metrics
3. Create Checkpoint component
4. Create APIRequest component
5. Create basic state management

### Phase 2: Interactive Features (Week 2)
1. Implement FileReadRequest component
2. Add AutoApproveControls
3. Implement permission system
4. Add checkpoint navigation

### Phase 3: Backend Integration (Week 3)
1. Update WebSocket message handlers
2. Implement real-time metrics updates
3. Add permission approval flow
4. Integrate with oropendola.ai backend

### Phase 4: Polish & Testing (Week 4)
1. Complete CSS styling to match Roo-Code exactly
2. Add animations and transitions
3. Test all workflows
4. Performance optimization

---

## Key Differences from Current Implementation

| Current (Chat-based) | New (Task-based) |
|---------------------|------------------|
| Simple message list | Task with checkpoints |
| No tracking | Real-time token/time/cost tracking |
| No permissions | Granular auto-approve controls |
| No file preview | File read requests with approval |
| No request IDs | Each API request has unique ID |
| Linear conversation | Checkpoint-based workflow |
| Basic input | Advanced input with context/mode switching |

---

## Single Backend Confirmation

✅ **Backend:** https://oropendola.ai (unchanged)
✅ **Authentication:** Session-based (unchanged)
✅ **No model selector:** Backend decides model
✅ **No API keys:** Managed by backend

**New Backend Requirements:**
- Return task metrics (tokens, time, cost)
- Support checkpoint system
- Handle permission requests
- Provide API request IDs
- Stream updates for real-time tracking

---

## Next Steps

1. ✅ Create this architecture document
2. ⏳ Implement TaskContainer skeleton
3. ⏳ Create TaskHeader component
4. ⏳ Build Checkpoint component
5. ⏳ Implement APIRequest component
6. ⏳ Add state management
7. ⏳ Integrate with backend
8. ⏳ Style to match Roo-Code exactly

---

**Status:** 🟡 Architecture Defined - Ready for Implementation

**Estimated Timeline:** 4 weeks for full implementation

**Priority:** HIGH - Complete interface overhaul
