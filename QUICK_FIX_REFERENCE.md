# Quick Fix Reference - CSRF & Sequential TODOs

## 🔑 CSRF Token Fix

### Problem
HTTP 417 errors when creating TODOs (CSRF validation failed)

### Solution
```javascript
// 1. Extract CSRF token during login
this._csrfToken = response.headers['x-frappe-csrf-token'] || 
                  response.data.csrf_token;

// 2. Save to VS Code settings
await config.update('session.csrfToken', this._csrfToken, 
                   vscode.ConfigurationTarget.Global);

// 3. Include in API calls
headers['X-Frappe-CSRF-Token'] = this._csrfToken;

// 4. Auto-retry on 417 errors
if (error.response.status === 417) {
    await this._refreshCsrfToken();
    // Retry request with new token
}
```

---

## 📋 Sequential TODO Fix

### Problem
All TODOs showing as active, no sequential execution

### Solution
```javascript
// 1. Sort by order field
const sortedTodos = todos.sort((a, b) => a.order - b.order);

// 2. Find active TODO (first non-completed)
let activeIndex = sortedTodos.findIndex(t => t.status !== 'completed');

// 3. Assign proper status
todos.map((todo, i) => {
    if (i === activeIndex) return 'in_progress';  // ⏳ Active
    if (i < activeIndex) return 'completed';      // ✅ Done
    return 'pending';                              // ⬜ Waiting
});
```

---

## 🎨 Visual States

```
✅ Completed   → Strikethrough, dimmed
⏳ In Progress → Blue border, pulsing, highlighted
⬜ Pending     → Gray, dimmed, waiting
```

---

## 🧪 Test Commands

```bash
# Rebuild extension
npm run watch

# Package extension
vsce package

# Install in VS Code
code --install-extension oropendola-2.5.3.vsix
```

---

## ✅ Verification

1. Login → Check console for "✅ Extracted CSRF token"
2. Send message → No HTTP 417 errors
3. View TODOs → Only one shows "IN PROGRESS"
4. Visual check → Active TODO has blue pulsing border

---

## 📝 Files Modified

- `src/sidebar/sidebar-provider.js`
  - Lines ~268-310: CSRF token extraction
  - Lines ~68-78: Token restoration
  - Lines ~1447-1604: Token usage + refresh
  - Lines ~4048-4145: Sequential rendering
  - Lines ~3768-3784: Enhanced styling

---

**Status:** ✅ Complete  
**Version:** 2.5.3
