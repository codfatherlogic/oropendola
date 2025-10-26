# 🎨 Multi-Mode AI Assistant - User Guide

**Version**: v3.7.0  
**Feature**: Multi-Mode System  
**Status**: Production Ready

---

## 🌟 Overview

Oropendola v3.7.0 introduces a **Multi-Mode AI Assistant System** that lets you switch between different AI behaviors to match your specific task. Each mode has unique characteristics, verbosity levels, and capabilities.

### Why Use Different Modes?

Different tasks require different approaches:

- **Writing code quickly?** → Use **Code Mode** (fast, concise)
- **Planning architecture?** → Use **Architect Mode** (comprehensive, design-focused)
- **Learning how code works?** → Use **Ask Mode** (educational, read-only)
- **Debugging a problem?** → Use **Debug Mode** (systematic, investigative)

---

## 🎯 Available Modes

### 1. **Code Mode** (Default)
**Icon**: 💻 | **Color**: Blue | **Verbosity**: 2/5

**Best For**:
- Quick code implementations
- Fixing bugs rapidly
- Adding features to existing code
- Refactoring code

**Capabilities**:
- ✅ Can modify files
- ✅ Can execute terminal commands
- ✅ Can install packages
- ✅ Can run tests

**AI Behavior**:
- Concise and practical
- Shows code immediately
- Minimal explanations (unless asked)
- Focuses on getting things done

**Example Use Cases**:
```
✓ "Add error handling to this function"
✓ "Fix the bug in user authentication"
✓ "Implement the search feature"
✓ "Refactor this component to use hooks"
```

**Sample Interaction**:
```
You: "Add validation to this form"

AI: *Shows updated code immediately*
    Added email and password validation.
    Testing: npm test
```

---

### 2. **Architect Mode**
**Icon**: 🏗️ | **Color**: Purple | **Verbosity**: 4/5

**Best For**:
- System design and planning
- Architecture reviews
- Design pattern discussions
- High-level planning

**Capabilities**:
- ✅ Can modify files (for documentation, diagrams)
- ❌ Cannot execute terminal commands
- ❌ Cannot install packages
- ❌ Cannot run tests

**AI Behavior**:
- Comprehensive and thorough
- Explains trade-offs and alternatives
- Discusses design patterns
- Focuses on long-term maintainability
- Creates diagrams and documentation

**Example Use Cases**:
```
✓ "Design a caching layer for this application"
✓ "Review the architecture of this microservice"
✓ "What's the best pattern for state management here?"
✓ "Plan the database schema for a social media app"
```

**Sample Interaction**:
```
You: "Design a caching layer"

AI: Let me analyze the requirements and propose a comprehensive solution:

    1. Requirements Analysis:
       - Current bottlenecks: Database queries (500ms avg)
       - Traffic patterns: 80% reads, 20% writes
       - Data freshness: Can tolerate 5min staleness

    2. Architecture Options:
       
       Option A: Redis with Write-Through Cache
       Pros:
       - Simple implementation
       - Strong consistency
       Cons:
       - Write latency increased
       - Cache always populated
       
       Option B: Redis with Cache-Aside Pattern
       Pros:
       - Flexible cache population
       - Lower write latency
       Cons:
       - Risk of cache stampede
       - Requires careful invalidation

    3. Recommendation: Cache-Aside Pattern
       
       Why?
       - Your 80/20 read/write ratio benefits from lazy loading
       - Write latency is critical for user experience
       - Can implement gradual cache warming
       
    4. Implementation Plan:
       [Shows detailed architecture diagram and code examples]
```

---

### 3. **Ask Mode** (Learning Mode)
**Icon**: 💡 | **Color**: Green | **Verbosity**: 3/5

**Best For**:
- Learning how code works
- Understanding concepts
- Code reviews and explanations
- Exploring unfamiliar codebases

**Capabilities**:
- ❌ Cannot modify files
- ❌ Cannot execute terminal commands
- ❌ Cannot install packages
- ❌ Cannot run tests

**AI Behavior**:
- Educational and patient
- Explains concepts clearly
- Uses analogies and examples
- Asks clarifying questions
- Never makes changes (read-only)

**Example Use Cases**:
```
✓ "How does this authentication flow work?"
✓ "Explain this regex pattern"
✓ "What's the difference between map and forEach?"
✓ "Walk me through this algorithm step-by-step"
```

**Sample Interaction**:
```
You: "How does this code work?"

AI: Let me break down what's happening here:

    1. Function Purpose:
       This is a debounce function - it delays executing a 
       function until after a user stops triggering it.
       
    2. Step-by-Step:
       
       a) When called, it checks if there's a pending timer
       b) If yes, it cancels that timer (clearTimeout)
       c) Sets a new timer for 300ms
       d) Only after 300ms of no new calls does it execute
       
    3. Real-World Analogy:
       Imagine an elevator door - it only closes after people
       stop getting in. Each person resets the timer.
       
    4. Why Use This?
       - Prevents API spam (search-as-you-type)
       - Improves performance (resize listeners)
       - Better UX (wait for complete input)
       
    Would you like me to show you how to implement your own
    debounce function?
```

---

### 4. **Debug Mode**
**Icon**: 🐛 | **Color**: Red | **Verbosity**: 3/5

**Best For**:
- Troubleshooting bugs
- Performance issues
- Investigating errors
- Root cause analysis

**Capabilities**:
- ✅ Can modify files (to add logging, fix bugs)
- ✅ Can execute terminal commands
- ✅ Can install debugging tools
- ✅ Can run tests

**AI Behavior**:
- Systematic and methodical
- Asks diagnostic questions
- Adds strategic logging
- Tests hypotheses
- Finds root cause (not just symptoms)

**Example Use Cases**:
```
✓ "Why is this component re-rendering constantly?"
✓ "Find the memory leak in this application"
✓ "Why does this test fail intermittently?"
✓ "Investigate why the API is timing out"
```

**Sample Interaction**:
```
You: "Why is this failing?"

AI: Let me investigate systematically:

    1. Reproduce the Error:
       Running: npm test -- user.test.js
       Error: "Cannot read property 'name' of undefined"
       
    2. Add Strategic Logging:
       ```javascript
       console.log('User object:', user);
       console.log('User exists?', !!user);
       ```
       
    3. Run Again:
       Output shows: user is undefined when callback runs
       
    4. Root Cause Identified:
       The API call is asynchronous, but the test doesn't wait.
       
    5. Fix Applied:
       ```javascript
       // Before:
       fetchUser(id);
       expect(user.name).toBe('John');
       
       // After:
       await fetchUser(id);
       expect(user.name).toBe('John');
       ```
       
    6. Verify Fix:
       Running tests... ✅ All passing!
```

---

## 🔄 How to Switch Modes

### Method 1: Keyboard Shortcut (Fastest)
**Shortcut**: `Cmd+M` (Mac) / `Ctrl+M` (Windows/Linux)

1. Press `Cmd+M` / `Ctrl+M`
2. Quick pick menu appears
3. Select your desired mode
4. Mode switches instantly

### Method 2: Command Palette
1. Press `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux)
2. Type "Switch AI Mode"
3. Select from the dropdown:
   - **Oropendola: Switch AI Mode** (shows all modes)
   - **Oropendola: Switch to Code Mode**
   - **Oropendola: Switch to Architect Mode**
   - **Oropendola: Switch to Ask Mode**
   - **Oropendola: Switch to Debug Mode**

### Method 3: Status Bar (Future)
Click the mode indicator in the status bar (coming soon)

---

## 📊 Mode Comparison Table

| Feature | Code | Architect | Ask | Debug |
|---------|------|-----------|-----|-------|
| **Modify Files** | ✅ | ✅ | ❌ | ✅ |
| **Execute Commands** | ✅ | ❌ | ❌ | ✅ |
| **Install Packages** | ✅ | ❌ | ❌ | ✅ |
| **Run Tests** | ✅ | ❌ | ❌ | ✅ |
| **Verbosity** | 2/5 | 4/5 | 3/5 | 3/5 |
| **Response Style** | Concise | Comprehensive | Educational | Investigative |
| **Best For** | Implementation | Planning | Learning | Troubleshooting |

---

## 🎓 Mode Selection Guide

### Choose **Code Mode** when you:
- ✓ Know what you want to build
- ✓ Need quick implementations
- ✓ Want minimal explanations
- ✓ Are iterating rapidly

### Choose **Architect Mode** when you:
- ✓ Need to plan system design
- ✓ Want to understand trade-offs
- ✓ Are designing complex systems
- ✓ Need comprehensive documentation

### Choose **Ask Mode** when you:
- ✓ Are learning a new technology
- ✓ Want to understand existing code
- ✓ Need explanations, not changes
- ✓ Are exploring unfamiliar concepts

### Choose **Debug Mode** when you:
- ✓ Have a bug to fix
- ✓ Need to investigate an issue
- ✓ Want systematic troubleshooting
- ✓ Are tracking down root causes

---

## 💡 Pro Tips

### 1. **Switch Modes During Conversation**
You don't need to start a new chat! Switch modes mid-conversation:

```
[Code Mode] "Implement user authentication"
AI: *Creates auth system*

[Switch to Ask Mode]
You: "How does the JWT verification work?"
AI: *Explains without modifying code*

[Switch back to Code Mode]
You: "Add rate limiting"
AI: *Implements rate limiting*
```

### 2. **Mode Persistence**
Your selected mode persists across:
- VS Code restarts
- Window reloads
- Workspace switches

### 3. **Mode Indicator**
The status bar shows your current mode (future enhancement):
```
🤖 Code Mode | Edit: ✓ | Run: ✓
```

### 4. **Quick Mode Switch Shortcut**
Memorize `Cmd+M` / `Ctrl+M` for instant mode switching!

### 5. **Use Ask Mode for Code Review**
Switch to Ask Mode when reviewing pull requests - it won't accidentally modify files.

---

## 🔐 Mode Restrictions

When a mode blocks an action, you'll see a helpful prompt:

```
⚠️ Cannot modify files in Ask Mode
This mode is designed for learning, not editing.

Switch to Code Mode to make changes?
[Switch Mode] [Cancel]
```

---

## 🛠️ Advanced Usage

### Keyboard Shortcuts Summary
| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Switch Mode | `Cmd+M` | `Ctrl+M` |
| Open Chat | `Cmd+L` | `Ctrl+L` |
| Edit Code | `Cmd+I` | `Ctrl+I` |
| Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` |

### Mode History
View your recent mode switches:
1. Command Palette → "Oropendola: Show AI Mode Info"
2. See mode history with timestamps

---

## 📖 Example Workflows

### Workflow 1: Feature Development
```
1. [Code Mode] Implement feature
2. [Ask Mode] Review code, understand edge cases
3. [Code Mode] Add tests
4. [Debug Mode] Fix failing tests
5. [Architect Mode] Document architecture
```

### Workflow 2: Bug Investigation
```
1. [Debug Mode] Reproduce and investigate bug
2. [Ask Mode] Understand related code
3. [Debug Mode] Apply fix and verify
4. [Code Mode] Clean up and refactor
```

### Workflow 3: Learning New Codebase
```
1. [Ask Mode] Explore architecture and understand patterns
2. [Architect Mode] Review system design
3. [Ask Mode] Ask questions about specific modules
4. [Code Mode] Make small improvements
```

---

## ❓ FAQ

**Q: Will switching modes clear my chat history?**  
A: No! Your conversation history persists across mode switches.

**Q: Can I use multiple modes at once?**  
A: No, only one mode is active at a time. Switch as needed.

**Q: Which mode should I use for most tasks?**  
A: Code Mode (default) works well for general development. Switch to specialized modes when needed.

**Q: Does the AI remember my mode preference?**  
A: Yes! Your last selected mode is saved and restored when you restart VS Code.

**Q: Can I create custom modes?**  
A: Not yet, but custom modes are planned for a future release!

**Q: What if I'm in Ask Mode and ask the AI to modify files?**  
A: The AI will politely remind you it's in read-only mode and offer to switch to Code Mode.

---

## 🎉 Getting Started

1. **Update to v3.7.0**: Ensure you have the latest Oropendola extension
2. **Try the shortcut**: Press `Cmd+M` / `Ctrl+M` to see the mode picker
3. **Experiment**: Try each mode with different tasks
4. **Find your workflow**: Discover which modes work best for you

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/codfatherlogic/oropendola/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codfatherlogic/oropendola/discussions)
- **Email**: support@oropendola.ai

---

**Happy Coding with Multi-Mode AI!** 🚀

*Built with ❤️ by the Oropendola Team*
