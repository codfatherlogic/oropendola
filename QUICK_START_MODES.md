# Quick Start: Agent & Ask Modes

## 🚀 What You Need to Know

Oropendola AI now has **two modes** that control how it interacts with your code:

```
┌─────────────────────────────────────┐
│  🤖 AGENT MODE (Default)            │
│  ✅ Can modify files                │
│  ✅ Can create files                │
│  ✅ Can execute actions             │
│  📋 Use for: Building, fixing       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  💬 ASK MODE (Safe)                 │
│  ❌ Cannot modify files             │
│  ✅ Can explain and suggest         │
│  ✅ Read-only access                │
│  📋 Use for: Learning, reviewing    │
└─────────────────────────────────────┘
```

---

## 📍 Where to Find It

Open the Oropendola sidebar and look for:

```
┌───────────────────────────────────┐
│  🐦 Oropendola AI      [➕][⚙️][🚪]│
├───────────────────────────────────┤
│  MODE                             │
│  ┌─────────┐ ┌─────────┐         │
│  │🤖 Agent │ │💬 Ask   │         │
│  └─────────┘ └─────────┘         │
│  Agent mode can execute actions   │
│  and modify your workspace files. │
├───────────────────────────────────┤
│                                   │
│  [Chat messages appear here]      │
│                                   │
└───────────────────────────────────┘
```

---

## 🎯 Quick Examples

### Example 1: Building (Use Agent Mode)

**You**: "Create a user authentication module"

**Agent Mode**: 
- ✅ Creates `auth.js`
- ✅ Writes complete code
- ✅ Opens file in editor

### Example 2: Learning (Use Ask Mode)

**You**: "How does JWT authentication work?"

**Ask Mode**:
- ✅ Explains concept
- ✅ Shows example code
- ❌ Doesn't create files

---

## 🔄 Switching Modes

**Method 1**: Click the button
1. Click **💬 Ask** or **🤖 Agent** button
2. Mode changes instantly
3. Description updates

**Method 2**: During conversation
- Switch anytime mid-conversation
- Previous messages stay the same
- New messages use selected mode

---

## ⚡ Common Workflows

### Workflow 1: Build → Review
```
1. Start in 🤖 Agent mode
2. "Create a REST API endpoint"
3. AI creates files
4. Switch to 💬 Ask mode
5. "Review this code for security issues"
6. AI explains without changing
```

### Workflow 2: Learn → Implement
```
1. Start in 💬 Ask mode
2. "Explain dependency injection"
3. AI explains concept
4. Switch to 🤖 Agent mode
5. "Implement DI in my project"
6. AI creates files
```

---

## 🛡️ Safety Tips

### Always Use Agent Mode When:
✅ Building new features
✅ Fixing bugs that need changes
✅ Refactoring code
✅ Generating files

### Always Use Ask Mode When:
✅ Learning new concepts
✅ Understanding existing code
✅ Getting suggestions
✅ Unsure if changes are needed

### Pro Tip:
When in doubt, start with **Ask mode**. You can always switch to Agent mode later!

---

## 🔧 Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Open Chat | `Cmd+Shift+C` | `Ctrl+Shift+C` |
| Explain Code | `Cmd+Shift+E` | `Ctrl+Shift+E` |
| Fix Code | `Cmd+Shift+F` | `Ctrl+Shift+F` |
| Improve Code | `Cmd+Shift+I` | `Ctrl+Shift+I` |

*Mode switching is currently mouse-only*

---

## ❓ FAQ

**Q: Which mode is default?**  
A: 🤖 **Agent mode** is default for backward compatibility.

**Q: Can I switch modes mid-conversation?**  
A: ✅ **Yes!** Switch anytime - changes apply to new messages only.

**Q: Will Ask mode execute any code?**  
A: ❌ **No!** Ask mode is completely read-only. Zero file modifications.

**Q: What happens if I switch to Ask mode while AI is generating?**  
A: Current generation completes, new mode applies to next message.

**Q: Can I set Ask mode as default?**  
A: Not yet - coming in a future update!

---

## 🎓 Best Practices

### 1. Start Safe
Begin in Ask mode if you're exploring

### 2. Review Before Accepting
Always review Agent mode changes before clicking Accept

### 3. Use Version Control
Always use Git when working in Agent mode

### 4. Learn Then Build
Ask mode to understand → Agent mode to implement

### 5. Mode for Task
Match the mode to your current task

---

## 🐛 Troubleshooting

**Problem**: Mode button not responding  
**Fix**: Reload the sidebar (close and reopen)

**Problem**: Agent mode not creating files  
**Fix**: Check you have a workspace folder open

**Problem**: I'm in Ask mode but want to build  
**Fix**: Click the **🤖 Agent** button

---

## 📚 More Information

For detailed documentation, see:
- **AGENT_ASK_MODE_GUIDE.md** - Complete user guide
- **AGENT_ASK_MODE_IMPLEMENTATION.md** - Technical details

---

## ✨ That's It!

You now know how to use Agent and Ask modes!

**Remember**:
- 🤖 **Agent** = Build and modify
- 💬 **Ask** = Learn and explore

**Happy coding! 🐦**

---

*Last updated: 2025-10-18*  
*Oropendola AI Assistant v2.0.0*
