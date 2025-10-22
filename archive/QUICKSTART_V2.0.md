# 🚀 Oropendola v2.0 - Quick Start Guide

## Get Started in 60 Seconds!

### 1. Sign In (If Not Already)
```
Press: Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
```

### 2. Try Autocomplete
1. Open any code file
2. Start typing a function
3. Wait 200ms → See AI suggestion appear (ghosted text)
4. Press `Tab` to accept!

**Example**:
```javascript
// Type: "function fetchData"
// AI suggests: function fetchData(url) { return fetch(url).then(res => res.json()); }
// Press Tab → Done! ✨
```

### 3. Try Edit Mode (The Magic Command!)
1. Select any code
2. Press `Cmd+I` (or `Ctrl+I`)
3. Type: "Add error handling"
4. Review the diff
5. Click "Accept ✅"

**Example**:
```javascript
// Select this:
function divide(a, b) {
  return a / b;
}

// Press Cmd+I → Type: "Add error handling"
// AI shows diff with try-catch!
```

### 4. Quick Chat
```
Press: Cmd+L (Mac) or Ctrl+L (Windows/Linux)
Opens chat with your current file context!
```

---

## ⌨️ Essential Shortcuts

| What You Want | Press This | Result |
|---------------|------------|--------|
| AI code suggestions | Just type → wait 200ms → `Tab` | Autocomplete! |
| Edit selected code | `Cmd+I` | AI rewrites with diff |
| Open AI chat | `Cmd+L` | Chat opens |
| Explain code | `Cmd+Shift+E` | AI explains |
| Fix code | `F2` | AI fixes bugs |

---

## 💡 Pro Tips

### Autocomplete Tips
- **Let it finish**: Wait 200ms after typing for suggestions
- **Partial accept**: Press `Cmd+→` to accept word-by-word
- **Skip it**: Press `Esc` to dismiss suggestion

### Edit Mode Tips
- **Be specific**: "Add try-catch around API call" > "make better"
- **Small edits**: Select 10-50 lines, not entire files
- **Iterate**: Use "Try Again 🔄" to refine results

### Chat Tips
- **Use context**: Chat automatically includes your current file
- **Ask follow-ups**: Continue conversation for clarification
- **Code actions**: Right-click code → Choose AI action

---

## 🎯 Common Use Cases

### 1. Generate Boilerplate
```
Type: "class User"
AI suggests: Full class with constructor, getters, setters!
Press Tab → Profit! 💰
```

### 2. Refactor Code
```
1. Select old code
2. Cmd+I → "Convert to async/await"
3. Review diff
4. Accept ✅
```

### 3. Add Tests
```
1. Select function
2. Cmd+I → "Generate unit tests"
3. Get complete test suite!
```

### 4. Debug Errors
```
1. Select problematic code
2. F2 (Fix Code)
3. AI finds & fixes bugs!
```

### 5. Learn Code
```
1. Select complex code
2. Cmd+Shift+E (Explain)
3. Get detailed explanation!
```

---

## 🛠️ Configuration (Optional)

Want to customize? Open Settings (`Cmd+,`):

```json
{
  // Autocomplete
  "oropendola.autocomplete.enabled": true,
  "oropendola.autocomplete.debounceDelay": 200,
  
  // AI behavior
  "oropendola.ai.temperature": 0.7,
  "oropendola.ai.maxTokens": 4096,
  
  // Edit mode
  "oropendola.edit.showDiffView": true
}
```

---

## ❓ Troubleshooting

### "Autocomplete not showing?"
1. Check: `Oropendola: Toggle Autocomplete`
2. Verify: You're signed in (`Cmd+Shift+L`)
3. Try: `Oropendola: Clear Autocomplete Cache`

### "Cmd+I not working?"
1. Select code first (highlight some lines)
2. Verify: Signed in to Oropendola
3. Check: Subscription status

### "Keyboard shortcuts conflict?"
1. Go to: `Preferences > Keyboard Shortcuts`
2. Search: "oropendola"
3. Click pencil icon to remap

---

## 🎓 Learn More

- **Full Features**: See `FEATURES_V2.0.md`
- **Architecture**: See your comprehensive guide
- **Support**: https://oropendola.ai/support

---

## 🎉 You're Ready!

Start coding with AI superpowers. Remember:

1. **Type** → Wait 200ms → **Tab** = Autocomplete
2. **Select** → **Cmd+I** → Tell AI what to do = Magic
3. **Cmd+L** = Quick chat

Happy coding! 🚀✨

---

**Pro Tip of the Day**: Select a 100-line function, press `Cmd+I`, type "add comprehensive JSDoc comments" → Watch the magic happen! 🪄
