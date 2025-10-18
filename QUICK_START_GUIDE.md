# 🚀 Quick Start Guide: Accept/Reject & Image Paste Features

## ✅ Feature 1: Accept/Reject AI Responses

### Visual Flow

```
┌────────────────────────────────────────────────────────┐
│  AI Assistant Response                                 │
│  ────────────────────────────────────────             │
│  Sure! Here's how to fix that bug:                    │
│                                                        │
│  1. Change line 42 to use async/await                 │
│  2. Add error handling with try/catch                 │
│  3. Update the dependency version                     │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 👍 Accept    │  │ 👎 Reject    │                  │
│  └──────────────┘  └──────────────┘                  │
└────────────────────────────────────────────────────────┘
```

### After Clicking Accept:

```
┌────────────────────────────────────────────────────────┐
│  AI Assistant Response                                 │
│  ────────────────────────────────────────             │
│  Sure! Here's how to fix that bug:                    │
│                                                        │
│  1. Change line 42 to use async/await                 │
│  2. Add error handling with try/catch                 │
│  3. Update the dependency version                     │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ ✅ Accepted  │  │ 👎 Reject    │ (disabled)       │
│  └──────────────┘  └──────────────┘                  │
│     (green)            (grayed out)                    │
└────────────────────────────────────────────────────────┘

Toast Notification: "✅ You accepted this response"
```

### How to Use:

1. **Ask AI a question** in the chat
2. **Wait for response** from AI
3. **Click 👍 Accept** if the answer is helpful
   - Button turns green with ✅ icon
   - Reject button becomes disabled
   - You get a confirmation notification
   
4. **Click 👎 Reject** if the answer is wrong/unhelpful
   - Button turns red with ❌ icon
   - Accept button becomes disabled
   - You get a confirmation notification

### When to Use Each:

**👍 Accept** when:
- Answer solved your problem
- Code suggestion works correctly
- Explanation is clear and accurate
- AI understood your context

**👎 Reject** when:
- Answer is incorrect
- Code doesn't work
- AI misunderstood the question
- Response is not helpful

---

## 📸 Feature 2: Image Paste Support

### Visual Flow

#### Step 1: Copy Image to Clipboard
```
Screenshot Tool / Browser / Image Editor
           ↓
    [Cmd+C / Ctrl+C]
           ↓
    Image in Clipboard ✅
```

#### Step 2: Paste into Chat
```
┌────────────────────────────────────────────────────────┐
│  Chat Input Area                                       │
│  ────────────────────────────────────                 │
│  [Click here and press Cmd+V]                         │
│                                                        │
│  📎  Type your message...                      ▶      │
└────────────────────────────────────────────────────────┘
```

#### Step 3: Image Preview Appears
```
┌────────────────────────────────────────────────────────┐
│  Attachments Preview                                   │
│  ────────────────────────────────────                 │
│  ┌─────────────────────┐                              │
│  │   [Image Preview]   │                              │
│  │   ─────────────     │                              │
│  │                     │                              │
│  │  Screenshot of code │                              │
│  │                     │                              │
│  └─────────────────────┘                              │
│  pasted-image-1697654321.png                    [×]   │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  📎  Can you explain this error?              ▶      │
└────────────────────────────────────────────────────────┘
```

#### Step 4: Send Message with Image
```
┌────────────────────────────────────────────────────────┐
│  User Message                                          │
│  ────────────────────────────────────────             │
│  Can you explain this error?                          │
│  📎 pasted-image-1697654321.png (45 KB)               │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  AI Assistant Response                                 │
│  ────────────────────────────────────────             │
│  Based on the screenshot, I can see the error is:     │
│  ...                                                   │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 👍 Accept    │  │ 👎 Reject    │                  │
│  └──────────────┘  └──────────────┘                  │
└────────────────────────────────────────────────────────┘
```

### How to Use:

1. **Copy an image** to clipboard:
   - Take a screenshot (Cmd+Shift+4 on Mac)
   - Copy image from browser (right-click → Copy Image)
   - Copy from image editor
   - Copy from any application

2. **Click in chat input field** to focus it

3. **Paste the image** (Cmd+V on Mac, Ctrl+V on Windows)

4. **Verify image preview** appears above input

5. **Type your message** (optional)

6. **Click Send ▶** to send message with image

7. **AI receives** your text + image and responds

### Tips:

- ✅ You can paste multiple images (paste → type → paste again)
- ✅ Remove unwanted images by clicking [×] button
- ✅ Images are automatically named with timestamp
- ✅ Works with PNG, JPG, GIF, WebP formats
- ✅ Also works with file drag-and-drop (📎 button)

---

## 🎯 Real-World Usage Examples

### Example 1: Code Review with Feedback

```
You: "Review this React component"
     [paste screenshot of code]

AI: "Here are some improvements:
     1. Use useCallback for event handlers
     2. Add PropTypes validation
     3. Extract inline styles to constants"
     
     [👍 Accept] [👎 Reject]

You: *clicks 👍 Accept*

Result: ✅ Positive feedback helps AI learn what good code reviews look like
```

### Example 2: Debug Error with Screenshot

```
You: "Why am I getting this error?"
     [paste error screenshot]

AI: "The error occurs because you're trying to access 
     'undefined.property'. Add a null check before line 42."
     
     [👍 Accept] [👎 Reject]

You: *tries solution, it works!*
You: *clicks 👍 Accept*

Result: ✅ AI learns it correctly diagnosed the problem
```

### Example 3: Design Feedback

```
You: "Which design is better?"
     [paste design A]
     [paste design B]

AI: "Design A is better because:
     - Cleaner layout
     - Better color contrast
     - More intuitive navigation"
     
     [👍 Accept] [👎 Reject]

You: *disagrees with assessment*
You: *clicks 👎 Reject*

Result: ❌ AI learns to reconsider design evaluation criteria
```

### Example 4: Incorrect AI Response

```
You: "How do I center a div in CSS?"

AI: "Use margin: auto auto"
     
     [👍 Accept] [👎 Reject]

You: *tries it, doesn't work*
You: *clicks 👎 Reject*

AI: "Let me provide a better solution..."
     "Use display: flex and justify-content: center"
     
     [👍 Accept] [👎 Reject]

You: *clicks 👍 Accept*

Result: ✅ AI learns the correct solution through feedback
```

---

## 🎨 UI Elements Reference

### Accept/Reject Buttons States

#### Initial State:
```css
Background: Transparent
Border: 1px solid gray
Color: Foreground color
Cursor: Pointer
```

#### Hover State:
```css
Background: Toolbar hover color
(Slightly darker than initial)
```

#### Accepted State:
```css
Background: Green (testing-iconPassed)
Border: Green
Color: White
Icon: ✅
Disabled: Yes
```

#### Rejected State:
```css
Background: Red (testing-iconFailed)
Border: Red
Color: White
Icon: ❌
Disabled: Yes
```

### Image Preview Styles

#### Image Attachment Chip:
```css
Display: Flex (column)
Max Width: 150px
Padding: 6px
Border Radius: 4px
Background: Badge background color
```

#### Image Thumbnail:
```css
Width: 100%
Max Height: 100px
Object Fit: Cover
Border Radius: 4px
Margin Bottom: 4px
```

---

## 🔧 Troubleshooting

### "Accept/Reject buttons not showing"

**Check:**
- [ ] Extension is installed and activated
- [ ] VS Code is reloaded (Cmd+R)
- [ ] You're logged into Oropendola
- [ ] Message is from AI (not your own message)

**Solution:**
```bash
# Reinstall extension
code --install-extension oropendola-ai-assistant-2.0.0.vsix

# Reload VS Code
Cmd+R (Mac) or Ctrl+R (Windows)
```

### "Image paste not working"

**Check:**
- [ ] Image is actually in clipboard
- [ ] You clicked in the input field first
- [ ] Using correct keyboard shortcut (Cmd+V Mac, Ctrl+V Windows)
- [ ] Browser clipboard permissions (if running in browser)

**Solution:**
```
1. Take screenshot: Cmd+Shift+4 (Mac) or Windows+Shift+S (Windows)
2. Click in chat input area
3. Press Cmd+V (Mac) or Ctrl+V (Windows)
4. Should see preview appear immediately
```

### "Image preview shows but doesn't send"

**Check:**
- [ ] You typed a message or question
- [ ] You clicked the Send button (▶)
- [ ] Not just the attachment button (📎)

**Solution:**
Type something in the input field before sending, even just a question mark "?"

### "Backend returns 404 for feedback"

**Expected Behavior:**
- Frontend will work fine even without backend endpoint
- Feedback is stored locally in logs
- Toast notification still appears

**To Fix Backend:**
See `BACKEND_IMPLEMENTATION.md` for full setup instructions

---

## 📊 Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Copy Image | Cmd+C | Ctrl+C |
| Paste Image | Cmd+V | Ctrl+V |
| Send Message | Enter | Enter |
| New Line | Shift+Enter | Shift+Enter |
| Focus Input | - | - |
| Open Chat | Cmd+Shift+C | Ctrl+Shift+C |

---

## 🎓 Best Practices

### For Accept/Reject:

1. **Be Honest**: Click what you truly think
2. **Be Timely**: Give feedback while context is fresh
3. **Be Consistent**: Similar answers should get similar feedback
4. **Context Matters**: Same answer might be accept/reject in different situations

### For Image Paste:

1. **Clear Images**: Use high-resolution screenshots
2. **Crop Relevant Parts**: Don't send entire screen if only part is relevant
3. **Multiple Angles**: Send multiple images if it helps explain
4. **Annotate First**: Circle or highlight important parts before pasting
5. **Add Context**: Always include a text description with images

---

## 🚀 Next Steps

1. **Install Extension**:
   ```bash
   code --install-extension oropendola-ai-assistant-2.0.0.vsix
   ```

2. **Open Oropendola Sidebar**:
   - Click Oropendola icon in Activity Bar
   - Or press Cmd+Shift+C (Mac) / Ctrl+Shift+C (Windows)

3. **Sign In**:
   - Enter your email and password
   - Click "🔐 Sign In"

4. **Try Accept/Reject**:
   - Ask: "What is TypeScript?"
   - Wait for response
   - Click 👍 Accept or 👎 Reject

5. **Try Image Paste**:
   - Take a screenshot
   - Paste into chat (Cmd+V)
   - Add question: "Explain this"
   - Send

6. **Check Console** (for developers):
   - Open Developer Tools (Cmd+Option+I)
   - Look for feedback logs
   - Verify backend requests

---

## 📚 Additional Resources

- Full Documentation: `FEATURES_DOCUMENTATION.md`
- Backend Setup: `BACKEND_IMPLEMENTATION.md`
- Bug Reports: https://oropendola.ai/support
- Feature Requests: https://github.com/oropendola/extension/issues

---

**Happy Coding! 🎉**

If you have any questions or issues, please check the troubleshooting section or contact support.
