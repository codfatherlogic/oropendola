# 🔮 Autocomplete Troubleshooting Guide

## ✅ Your Autocomplete IS Already Implemented!

Good news! Autocomplete is **fully implemented** in Oropendola v2.0. You don't need to add any code.

### What's Already Working:
- ✅ `src/autocomplete/autocomplete-provider.js` (362 lines) - Complete implementation
- ✅ Registered for **all file types** in `extension.js`
- ✅ Debouncing (200ms) to avoid API spam
- ✅ LRU cache (50 items, 5-min TTL)
- ✅ Smart filtering (skips comments, strings, mid-word)
- ✅ FIM (Fill-In-Middle) prompting with context

---

## 🎯 Quick Start Testing

### **Step 1: Reload VS Code**
```
Cmd+Shift+P → "Developer: Reload Window"
```
**WHY:** Extension needs to be activated after installation.

### **Step 2: Check Logs**
```
View → Output → Select "Oropendola AI" from dropdown
```
**Look for:**
```
✅ Autocomplete provider initialized
✅ Autocomplete provider registered for all languages
```

### **Step 3: Test Autocomplete**
1. Open any `.js`, `.py`, `.ts`, `.go`, etc. file
2. Start typing code:
   ```javascript
   function calculate
   ```
3. Wait ~200ms (don't type continuously)
4. Look for **gray inline suggestion**
5. Press **Tab** to accept

### **Step 4: Manual Trigger**
If auto-trigger doesn't work:
```
Cmd+Shift+P → "Trigger Inline Suggestions"
```

---

## 🐛 Debug Command (New!)

Run this to see why autocomplete might not be working:

```
Cmd+Shift+P → "Oropendola: Debug Autocomplete Status"
```

This will check:
- ✅ Is autocomplete provider initialized?
- ✅ Is it enabled in settings?
- ✅ Is Oropendola provider (backend) ready?
- ✅ What file/language are you in?
- ✅ How many items are cached?

**Example Output:**
```
🔍 Autocomplete Debug Info

Provider Initialized: ✅ YES
Provider Enabled: ✅ YES
Oropendola Provider Ready: ✅ YES
Config Setting Enabled: ✅ YES
Debounce Delay: 200ms
Cache Size: 5 items

📄 Active Editor
File: /Users/you/project/index.js
Language: javascript
Position: Line 42, Col 15
```

---

## ⚙️ Settings

Check your VS Code settings (`Cmd+,` then search "oropendola"):

```json
{
  "oropendola.autocomplete.enabled": true,
  "oropendola.autocomplete.debounceDelay": 200
}
```

### Manually Enable/Disable:
```
Cmd+Shift+P → "Oropendola: Toggle Autocomplete"
```

### Clear Cache (if suggestions are stale):
```
Cmd+Shift+P → "Oropendola: Clear Autocomplete Cache"
```

---

## 🔍 Common Issues

### ❌ "No suggestions appearing"

**Possible causes:**
1. **Haven't reloaded VS Code** → Solution: `Cmd+Shift+P → Reload Window`
2. **Not authenticated** → Solution: Check status bar shows "🐦 Oropendola (Pro)" not "Login"
3. **Typing too fast** → Solution: Stop typing for 200ms, then wait
4. **Cursor in middle of word** → Solution: Move to end of line or after a space
5. **Backend not responding** → Solution: Check Output panel for API errors

### ❌ "Suggestions are slow"

**Possible causes:**
1. **First request (cold start)** → Normal, subsequent requests are cached
2. **Backend API delay** → Check if `oropendola.ai` is responding slowly
3. **Large file context** → Autocomplete only sends 1500 chars prefix + 500 chars suffix

**Optimize:**
```javascript
// In settings.json
{
  "oropendola.autocomplete.debounceDelay": 500  // Increase to 500ms
}
```

### ❌ "Wrong language suggestions"

**Possible causes:**
1. **File extension not recognized** → VS Code doesn't know the language
2. **Mixed language file** → (e.g., HTML with embedded JS)

**Solution:**
- Set language manually: Click language in status bar (bottom right)
- Or: `Cmd+K M` → Select language

---

## 📊 How It Works (Technical)

```
User Types Code
       ↓
Debounce (200ms wait)
       ↓
Build FIM Prompt (Prefix + Suffix)
       ↓
Check Cache (30-second TTL)
       ↓
API Request to backend (/api/method/ai_assistant.api.autocomplete)
       ↓
AI generates completion
       ↓
Show inline suggestion (gray text)
       ↓
User presses Tab → Accept
```

### Backend API (if you need to debug server-side):
```python
# frappe-bench/apps/ai_assistant/ai_assistant/api.py

@frappe.whitelist()
def autocomplete(prompt, language='javascript', max_tokens=100, temperature=0.2):
    """
    Autocomplete endpoint
    """
    # Your backend should implement this
    # prompt = { prefix, suffix, language, fileName }
    # return { completion: "code here" }
```

---

## 🎮 Keyboard Shortcuts

| Action | Shortcut | Command |
|--------|----------|---------|
| **Accept Suggestion** | `Tab` | `editor.action.inlineSuggest.commit` |
| **Reject Suggestion** | `Esc` | `editor.action.inlineSuggest.hide` |
| **Next Suggestion** | `Alt+]` | `editor.action.inlineSuggest.showNext` |
| **Previous Suggestion** | `Alt+[` | `editor.action.inlineSuggest.showPrevious` |
| **Manual Trigger** | `Alt+\` | `editor.action.inlineSuggest.trigger` |

---

## 🧪 Test Cases

### **Test 1: Simple Function**
```javascript
// Type this slowly:
function addNumbers(a, b) {
  return 
  // ^ Stop here, wait 200ms
  // Should suggest: a + b;
}
```

### **Test 2: Import Statement**
```javascript
// Type this:
import React from 
// ^ Stop here
// Should suggest: 'react';
```

### **Test 3: Python Function**
```python
# Type this:
def fibonacci(n):
    if n <= 1:
        return 
        # ^ Stop here
        # Should suggest: n
```

---

## 📞 Still Not Working?

1. **Check authentication:**
   - Status bar should show "🐦 Oropendola (Pro)"
   - If it says "Login", run: `Cmd+Shift+P → Oropendola: Login`

2. **Check backend connectivity:**
   - Open Output panel (`View → Output → Oropendola AI`)
   - Look for API errors like `403 Forbidden` or `500 Server Error`

3. **Check VS Code settings:**
   ```
   Cmd+, → Search "inline suggest" → Make sure it's enabled
   ```

4. **Disable conflicting extensions:**
   - GitHub Copilot (conflicts with inline suggestions)
   - Tabnine
   - Any other AI code completion tools

5. **Run debug command:**
   ```
   Cmd+Shift+P → "Oropendola: Debug Autocomplete Status"
   ```

---

## ✨ Expected Behavior (Visual Guide)

### Before (typing):
```javascript
function calculate|
```

### After (wait 200ms):
```javascript
function calculate█Sum(a, b) {
    return a + b;
}
```
*Gray text is the suggestion, `|` is cursor*

### After pressing Tab:
```javascript
function calculateSum(a, b) {
    return a + b;
}|
```
*Suggestion accepted, cursor moved to end*

---

## 🎉 Success Checklist

- [ ] VS Code reloaded after installation
- [ ] Logs show "✅ Autocomplete provider registered"
- [ ] Status bar shows "🐦 Oropendola (Pro)" (authenticated)
- [ ] Opened a code file (not plain text)
- [ ] Stopped typing for 200ms
- [ ] Saw gray inline suggestion appear
- [ ] Pressed Tab and it accepted

---

## 📚 Related Commands

| Command | Purpose |
|---------|---------|
| `Oropendola: Toggle Autocomplete` | Enable/disable autocomplete |
| `Oropendola: Clear Autocomplete Cache` | Clear cached suggestions |
| `Oropendola: Debug Autocomplete Status` | Check if autocomplete is working |
| `Oropendola: Edit Code with AI` | Use Cmd+I for inline editing |
| `Oropendola: Chat` | Open chat sidebar (Cmd+L) |

---

## 🔗 More Info

- **Full Features Guide**: See `FEATURES_V2.0.md`
- **Quick Start**: See `QUICKSTART_V2.0.md`
- **Keyboard Shortcuts**: Run `Cmd+Shift+P → Oropendola: Show Keyboard Shortcuts`

---

**Last Updated:** October 18, 2025  
**Version:** Oropendola v2.0.0  
**Status:** ✅ Autocomplete Fully Implemented
