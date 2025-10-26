# 🎯 Multi-Mode Quick Reference

**Version**: v3.7.0 | **Last Updated**: January 2025

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| **Switch Mode** | `Cmd+M` | `Ctrl+M` |
| Open Chat | `Cmd+L` | `Ctrl+L` |
| Edit Code | `Cmd+I` | `Ctrl+I` |

---

## Mode Comparison

| Mode | Best For | Edit | Run | Verbosity |
|------|----------|------|-----|-----------|
| **💻 Code** | Quick implementations | ✅ | ✅ | 2/5 |
| **🏗️ Architect** | System design | ✅ | ❌ | 4/5 |
| **💡 Ask** | Learning | ❌ | ❌ | 3/5 |
| **🐛 Debug** | Troubleshooting | ✅ | ✅ | 3/5 |

---

## When to Use Each Mode

### 💻 Code Mode (Default)
```
✓ "Add error handling"
✓ "Fix the bug"
✓ "Implement feature X"
✓ "Refactor this function"
```

### 🏗️ Architect Mode
```
✓ "Design a caching layer"
✓ "Review the architecture"
✓ "Best pattern for state management?"
✓ "Plan the database schema"
```

### 💡 Ask Mode
```
✓ "How does this code work?"
✓ "Explain this pattern"
✓ "What's the difference between X and Y?"
✓ "Walk me through this algorithm"
```

### 🐛 Debug Mode
```
✓ "Why is this failing?"
✓ "Find the memory leak"
✓ "Why does this test fail?"
✓ "Investigate the timeout"
```

---

## Commands (via Command Palette)

- `Oropendola: Switch AI Mode` - Open mode picker
- `Oropendola: Switch to Code Mode` - Quick switch
- `Oropendola: Switch to Architect Mode` - Quick switch
- `Oropendola: Switch to Ask Mode` - Quick switch
- `Oropendola: Switch to Debug Mode` - Quick switch
- `Oropendola: Show AI Mode Info` - View details

---

## Mode Characteristics

### Code Mode 💻
- **Speed**: Fast
- **Style**: Concise
- **Focus**: Implementation
- **Example**: Shows code → Brief explanation

### Architect Mode 🏗️
- **Speed**: Thoughtful
- **Style**: Comprehensive
- **Focus**: Design
- **Example**: Requirements → Options → Recommendation → Plan

### Ask Mode 💡
- **Speed**: Patient
- **Style**: Educational
- **Focus**: Learning
- **Example**: Concept → Analogy → Example → Practice

### Debug Mode 🐛
- **Speed**: Systematic
- **Style**: Investigative
- **Focus**: Root Cause
- **Example**: Reproduce → Log → Diagnose → Fix → Verify

---

## Capabilities Matrix

| Capability | Code | Architect | Ask | Debug |
|------------|:----:|:---------:|:---:|:-----:|
| Modify Files | ✅ | ✅ | ❌ | ✅ |
| Run Commands | ✅ | ❌ | ❌ | ✅ |
| Install Packages | ✅ | ❌ | ❌ | ✅ |
| Run Tests | ✅ | ❌ | ❌ | ✅ |
| Read Files | ✅ | ✅ | ✅ | ✅ |
| Explain Code | ✅ | ✅ | ✅ | ✅ |

---

## Common Workflows

### Feature Development
```
1. Code Mode → Implement
2. Ask Mode → Review
3. Code Mode → Add tests
4. Debug Mode → Fix bugs
5. Architect Mode → Document
```

### Bug Investigation
```
1. Debug Mode → Investigate
2. Ask Mode → Understand context
3. Debug Mode → Fix
4. Code Mode → Clean up
```

### Learning
```
1. Ask Mode → Explore codebase
2. Architect Mode → Review design
3. Ask Mode → Deep dive modules
4. Code Mode → Practice changes
```

---

## Tips & Tricks

### 🚀 Pro Tips
- Switch modes mid-conversation
- Mode persists across restarts
- Use Ask Mode for code reviews
- Cmd+M is your friend!

### ⚠️ Common Mistakes
- Trying to edit in Ask Mode
- Using Code Mode for architecture planning
- Not switching modes for different tasks

### 💡 Best Practices
- Start with Code Mode for most tasks
- Switch to Ask Mode when learning
- Use Architect Mode for planning
- Debug Mode for systematic troubleshooting

---

## FAQ

**Q: Which mode should I use?**  
A: Start with Code Mode. Switch when you need specialized behavior.

**Q: Can I switch mid-conversation?**  
A: Yes! History persists across mode switches.

**Q: How do I know which mode I'm in?**  
A: Check the status bar (future) or use Show Mode Info command.

**Q: What if I forget the keyboard shortcut?**  
A: Cmd+Shift+P → "Switch AI Mode"

---

## Version Info

- **Current**: v3.7.0
- **Modes Available**: 4 (Code, Architect, Ask, Debug)
- **Commands**: 6
- **Tests**: 30/30 passing

---

**Need Help?**
- User Guide: `docs/MULTI_MODE_USER_GUIDE.md`
- Developer Guide: `docs/MULTI_MODE_DEVELOPER_GUIDE.md`
- Issues: [GitHub](https://github.com/codfatherlogic/oropendola/issues)

---

*Quick reference for Oropendola Multi-Mode System*
