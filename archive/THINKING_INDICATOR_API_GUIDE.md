# Thinking Indicator API Integration Guide

**Quick reference for frontend developers integrating with the new backend endpoints.**

---

## Overview

The backend now supports:
1. **AI Reasoning Chunks** - Stream thinking process in real-time
2. **Batch File Operations** - Read/write multiple files with individual permissions
3. **Auto-Approval Settings** - Persist user preferences

---

## 1. Chat with Reasoning

### Endpoint
```
POST /api/method/ai_assistant.api.oropendola.chat
```

### Request
```json
{
  "message": "Design a scalable microservices architecture",
  "images": [],  // Optional: base64 images
  "session_id": null  // Optional: for conversation continuity
}
```

### Response (SSE Stream)
```
Content-Type: text/event-stream

data: {"ts":1698364800000,"type":"say","say":"thinking","text":"Processing..."}

data: {"ts":1698364801000,"type":"say","say":"reasoning","text":"Analyzing requirements...","partial":true}

data: {"ts":1698364802000,"type":"say","say":"reasoning","text":"Considering scalability...","partial":true}

data: {"ts":1698364803000,"type":"say","say":"reasoning","text":"","partial":false}

data: {"ts":1698364804000,"type":"say","say":"text","text":"Here's the architecture:...","partial":true}

data: {"ts":1698364805000,"type":"say","say":"text","text":"","partial":false}

data: [DONE]
```

### Message Types

| `say` Value | Purpose | Frontend Component |
|-------------|---------|-------------------|
| `thinking` | Initial loading | Show "Processing..." |
| `reasoning` | AI thinking process | `<ReasoningBlock>` with timer |
| `text` | AI response | `<ChatRow>` text display |
| `api_req_started` | Model call started | Optional: show model name |
| `api_req_finished` | Model call finished | Optional: show token usage |

### TypeScript Integration
```typescript
const eventSource = new EventSource(
  `${API_BASE}/api/method/ai_assistant.api.oropendola.chat?` +
  new URLSearchParams({
    message: userMessage,
    session_id: sessionId || ''
  }),
  { withCredentials: true }
)

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close()
    return
  }
  
  const message = JSON.parse(event.data)
  
  if (message.say === 'reasoning') {
    // Display in ReasoningBlock component
    setReasoningContent(prev => prev + message.text)
  } else if (message.say === 'text') {
    // Display in ChatRow component
    setResponseContent(prev => prev + message.text)
  }
}
```

---

## 2. Batch File Read

### Endpoint
```
POST /api/method/ai_assistant.api.file_operations.read_files_batch
```

### Request
```json
{
  "files": [
    {"path": "src/components/App.tsx", "key": "app"},
    {"path": "src/utils/helper.ts", "key": "helper"},
    {"path": "README.md", "key": "readme"}
  ],
  "permissions": {
    "app": true,      // User approved
    "helper": true,   // User approved
    "readme": false   // User denied
  }
}
```

### Response
```json
{
  "success": true,
  "results": [
    {
      "key": "app",
      "path": "src/components/App.tsx",
      "content": "import React...",
      "size": 1234,
      "success": true
    },
    {
      "key": "helper",
      "path": "src/utils/helper.ts",
      "content": "export const...",
      "size": 567,
      "success": true
    },
    {
      "key": "readme",
      "error": "Permission denied by user",
      "success": false
    }
  ],
  "total": 3,
  "approved": 2,
  "denied": 1
}
```

### TypeScript Integration
```typescript
interface FilePermission {
  [key: string]: boolean  // key -> approved
}

async function readFiles(
  files: Array<{path: string, key: string}>,
  permissions: FilePermission
) {
  const response = await fetch(
    `${API_BASE}/api/method/ai_assistant.api.file_operations.read_files_batch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ files, permissions })
    }
  )
  
  const result = await response.json()
  
  // Process results
  result.results.forEach(file => {
    if (file.success) {
      console.log(`Read ${file.path}: ${file.size} bytes`)
    } else {
      console.error(`Failed ${file.key}: ${file.error}`)
    }
  })
  
  return result
}

// Usage with BatchFilePermission component
const permissions = await new Promise<FilePermission>(resolve => {
  setShowBatchPermission({
    files: filesToRead,
    onPermissionResponse: resolve
  })
})

const result = await readFiles(filesToRead, permissions)
```

---

## 3. Batch Diff Apply

### Endpoint
```
POST /api/method/ai_assistant.api.file_operations.apply_diffs_batch
```

### Request
```json
{
  "diffs": [
    {
      "path": "src/App.tsx",
      "key": "diff1",
      "content": "import React from 'react'\n\nfunction App() {\n  return <div>Updated</div>\n}\n"
    },
    {
      "path": "src/utils.ts",
      "key": "diff2",
      "content": "export const helper = () => { return 42 }\n"
    }
  ],
  "permissions": {
    "diff1": true,   // Apply this diff
    "diff2": false   // Skip this diff
  }
}
```

### Response
```json
{
  "success": true,
  "results": [
    {
      "key": "diff1",
      "path": "src/App.tsx",
      "success": true,
      "backup": "src/App.tsx.backup_1698364800",
      "size": 123
    },
    {
      "key": "diff2",
      "error": "Permission denied by user",
      "success": false
    }
  ],
  "total": 2,
  "applied": 1,
  "denied": 1
}
```

### TypeScript Integration
```typescript
interface DiffPermission {
  [key: string]: boolean  // key -> approved
}

async function applyDiffs(
  diffs: Array<{path: string, key: string, content: string}>,
  permissions: DiffPermission
) {
  const response = await fetch(
    `${API_BASE}/api/method/ai_assistant.api.file_operations.apply_diffs_batch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ diffs, permissions })
    }
  )
  
  const result = await response.json()
  
  // Process results
  result.results.forEach(diff => {
    if (diff.success) {
      console.log(`Applied ${diff.path}`)
      if (diff.backup) {
        console.log(`  Backup: ${diff.backup}`)
      }
    } else {
      console.error(`Failed ${diff.key}: ${diff.error}`)
    }
  })
  
  return result
}

// Usage with BatchDiffApproval component
const permissions = await new Promise<DiffPermission>(resolve => {
  setShowBatchDiffApproval({
    diffs: diffsToApply,
    onPermissionResponse: resolve
  })
})

const result = await applyDiffs(diffsToApply, permissions)
```

---

## 4. Auto-Approval Settings

### Get Settings
```
GET /api/method/ai_assistant.api.oropendola.get_auto_approve_settings
```

**Response:**
```json
{
  "autoApprovalEnabled": true,
  "toggles": {
    "alwaysAllowReadOnly": true,
    "alwaysAllowWrite": false,
    "alwaysAllowExecute": false,
    "alwaysAllowBrowser": false,
    "alwaysAllowMcp": false,
    "alwaysAllowModeSwitch": true,
    "alwaysAllowSubtasks": true,
    "alwaysApproveResubmit": true,
    "alwaysAllowFollowupQuestions": true,
    "alwaysAllowUpdateTodoList": true
  }
}
```

### Save Settings
```
POST /api/method/ai_assistant.api.oropendola.save_auto_approve_settings
```

**Request:**
```json
{
  "autoApprovalEnabled": true,
  "toggles": {
    "alwaysAllowReadOnly": true,
    "alwaysAllowWrite": false,
    ...
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### TypeScript Integration
```typescript
interface AutoApproveSettings {
  autoApprovalEnabled: boolean
  toggles: {
    alwaysAllowReadOnly: boolean
    alwaysAllowWrite: boolean
    alwaysAllowExecute: boolean
    alwaysAllowBrowser: boolean
    alwaysAllowMcp: boolean
    alwaysAllowModeSwitch: boolean
    alwaysAllowSubtasks: boolean
    alwaysApproveResubmit: boolean
    alwaysAllowFollowupQuestions: boolean
    alwaysAllowUpdateTodoList: boolean
  }
}

// Load settings on startup
async function loadSettings(): Promise<AutoApproveSettings> {
  const response = await fetch(
    `${API_BASE}/api/method/ai_assistant.api.oropendola.get_auto_approve_settings`,
    { credentials: 'include' }
  )
  return await response.json()
}

// Save settings when user changes toggles
async function saveSettings(settings: AutoApproveSettings) {
  const response = await fetch(
    `${API_BASE}/api/method/ai_assistant.api.oropendola.save_auto_approve_settings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings)
    }
  )
  return await response.json()
}
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Permission denied by user` | User clicked "Deny" | Normal behavior |
| `Invalid or unsafe file path` | Path outside workspace | Check path |
| `File not found` | File doesn't exist | Verify file exists |
| `Invalid JSON format` | Malformed request | Check JSON syntax |
| `Rate limit exceeded` | Too many requests | Wait and retry |

### TypeScript Error Handler
```typescript
interface APIResponse<T> {
  success: boolean
  error?: string
  // ... other fields depend on endpoint
}

async function callAPI<T>(
  endpoint: string,
  data: any
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    
    const result = await response.json() as APIResponse<T>
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    
    return result as T
    
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw error
  }
}
```

---

## Testing

### cURL Examples

**Test Reasoning:**
```bash
curl -N -X POST https://oropendola.ai/api/method/ai_assistant.api.oropendola.chat \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sid=YOUR_SESSION_ID' \
  -d '{"message":"Design a scalable architecture","session_id":null}'
```

**Test Batch Read:**
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.file_operations.read_files_batch \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sid=YOUR_SESSION_ID' \
  -d '{
    "files":[{"path":"README.md","key":"readme"}],
    "permissions":{"readme":true}
  }'
```

---

## Migration Notes

### From Old Format
If you were using non-streaming chat:
```typescript
// OLD (non-streaming)
const response = await fetch('/api/method/ai_assistant.api.chat', {
  method: 'POST',
  body: JSON.stringify({ message })
})
const data = await response.json()
console.log(data.response)

// NEW (streaming with reasoning)
const eventSource = new EventSource('/api/method/ai_assistant.api.oropendola.chat?message=' + message)
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data)
  if (chunk.say === 'reasoning') {
    // NEW: Display thinking process
  } else if (chunk.say === 'text') {
    // Display response (same as before)
  }
}
```

---

## Performance Tips

1. **Reasoning Chunks**: Buffer small chunks to avoid excessive re-renders
2. **Batch Operations**: Group file operations when possible
3. **Auto-Approval**: Cache settings in memory, sync on change
4. **SSE Connections**: Reuse EventSource when possible

---

## Support

**Documentation:** `BACKEND_WORK_PENDING.md`  
**Integration Examples:** `webview-ui/src/components/Chat/`  
**Test Components:** `BatchFilePermission.tsx`, `BatchDiffApproval.tsx`, `ReasoningBlock.tsx`

**Last Updated:** October 27, 2025
