# Subtask and Semantic Search - Quick Start

## 🚀 Quick Reference

### For AI Assistants

#### Starting a Subtask
```xml
<start_subtask>
  <description>Clear, focused task description</description>
  <mode>code</mode> <!-- or 'ask', 'agent' -->
</start_subtask>
```

#### Completing a Subtask
```xml
<complete_subtask>
  <result>Brief summary of what was accomplished</result>
</complete_subtask>
```

#### Semantic Code Search
```xml
<codebase_search>
  <query>Natural language description of what you're looking for</query>
  <limit>5</limit> <!-- Optional: number of results (default: 5) -->
  <min_similarity>0.7</min_similarity> <!-- Optional: 0-1 threshold (default: 0.6) -->
</codebase_search>
```

### When to Use

#### Use Subtasks When:
- ✅ Task has multiple distinct phases
- ✅ Need to investigate before implementing
- ✅ Breaking down complex problem
- ✅ Want isolated context for part of work
- ✅ Need to try different approaches

#### Use Semantic Search When:
- ✅ Looking for existing implementations
- ✅ Understanding code patterns
- ✅ Finding similar functionality
- ✅ Discovering related code
- ✅ Learning project conventions

## 📖 Common Patterns

### Pattern 1: Research → Implement

```xml
<!-- Step 1: Research existing patterns -->
<start_subtask>
  <description>Research existing authentication implementations</description>
  <mode>code</mode>
</start_subtask>

<codebase_search>
  <query>user authentication login validation</query>
  <limit>5</limit>
</codebase_search>

<!-- After reviewing results -->
<complete_subtask>
  <result>Found JWT-based auth in middleware/auth.js, uses bcrypt for passwords</result>
</complete_subtask>

<!-- Step 2: Implement new feature using learned patterns -->
<start_subtask>
  <description>Implement OAuth2 authentication following existing JWT pattern</description>
  <mode>code</mode>
</start_subtask>

<create_file>
  <path>src/middleware/oauth-auth.js</path>
  <content>
    // Following JWT pattern found in research
    // ...implementation
  </content>
</create_file>

<complete_subtask>
  <result>OAuth2 authentication implemented, follows existing patterns</result>
</complete_subtask>
```

### Pattern 2: Multi-Step Refactoring

```xml
<start_subtask>
  <description>Phase 1: Extract common validation logic</description>
  <mode>code</mode>
</start_subtask>

<codebase_search>
  <query>validation functions input sanitization</query>
  <limit>10</limit>
</codebase_search>

<!-- Extract common patterns -->
<create_file>
  <path>src/utils/validation.js</path>
  <content>// Common validation utilities</content>
</create_file>

<complete_subtask>
  <result>Created centralized validation utilities</result>
</complete_subtask>

<start_subtask>
  <description>Phase 2: Update all files to use new validation utilities</description>
  <mode>code</mode>
</start_subtask>

<!-- Update files... -->

<complete_subtask>
  <result>All validation now uses central utilities, removed duplication</result>
</complete_subtask>
```

### Pattern 3: Investigation → Bug Fix

```xml
<start_subtask>
  <description>Investigate login bug - users can't sign in</description>
  <mode>ask</mode>
</start_subtask>

<codebase_search>
  <query>login authentication user sign in</query>
  <limit>5</limit>
</codebase_search>

<read_file>
  <path>src/auth/login-handler.js</path>
</read_file>

<!-- Found the issue: password comparison using wrong bcrypt method -->

<complete_subtask>
  <result>Bug identified: using bcrypt.hash() instead of bcrypt.compare() for password validation</result>
</complete_subtask>

<start_subtask>
  <description>Fix password validation bug</description>
  <mode>code</mode>
</start_subtask>

<replace_string_in_file>
  <path>src/auth/login-handler.js</path>
  <old_string>
    if (await bcrypt.hash(password, hashedPassword)) {
      // ...
    }
  </old_string>
  <new_string>
    if (await bcrypt.compare(password, hashedPassword)) {
      // ...
    }
  </new_string>
</replace_string_in_file>

<complete_subtask>
  <result>Fixed password validation - now using bcrypt.compare()</result>
</complete_subtask>
```

### Pattern 4: Parallel Investigation

```xml
<!-- Main task: Choose best approach -->
Main Task: "Implement caching strategy"

<start_subtask>
  <description>Research Redis caching implementation</description>
  <mode>ask</mode>
</start_subtask>

<codebase_search>
  <query>redis cache implementation connection</query>
  <limit>5</limit>
</codebase_search>

<complete_subtask>
  <result>Redis: Requires external service, fast, supports TTL, good for distributed systems</result>
</complete_subtask>

<start_subtask>
  <description>Research in-memory caching alternatives</description>
  <mode>ask</mode>
</start_subtask>

<codebase_search>
  <query>in-memory cache Map WeakMap</query>
  <limit>5</limit>
</codebase_search>

<complete_subtask>
  <result>In-memory: Simple, no dependencies, lost on restart, good for single instance</result>
</complete_subtask>

<!-- Now make decision with both options researched -->
```

## 🎯 Best Practices

### DO ✅

1. **Search Before Writing**
   ```xml
   <codebase_search>
     <query>existing error handling patterns</query>
   </codebase_search>
   <!-- Then follow discovered patterns -->
   ```

2. **Focused Subtask Descriptions**
   ```xml
   ✅ Good: "Extract validation logic from user-controller.js"
   ❌ Bad: "Do some refactoring"
   ```

3. **Complete Subtasks Promptly**
   ```xml
   <!-- As soon as subtask work is done -->
   <complete_subtask>
     <result>Clear summary of what was accomplished</result>
   </complete_subtask>
   ```

4. **Relevant Search Queries**
   ```xml
   ✅ Good: "JWT token validation middleware Express"
   ❌ Bad: "code"
   ```

5. **Iterative Search Refinement**
   ```xml
   <!-- First search too broad? Narrow it down -->
   <codebase_search>
     <query>authentication</query> <!-- Too broad -->
   </codebase_search>
   
   <codebase_search>
     <query>JWT token validation Express middleware</query> <!-- Better -->
     <min_similarity>0.8</min_similarity>
   </codebase_search>
   ```

### DON'T ❌

1. **Don't Create Subtasks for Trivial Tasks**
   ```xml
   ❌ Bad: Starting subtask just to read one file
   ✅ Good: Just read the file directly
   ```

2. **Don't Nest Too Deep**
   ```xml
   ❌ Bad: Root → Sub1 → Sub2 → Sub3 → Sub4 (max is 3)
   ✅ Good: Root → Sub1 → Sub2 (complete and return)
   ```

3. **Don't Leave Orphaned Subtasks**
   ```xml
   ❌ Bad: Starting subtask and never completing it
   ✅ Good: Always complete or explicitly abandon
   ```

4. **Don't Skip Semantic Search**
   ```xml
   ❌ Bad: Guessing at code structure
   ✅ Good: Search to understand existing patterns first
   ```

## 🔄 Workflow Examples

### Example 1: Adding a New Feature
```
1. Search for similar features
   └─ <codebase_search query="similar feature implementation" />

2. Create subtask to design approach
   └─ <start_subtask description="Design new feature architecture" />
      └─ Research dependencies, design API
      └─ <complete_subtask result="Architecture designed, ready to implement" />

3. Create subtask to implement
   └─ <start_subtask description="Implement feature following design" />
      └─ Create files, write code
      └─ <complete_subtask result="Feature implemented" />

4. Create subtask to add tests
   └─ <start_subtask description="Add unit tests for new feature" />
      └─ Write tests
      └─ <complete_subtask result="Tests added, all passing" />
```

### Example 2: Debugging Complex Issue
```
1. Create investigation subtask
   └─ <start_subtask description="Investigate error in payment processing" />
      └─ <codebase_search query="payment processing error handling" />
      └─ <read_file path="payment-service.js" />
      └─ Found: Race condition in async payment validation
      └─ <complete_subtask result="Race condition identified in line 45" />

2. Create fix subtask
   └─ <start_subtask description="Fix race condition in payment validation" />
      └─ <replace_string_in_file> with proper async handling
      └─ <complete_subtask result="Race condition fixed using Promise.all" />

3. Create verification subtask
   └─ <start_subtask description="Verify fix works in all scenarios" />
      └─ Test edge cases
      └─ <complete_subtask result="Fix verified, no regressions" />
```

## 📊 Task Stack Visualization

The UI shows your current task hierarchy:

```
Task Stack: Root Task (L0) › Research Phase (L1) › Find Examples (L2) ← You are here
            ✅            ⏸️                    🔵

✅ = Completed
⏸️ = Paused (waiting for subtask)
🔵 = Active (currently executing)
```

## 🎓 Learning Tips

1. **Start Simple**: Try one subtask, then build complexity
2. **Watch the UI**: Task stack navigator shows your progress
3. **Search Often**: Better to over-search than under-search
4. **Small Subtasks**: Better to have 3 small subtasks than 1 huge one
5. **Clear Results**: Make subtask completion results informative

## 📝 Cheat Sheet

| Goal | Tool | Example |
|------|------|---------|
| Break down work | `start_subtask` | "Implement user model" |
| Return to parent | `complete_subtask` | "User model complete" |
| Find similar code | `codebase_search` | "user model validation" |
| Understand pattern | `codebase_search` | "error handling strategy" |
| Discover APIs | `codebase_search` | "database query methods" |

## 🐛 Troubleshooting

### "Subtask orchestrator not initialized"
- TaskManager must be initialized first
- Check extension activation completed

### "No relevant code found"
- Try broader search terms
- Lower `min_similarity` to 0.5
- Check if code is indexed

### "Maximum depth exceeded"
- Complete inner subtasks before creating new ones
- Max depth is 3 levels (Root → L1 → L2)

### "Semantic search not initialized"
- Check backend connection is active
- Verify API endpoint is accessible

---

**Quick Start Complete!** Start using these tools to boost your productivity! 🚀
