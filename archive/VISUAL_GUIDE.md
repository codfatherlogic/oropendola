# Visual Guide: Agent & Ask Modes

## What You'll See in Your Sidebar

### Default View (Agent Mode Active)

```
┌─────────────────────────────────────┐
│  🐦 Oropendola AI      [➕][⚙️][🚪]│
├─────────────────────────────────────┤
│  MODE                               │
│  ┌──────────────┐ ┌──────────────┐ │
│  │  🤖 Agent    │ │  💬 Ask      │ │
│  │  (Active)    │ │              │ │
│  └──────────────┘ └──────────────┘ │
│                                     │
│  Agent mode can execute actions     │
│  and modify your workspace files.   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  💬 Build with agent mode   │   │
│  │                             │   │
│  │  AI responses may be        │   │
│  │  inaccurate.                │   │
│  │                             │   │
│  │  [🔍 Explain selected code] │   │
│  │  [🐛 Fix bugs in code]      │   │
│  │  [📝 Add code comments]     │   │
│  │  [⚡ Improve performance]   │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  📎  [Type your message...]    [▶] │
└─────────────────────────────────────┘
```

### After Clicking "Ask" Button

```
┌─────────────────────────────────────┐
│  🐦 Oropendola AI      [➕][⚙️][🚪]│
├─────────────────────────────────────┤
│  MODE                               │
│  ┌──────────────┐ ┌──────────────┐ │
│  │  🤖 Agent    │ │  💬 Ask      │ │
│  │              │ │  (Active)    │ │
│  └──────────────┘ └──────────────┘ │
│                                     │
│  Ask mode provides answers and      │
│  suggestions without modifying      │
│  files.                             │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  💬 Ask questions           │   │
│  │                             │   │
│  │  AI responses may be        │   │
│  │  inaccurate.                │   │
│  │                             │   │
│  │  [🔍 Explain selected code] │   │
│  │  [🐛 Fix bugs in code]      │   │
│  │  [📝 Add code comments]     │   │
│  │  [⚡ Improve performance]   │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  📎  [Type your message...]    [▶] │
└─────────────────────────────────────┘
```

---

## Visual Changes When Switching

### 1. Button Highlighting

**Agent Mode Active**:
```
┌──────────────┐ ┌──────────────┐
│  🤖 Agent    │ │  💬 Ask      │
│  ╔══════════╗│ │              │
│  ║ ACTIVE   ║│ │              │
│  ╚══════════╝│ │              │
└──────────────┘ └──────────────┘
     (Blue)          (Gray)
```

**Ask Mode Active**:
```
┌──────────────┐ ┌──────────────┐
│  🤖 Agent    │ │  💬 Ask      │
│              │ │  ╔══════════╗│
│              │ │  ║ ACTIVE   ║│
│              │ │  ╚══════════╝│
└──────────────┘ └──────────────┘
     (Gray)          (Blue)
```

### 2. Description Text Changes

**Agent Mode**:
```
┌───────────────────────────────────┐
│ Agent mode can execute actions    │
│ and modify your workspace files.  │
└───────────────────────────────────┘
```

**Ask Mode**:
```
┌───────────────────────────────────┐
│ Ask mode provides answers and     │
│ suggestions without modifying     │
│ files.                            │
└───────────────────────────────────┘
```

### 3. Empty State Title Changes

**Agent Mode**:
```
┌─────────────────────────────┐
│  💬 Build with agent mode   │
└─────────────────────────────┘
```

**Ask Mode**:
```
┌─────────────────────────────┐
│  💬 Ask questions           │
└─────────────────────────────┘
```

---

## Example Interaction Flows

### Flow 1: Create File (Agent Mode)

```
User: [🤖 Agent mode active]
User: "Create a calculator.js file"

AI: I'll create a calculator file for you.

┌────────────────────────────────┐
│ ✅ Created file:               │
│    calculator.js               │
└────────────────────────────────┘

[File appears in workspace]
[File opens in editor]
```

### Flow 2: Ask Question (Ask Mode)

```
User: [💬 Ask mode active]
User: "Create a calculator.js file"

AI: I can explain how to create a
    calculator file, but I won't
    create it for you in Ask mode.
    
    Here's what you would include:
    - Basic arithmetic functions
    - Error handling
    - Input validation
    
    Would you like me to switch to
    Agent mode and create it?

[No file created]
[No workspace changes]
```

### Flow 3: Mode Switch Mid-Conversation

```
┌─────────────────────────────────────┐
│ [💬 Ask mode]                       │
│                                     │
│ User: "How does async/await work?"  │
│                                     │
│ AI: [Explains async/await]          │
│                                     │
│ [User clicks 🤖 Agent]              │
│                                     │
│ User: "Add async/await to my code"  │
│                                     │
│ AI: ✅ [Modifies code file]         │
└─────────────────────────────────────┘
```

---

## Color Scheme (VS Code Theme)

### Light Theme
```
Active Mode: Blue (#007ACC)
Inactive Mode: Gray (#CCCCCC)
Background: White (#FFFFFF)
Text: Black (#000000)
```

### Dark Theme
```
Active Mode: Blue (#0E639C)
Inactive Mode: Gray (#3C3C3C)
Background: Dark (#1E1E1E)
Text: White (#CCCCCC)
```

---

## Button States

### Normal (Inactive)
```
┌──────────────┐
│  💬 Ask      │  ← Gray border
│              │  ← Gray text
└──────────────┘
```

### Hover
```
┌──────────────┐
│  💬 Ask      │  ← Blue border
│              │  ← Slightly darker
└──────────────┘
```

### Active
```
┌──────────────┐
│  💬 Ask      │  ← Blue background
│              │  ← White text
└──────────────┘
```

---

## Console Output Examples

### Switching to Ask Mode
```
[Extension Host] 🔄 Switched to ask mode
```

### Ask Mode Ignoring Tools
```
[Extension Host] ℹ️ ASK mode: Ignoring tool calls (read-only mode)
[Extension Host] 📊 Total tool calls found: 0
```

### Switching to Agent Mode
```
[Extension Host] 🔄 Switched to agent mode
[Extension Host] 🔧 [1/1] Executing: create_file
[Extension Host] ✅ Created file: test.js
```

---

## Mobile/Compact View

```
┌───────────────────┐
│ 🐦 Oropendola AI  │
├───────────────────┤
│ MODE              │
│ [🤖][💬]          │
│ Agent mode...     │
├───────────────────┤
│                   │
│ [Messages]        │
│                   │
├───────────────────┤
│ [Input]      [▶] │
└───────────────────┘
```

---

## Accessibility

### Screen Reader Announcements

**Switching to Agent Mode**:
```
"Mode changed to Agent. 
Agent mode can execute actions 
and modify your workspace files."
```

**Switching to Ask Mode**:
```
"Mode changed to Ask. 
Ask mode provides answers and 
suggestions without modifying files."
```

### Keyboard Navigation
```
Tab → Focus mode buttons
Enter/Space → Activate selected mode
Tab → Move to next element
```

---

## Animation Timings

```
Mode Switch: 200ms fade transition
Button Highlight: Instant
Description Update: 150ms fade
Empty State: 200ms fade
```

---

## Visual Indicators Summary

| Element | Agent Mode | Ask Mode |
|---------|-----------|----------|
| Button | Blue ✅ | Gray |
| Icon | 🤖 | 💬 |
| Description | "...execute actions..." | "...without modifying..." |
| Empty Title | "Build with agent" | "Ask questions" |
| Console | "agent mode" | "ask mode" |

---

## What Users Will Experience

### First Time Opening
1. See sidebar with mode selector
2. Agent mode pre-selected (blue)
3. Description explains current mode
4. Empty state shows suggestions

### Switching Modes
1. Click desired mode button
2. Button turns blue instantly
3. Description fades in (200ms)
4. Console logs mode change
5. Ready for next message

### Sending Messages
1. Type message
2. AI processes in current mode
3. Agent: May create/modify files
4. Ask: Only provides text response

---

**This is what your users will see!** 🎨

*Visual guide created for Oropendola AI Assistant v2.0.0*
